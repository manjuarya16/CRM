import path from 'path';
import fs from 'fs';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import Tesseract from 'tesseract.js';
import { pool } from '@/config/db';
import { logger } from '@/utils/logger';
import { configService } from '@/services/configService';
import { extractTextFromBuffer, parseLeadDocumentText, ExtractedLeadData } from '@/utils/documentParser';

export interface ImapAccountConfig {
  enabled: boolean;
  autoCreateLead: boolean;
  host: string;
  port: number;
  encryption: 'ssl' | 'tls' | 'none';
  validateCert: boolean;
  username: string;
  password: string;
}

export interface ImapSyncResult {
  success: boolean;
  processedCount: number;
  leadsCreatedCount: number;
  message?: string;
  error?: string;
}

export class ImapLeadSyncService {
  private static isSyncing = false;

  /**
   * Loads IMAP account settings from core_config table
   */
  public static async getImapConfig(): Promise<ImapAccountConfig> {
    let configs: Record<string, any> = {};
    try {
      configs = await configService.getAllConfigs();
    } catch {
      logger.warn('[ImapSync] Could not read configs from database');
    }

    const host = (configs['email.imap.account.host'] || process.env.IMAP_HOST || 'imap.gmail.com').trim();
    const port = Number(configs['email.imap.account.port'] || process.env.IMAP_PORT || 993);
    const encryption = (configs['email.imap.account.encryption'] || process.env.IMAP_ENCRYPTION || 'ssl').toLowerCase() as 'ssl' | 'tls' | 'none';
    const validateCert = configs['email.imap.account.validate_cert'] !== '0' && configs['email.imap.account.validate_cert'] !== 'false';
    const username = (configs['email.imap.account.username'] || process.env.IMAP_USER || '').trim();
    const rawPassword = (configs['email.imap.account.password'] || process.env.IMAP_PASS || '').trim();
    // Strip spaces in case of Gmail App Passwords (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    const password = rawPassword.replace(/\s+/g, '');

    const enableVal = configs['email.imap.account.enable'];
    const enabled = enableVal !== undefined ? (enableVal === '1' || enableVal === 'true') : Boolean(username && password);

    const autoCreateVal = configs['email.imap.lead.auto_create'];
    const autoCreateLead = autoCreateVal !== undefined ? (autoCreateVal === '1' || autoCreateVal === 'true') : true;

    return {
      enabled,
      autoCreateLead,
      host,
      port,
      encryption,
      validateCert,
      username,
      password,
    };
  }

  /**
   * Creates an ImapFlow instance from configuration
   */
  private static createClient(config: ImapAccountConfig): ImapFlow {
    const isSecure = config.encryption === 'ssl' || config.port === 465 || config.port === 993;

    return new ImapFlow({
      host: config.host,
      port: config.port,
      secure: isSecure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: config.validateCert,
      },
      logger: false,
    });
  }

  /**
   * Test IMAP connection and credentials
   */
  public static async testConnection(customConfig?: Partial<ImapAccountConfig>): Promise<{ success: boolean; message: string }> {
    const dbConfig = await this.getImapConfig();
    const config: ImapAccountConfig = {
      ...dbConfig,
      ...(customConfig || {}),
    };

    if (customConfig?.password) {
      config.password = customConfig.password.replace(/\s+/g, '');
    }

    if (!config.username || !config.password) {
      return {
        success: false,
        message: 'IMAP username or password is required to test connection.',
      };
    }

    const client = this.createClient(config);

    try {
      await client.connect();
      const status = await client.status('INBOX', { unseen: true, messages: true });
      await client.logout();

      const messagesCount = (status && typeof status === 'object') ? (status.messages || 0) : 0;
      const unseenCount = (status && typeof status === 'object') ? (status.unseen || 0) : 0;

      return {
        success: true,
        message: `Successfully connected to ${config.host}! Inbox has ${messagesCount} messages (${unseenCount} unread).`,
      };
    } catch (err: any) {
      try {
        await client.logout();
      } catch { }
      logger.error(`[ImapSync] Connection test failed: ${err.message}`);
      return {
        success: false,
        message: `Connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Identifies automated system emails, newsletters, or security notifications
   */
  private static isAutomatedOrSystemEmail(fromAddress: string, subject: string): boolean {
    const lowerFrom = (fromAddress || '').toLowerCase();
    const lowerSub = (subject || '').toLowerCase();

    const ignoredSenders = [
      'no-reply@',
      'noreply@',
      'mailer-daemon@',
      'postmaster@',
      'notifications@google.com',
      'googlecommunityteam-noreply@google.com',
      'security-noreply@',
      'accounts.google.com',
      'donotreply@',
      'promotions@',
      'newsletter@',
      'newsletters@',
      'marketing@',
      'updates@',
      'support@github.com',
      'notification@',
      'facebookmail.com',
      'linkedin.com',
    ];

    if (ignoredSenders.some((ign) => lowerFrom.includes(ign))) {
      return true;
    }

    const ignoredSubjectPhrases = [
      'security alert',
      'critical security alert',
      'new sign-in',
      'verify your email',
      'one-time password',
      'otp',
      'password reset',
      'two-step verification',
      'sign-in attempt',
    ];

    if (ignoredSubjectPhrases.some((phrase) => lowerSub.includes(phrase))) {
      return true;
    }

    return false;
  }

  /**
   * Connect to IMAP inbox, fetch unseen messages, run OCR on attachments, and create leads in CRM
   */
  public static async syncEmailsAndGenerateLeads(): Promise<ImapSyncResult> {
    if (this.isSyncing) {
      return { success: true, processedCount: 0, leadsCreatedCount: 0, message: 'Sync already in progress' };
    }

    const config = await this.getImapConfig();

    if (!config.enabled || !config.username || !config.password) {
      return { success: false, processedCount: 0, leadsCreatedCount: 0, message: 'IMAP sync is not enabled or credentials are not configured.' };
    }

    this.isSyncing = true;
    const client = this.createClient(config);

    let processedCount = 0;
    let leadsCreatedCount = 0;

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        // Search unread / unseen messages in INBOX from the last 3 days to avoid mass backlog ingestion
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        let rawUids: number[] = [];
        try {
          const res = await client.search({ seen: false, since: threeDaysAgo });
          if (Array.isArray(res)) rawUids = res;
        } catch {
          const fallbackRes = await client.search({ seen: false });
          if (Array.isArray(fallbackRes)) rawUids = fallbackRes;
        }

        if (!rawUids || rawUids.length === 0) {
          logger.info('[ImapSync] No unread messages in INBOX');
          return { success: true, processedCount: 0, leadsCreatedCount: 0, message: 'Inbox is up to date. No new unread emails.' };
        }

        // Cap to latest 10 unread emails per sync pass (highest UIDs are newest)
        const messageUids = rawUids.slice(-10);
        logger.info(`[ImapSync] Found ${rawUids.length} unread message(s). Processing latest ${messageUids.length} in this pass.`);

        for (const uid of messageUids) {
          try {
            // Fetch complete raw email RFC822 message buffer
            const rawMessage = await client.download(String(uid));
            if (!rawMessage || !rawMessage.content) {
              continue;
            }

            // Read download stream into Buffer
            const chunks: Buffer[] = [];
            for await (const chunk of rawMessage.content) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const emailBuffer = Buffer.concat(chunks);

            // Parse MIME message
            const parsed = await simpleParser(emailBuffer);

            // Filter automated notification or security emails
            const fromAddr = parsed.from?.value?.[0]?.address || '';
            const subj = parsed.subject || '';
            if (this.isAutomatedOrSystemEmail(fromAddr, subj)) {
              logger.info(`[ImapSync] Skipping automated/notification email from ${fromAddr}: "${subj}"`);
              await client.messageFlagsAdd(String(uid), ['\\Seen']);
              processedCount++;
              continue;
            }

            // Process email & attachments with OCR
            const leadCreated = await this.processParsedEmail(parsed, config.autoCreateLead);
            processedCount++;
            if (leadCreated) {
              leadsCreatedCount++;
            }

            // Mark message as seen/read on IMAP server
            await client.messageFlagsAdd(String(uid), ['\\Seen']);
          } catch (msgErr: any) {
            logger.error(`[ImapSync] Error processing message UID ${uid}: ${msgErr.message}`);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
      return {
        success: true,
        processedCount,
        leadsCreatedCount,
        message: `Processed ${processedCount} email(s) and created ${leadsCreatedCount} lead(s).`,
      };
    } catch (err: any) {
      try {
        await client.logout();
      } catch { }
      logger.error(`[ImapSync] Sync error: ${err.message}`);
      return {
        success: false,
        processedCount,
        leadsCreatedCount,
        error: err.message,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single parsed email: run OCR on attachments, extract leads, and save to database
   */
  private static async processParsedEmail(parsed: ParsedMail, autoCreateLead: boolean): Promise<boolean> {
    const fromAddress = parsed.from?.value?.[0]?.address || '';
    const fromName = parsed.from?.value?.[0]?.name || fromAddress.split('@')[0] || 'Email Contact';
    const subject = parsed.subject || '(No Subject)';
    const textBody = parsed.text || '';
    const htmlBody = parsed.html || parsed.textAsHtml || textBody;
    const messageId = parsed.messageId || `<email-${Date.now()}@crm.local>`;

    logger.info(`[ImapSync] Ingesting email from: ${fromAddress} | Subject: "${subject}" | Attachments: ${parsed.attachments.length}`);

    // Check if email already recorded in public.emails
    const existingEmailCheck = await pool.query(
      'SELECT id FROM public.emails WHERE message_id = $1 LIMIT 1',
      [messageId]
    );
    if (existingEmailCheck.rows.length > 0) {
      logger.info(`[ImapSync] Email with message_id ${messageId} already exists in CRM, skipping`);
      return false;
    }

    // 1. Process attachments and perform OCR
    const savedAttachmentRecords: Array<{ filename: string; path: string; size: number; contentType: string }> = [];
    const ocrExtractedTexts: string[] = [];

    // Ensure upload directory exists
    const uploadsDir = path.resolve(process.cwd(), 'public/uploads/mail');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const att of parsed.attachments) {
      const safeFilename = `${Date.now()}_${(att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeFilename);

      try {
        fs.writeFileSync(filePath, att.content);
        savedAttachmentRecords.push({
          filename: att.filename || safeFilename,
          path: `/uploads/mail/${safeFilename}`,
          size: att.size || att.content.length,
          contentType: att.contentType || 'application/octet-stream',
        });

        // OCR on Images (Visiting card, business card, photo)
        const mimeLower = (att.contentType || '').toLowerCase();
        const ext = path.extname(att.filename || '').toLowerCase();
        const isImage = mimeLower.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext);
        const isPdfOrText = mimeLower === 'application/pdf' || ['.pdf', '.txt', '.csv'].includes(ext);

        if (isImage) {
          logger.info(`[ImapSync] Running offline Tesseract OCR on image attachment: ${att.filename}`);
          try {
            const { data: { text: imgOcrText } } = await Tesseract.recognize(att.content, 'eng');
            if (imgOcrText && imgOcrText.trim().length > 10) {
              logger.info(`[ImapSync] Extracted ${imgOcrText.length} characters from image via OCR`);
              ocrExtractedTexts.push(`--- ATTACHMENT OCR (${att.filename}) ---\n${imgOcrText.trim()}`);
            }
          } catch (tessErr: any) {
            logger.warn(`[ImapSync] OCR failed on ${att.filename}: ${tessErr.message}`);
          }
        } else if (isPdfOrText) {
          logger.info(`[ImapSync] Extracting text from document attachment: ${att.filename}`);
          try {
            const docText = extractTextFromBuffer(att.content, att.filename || 'document.pdf');
            if (docText && docText.trim().length > 10) {
              ocrExtractedTexts.push(`--- ATTACHMENT DOC (${att.filename}) ---\n${docText.trim()}`);
            }
          } catch (docErr: any) {
            logger.warn(`[ImapSync] Doc parsing failed on ${att.filename}: ${docErr.message}`);
          }
        }
      } catch (writeErr: any) {
        logger.error(`[ImapSync] Failed to save attachment ${att.filename}: ${writeErr.message}`);
      }
    }

    // 2. Synthesize all extracted content for Lead Generation
    const combinedCorpus = [
      `Subject: ${subject}`,
      `From: ${fromName} <${fromAddress}>`,
      textBody ? `Email Body:\n${textBody}` : '',
      ...ocrExtractedTexts,
    ].filter(Boolean).join('\n\n');

    let createdLeadId: number | null = null;
    let contactPersonId: number | null = null;

    if (autoCreateLead) {
      createdLeadId = await this.createLeadFromEmailData({
        fromName,
        fromEmail: fromAddress,
        subject,
        textBody,
        combinedCorpus,
        hasAttachments: savedAttachmentRecords.length > 0,
      });
    }

    // 3. Save Email Record in public.emails
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve person ID if linked
      if (!contactPersonId && fromAddress) {
        const pSearch = await client.query(
          'SELECT id FROM public.persons WHERE emails::text ILIKE $1 LIMIT 1',
          [`%${fromAddress}%`]
        );
        if (pSearch.rows.length > 0) {
          contactPersonId = pSearch.rows[0].id;
        }
      }

      const emailInsertResult = await client.query(
        `INSERT INTO public.emails (
          name, subject, reply, "from", sender, from_email,
          reply_to, folders, is_read, lead_id, person_id, user_id,
          message_id, source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4::jsonb, $5::jsonb, $6,
          $7::jsonb, $8::jsonb, $9, $10, $11, $12,
          $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id`,
        [
          fromName,
          subject,
          htmlBody || textBody,
          JSON.stringify([fromAddress]),
          JSON.stringify({ name: fromName, email: fromAddress }),
          fromAddress,
          JSON.stringify([fromAddress]),
          JSON.stringify(['inbox']),
          false,
          createdLeadId || null,
          contactPersonId || null,
          1,
          messageId,
          'imap',
        ]
      );

      const emailId = emailInsertResult.rows[0]?.id;

      // Attach file records to email_attachments
      if (emailId && savedAttachmentRecords.length > 0) {
        for (const attRec of savedAttachmentRecords) {
          await client.query(
            `INSERT INTO public.email_attachments (name, path, size, content_type, email_id, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [attRec.filename, attRec.path, attRec.size, attRec.contentType, emailId]
          );
        }
      }

      // Log activity on lead if lead was created
      if (createdLeadId) {
        await client.query(
          `SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            `Inbound Email: ${subject}`,
            'email',
            `Received email from ${fromName} (${fromAddress}):\n\n${textBody.slice(0, 500)}`,
            null,
            null,
            true,
            1,
            null,
            createdLeadId,
            contactPersonId || null,
          ]
        );
      }

      await client.query('COMMIT');
      logger.info(`[ImapSync] Successfully saved email #${emailId} ${createdLeadId ? `linked to Lead #${createdLeadId}` : ''}`);
      return Boolean(createdLeadId);
    } catch (saveErr: any) {
      await client.query('ROLLBACK');
      logger.error(`[ImapSync] Error saving email record to DB: ${saveErr.message}`);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Parses structured CRM entities from email & attachments and creates the Lead in PostgreSQL
   */
  private static async createLeadFromEmailData(params: {
    fromName: string;
    fromEmail: string;
    subject: string;
    textBody: string;
    combinedCorpus: string;
    hasAttachments: boolean;
  }): Promise<number | null> {
    const { fromName, fromEmail, subject, textBody, combinedCorpus } = params;

    // Run our comprehensive document parser on all extracted text (OCR + Body)
    const extracted: ExtractedLeadData = parseLeadDocumentText(combinedCorpus, subject);

    // Fallbacks
    if (!extracted.email && fromEmail) extracted.email = fromEmail;
    if (!extracted.contactPerson && fromName) extracted.contactPerson = fromName;

    // Contact Persons list
    const contactPersons = extracted.contactPersons && extracted.contactPersons.length > 0
      ? extracted.contactPersons
      : [{ name: extracted.contactPerson || fromName, phone: extracted.phone, email: extracted.email || fromEmail, title: extracted.jobTitle }];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Resolve or Create Organization
      let organizationId: number | null = null;
      if (extracted.organization) {
        const orgSearch = await client.query(
          'SELECT id FROM public.organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
          [extracted.organization.trim()]
        );
        if (orgSearch.rows.length > 0) {
          organizationId = orgSearch.rows[0].id;
        } else {
          const orgRes = await client.query(
            'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result',
            [extracted.organization.trim(), null, 1, '{}']
          );
          organizationId = orgRes.rows[0]?.result?.id || null;
        }
      }

      // 2. Resolve or Create Contact Person(s)
      let primaryPersonId: number | null = null;
      const allSavedPersons: Array<{ id: number; name: string; phone?: string; email?: string; title?: string }> = [];

      for (let i = 0; i < contactPersons.length; i++) {
        const cp = contactPersons[i];
        const cpName = cp.name.trim();
        const cpEmail = cp.email?.trim() || (i === 0 ? fromEmail : undefined);
        const cpPhone = cp.phone?.trim();
        const cpTitle = cp.title || (i === 0 ? extracted.jobTitle : undefined);

        let curPersonId: number | null = null;

        // Check by email
        if (cpEmail) {
          const emailCheck = await client.query(
            'SELECT id, name FROM public.persons WHERE emails::text ILIKE $1 LIMIT 1',
            [`%${cpEmail}%`]
          );
          if (emailCheck.rows.length > 0) {
            curPersonId = emailCheck.rows[0].id;
          }
        }

        // Check by phone
        if (!curPersonId && cpPhone) {
          const cleanedPhone = cpPhone.replace(/[^0-9+]/g, '');
          const pattern = cleanedPhone.length >= 6 ? `%${cleanedPhone.slice(-8)}%` : `%${cpPhone}%`;
          const phoneCheck = await client.query(
            'SELECT id, name FROM public.persons WHERE contact_numbers::text ILIKE $1 LIMIT 1',
            [pattern]
          );
          if (phoneCheck.rows.length > 0) {
            curPersonId = phoneCheck.rows[0].id;
          }
        }

        // Check by name in organization
        if (!curPersonId && cpName && organizationId) {
          const nameCheck = await client.query(
            'SELECT id FROM public.persons WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1',
            [organizationId, cpName]
          );
          if (nameCheck.rows.length > 0) {
            curPersonId = nameCheck.rows[0].id;
          }
        }

        // Create if missing
        if (!curPersonId) {
          const emailList = cpEmail ? [{ label: 'work', value: cpEmail }] : [];
          const phoneList = cpPhone ? [{ label: 'mobile', value: cpPhone }] : [];

          if (i === 0 && Array.isArray(extracted.phones) && extracted.phones.length > 1) {
            extracted.phones.forEach((p) => {
              if (!phoneList.some((pl) => pl.value === p)) {
                phoneList.push({ label: 'work', value: p });
              }
            });
          }

          const savePersonRes = await client.query(
            'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb) as result',
            [
              cpName || fromName,
              JSON.stringify(emailList),
              JSON.stringify(phoneList),
              organizationId,
              cpTitle || null,
              1,
              '{}',
            ]
          );
          curPersonId = savePersonRes.rows[0]?.result?.id || null;
        } else if (curPersonId && organizationId) {
          await client.query(
            'UPDATE public.persons SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL',
            [organizationId, curPersonId]
          );
        }

        if (curPersonId) {
          allSavedPersons.push({ id: curPersonId, name: cpName, phone: cpPhone, email: cpEmail, title: cpTitle });
          if (i === 0) {
            primaryPersonId = curPersonId;
          }
        }
      }

      // 3. Resolve Pipeline and First Stage
      const pipeQuery = await client.query('SELECT * FROM public.fn_get_lead_pipelines()');
      const defaultPipeline = pipeQuery.rows.find((p: any) => p.is_default) || pipeQuery.rows[0];
      const pipelineId = defaultPipeline?.id || 1;

      const stageQuery = await client.query('SELECT * FROM public.fn_get_pipeline_stages($1)', [pipelineId]);
      const stageId = stageQuery.rows[0]?.id || null;

      // 4. Source = 1 (Email)
      const leadSourceId = 1;

      // 5. Create Lead via fn_create_lead
      const leadTitle = extracted.title || `Email Lead: ${subject.replace(/^(re:|fwd:)\s*/i, '').trim() || fromName}`;
      const leadDesc = extracted.description || `Inbound email inquiry from ${fromName} (${fromEmail}):\n${textBody.slice(0, 1000)}`;

      const leadRes = await client.query(
        'SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          leadTitle,
          leadDesc,
          extracted.leadValue || null,
          1,
          primaryPersonId,
          leadSourceId,
          null,
          pipelineId,
          extracted.expectedCloseDate || null,
          organizationId,
        ]
      );

      const createdLead = leadRes.rows[0];
      if (!createdLead || !createdLead.id) {
        throw new Error('Failed to create lead via fn_create_lead');
      }

      const leadId = createdLead.id;

      // Update stage if present
      if (stageId) {
        await client.query('SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)', [leadId, stageId]);
      }

      // Store additional contacts in custom_attributes if multiple
      if (allSavedPersons.length > 1) {
        await client.query(
          "UPDATE public.leads SET custom_attributes = COALESCE(custom_attributes, '{}'::jsonb) || $1::jsonb WHERE id = $2",
          [JSON.stringify({ additional_contacts: allSavedPersons }), leadId]
        );
      }

      // 6. Attach Products if any extracted
      if (Array.isArray(extracted.products) && extracted.products.length > 0) {
        for (const prod of extracted.products) {
          if (!prod.name) continue;

          let prodId: number | null = null;
          const prodCheck = await client.query(
            'SELECT id FROM public.products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
            [prod.name.trim()]
          );

          if (prodCheck.rows.length > 0) {
            prodId = prodCheck.rows[0].id;
          } else {
            const sku = prod.sku || `PROD-${Date.now().toString().slice(-5)}`;
            const newProdRes = await client.query(
              'SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)',
              [sku, prod.name.trim(), prod.description || prod.name, prod.quantity || 1, prod.price || 0]
            );
            prodId = newProdRes.rows[0]?.id || null;
          }

          if (prodId) {
            await client.query(
              'SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6)',
              [leadId, prodId, prod.quantity || 1, prod.price || 0, null, null]
            );
          }
        }
      }

      await client.query('COMMIT');
      logger.info(`[ImapSync] Successfully created Lead #${leadId} ("${leadTitle}") from email`);
      return leadId;
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error(`[ImapSync] Failed to create lead from email data: ${err.message}`);
      return null;
    } finally {
      client.release();
    }
  }
}
