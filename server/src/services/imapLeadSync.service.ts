import path from 'path';
import fs from 'fs';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import Tesseract from 'tesseract.js';
import { pool } from '@/config/db';
import { logger } from '@/utils/logger';
import { configService } from '@/services/configService';
import { extractTextFromBuffer, parseLeadDocumentText, ExtractedLeadData, recognizeImageWithAutoOrientation } from '@/utils/documentParser';

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
  private static persistentClient: ImapFlow | null = null;
  private static isProcessing = false;
  private static hasQueuedRun = false;
  private static reconnectTimeout: NodeJS.Timeout | null = null;
  private static livenessInterval: NodeJS.Timeout | null = null;

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

    const client = new ImapFlow({
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

    // Safely trap socket/connection error events so they never bubble up as unhandled EventEmitter errors
    client.on('error', (err: any) => {
      logger.warn(`[ImapFlow] Socket error event: ${err?.message || err}`);
    });

    return client;
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
      'digest@',
      'campaigns@',
      'support@github.com',
      'notification@',
      'openrouter.ai',
      'welcome@',
      'hello@',
      'alerts@',
      'billing@',
      'invoice@',
      'receipt@',
      'facebookmail.com',
      'linkedin.com',
      'instagram.com',
      'mail.instagram.com',
      'me-qr.com',
      'canva.com',
      'pinterest.com',
      'tiktok.com',
      'twitter.com',
      'x.com',
      'swiggy.in',
      'zomato.com',
      'uber.com',
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
      'paste this, get a response',
      'your daily digest',
      'weekly digest',
    ];

    if (ignoredSubjectPhrases.some((phrase) => lowerSub.includes(phrase))) {
      return true;
    }

    return false;
  }

  /**
   * Evaluates if a new incoming email should create a Lead in CRM.
   * Creates a lead automatically for any new email with a visiting card, image, PDF,
   * document, or text inquiry, without restrictive dependencies.
   */
  private static qualifyEmailForLeadCreation(params: {
    fromAddress: string;
    subject: string;
    textBody: string;
    savedAttachmentRecords: Array<{ filename: string; contentType: string }>;
    ocrExtractedTexts: string[];
    extractedLeadData: ExtractedLeadData;
  }): { shouldCreateLead: boolean; reason: string } {
    const { subject, textBody, savedAttachmentRecords } = params;
    const lowerSub = (subject || '').toLowerCase();

    // 1. Exclude automated receipts / invoices / shipment notifications
    const operationalKeywords = [
      'tax invoice', 'bill payment', 'payment receipt',
      'payment confirmation', 'payment successful',
      'account statement', 'payslip', 'salary credited', 'subscription renewal',
      'order shipped', 'out for delivery', 'order delivered',
      'meeting invitation', 'calendar invite',
    ];

    const isOperational = operationalKeywords.some((kw) => lowerSub.includes(kw));
    const hasAttachments = savedAttachmentRecords.length > 0;
    if (isOperational && !hasAttachments) {
      return { shouldCreateLead: false, reason: 'Operational/Transactional receipt or notice' };
    }

    // 2. Any new email with an attached file (Visiting card, image, PDF, doc, etc.) -> Create Lead!
    if (hasAttachments) {
      return { shouldCreateLead: true, reason: 'Attached file (visiting card, image, PDF, or document) received' };
    }

    // 3. Any new email with text body or subject -> Create Lead!
    if ((textBody && textBody.trim().length > 3) || (subject && subject.trim().length > 2)) {
      return { shouldCreateLead: true, reason: 'New text message inquiry received' };
    }

    return { shouldCreateLead: false, reason: 'Empty message' };
  }

  /**
   * Starts persistent IMAP connection with IDLE push listener.
   * Maintains a single persistent socket with Gmail, avoiding connection churn and rate limits.
   * When an email arrives, Gmail pushes an 'exists' notification in < 1 second.
   */
  public static async startPersistentSync(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const config = await this.getImapConfig();
    if (!config.enabled || !config.username || !config.password) {
      logger.info('[ImapSync] IMAP is not enabled or credentials not configured. Persistent IDLE worker waiting.');
      return;
    }

    if (this.persistentClient && this.persistentClient.usable && this.persistentClient.authenticated) {
      return;
    }

    try {
      if (this.persistentClient) {
        try { await this.persistentClient.logout(); } catch { }
        this.persistentClient = null;
      }

      logger.info(`[ImapSync] Initializing persistent IMAP connection for ${config.username}@${config.host}...`);
      const client = this.createClient(config);
      this.persistentClient = client;

      client.on('close', () => {
        logger.warn('[ImapSync] Persistent IMAP connection closed by server. Scheduling reconnect in 10s...');
        this.persistentClient = null;
        this.scheduleReconnect(10000);
      });

      client.on('error', (err: any) => {
        logger.warn(`[ImapSync] Persistent IMAP error: ${err?.message || err}`);
      });

      // Instant push notification from Gmail RFC 2177 IDLE
      client.on('exists', (data: any) => {
        logger.info(`[ImapSync] ⚡ Real-time EXISTS notification from Gmail (messages: ${data?.count ?? data})! Triggering instant lead processing...`);
        this.triggerPersistentSync().catch((err) => {
          logger.error(`[ImapSync] Error running real-time sync on exists: ${err.message}`);
        });
      });

      await client.connect();
      const mbox = await client.mailboxOpen('INBOX');
      const totalMessages = (mbox && typeof mbox === 'object') ? mbox.exists : 0;
      logger.info(`[ImapSync] ✅ Persistent IMAP connected! Auto-IDLE active on INBOX (existing messages: ${totalMessages}).`);

      // Immediately process any messages waiting since last watermark
      await this.triggerPersistentSync();

      // Gentle liveness interval every 60s
      if (!this.livenessInterval) {
        this.livenessInterval = setInterval(async () => {
          if (!this.persistentClient || !this.persistentClient.usable) {
            logger.info('[ImapSync] Persistent connection liveness check: Reconnecting...');
            this.startPersistentSync().catch((err) => {
              logger.warn(`[ImapSync] Liveness reconnect failed: ${err.message}`);
            });
          }
        }, 60 * 1000);
      }
    } catch (err: any) {
      logger.error(`[ImapSync] Persistent IMAP connection failed: ${err.message}`);
      this.persistentClient = null;
      this.scheduleReconnect(15000);
    }
  }

  /**
   * Schedules an automatic reconnection attempt after a delay
   */
  private static scheduleReconnect(delayMs = 10000): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.startPersistentSync().catch((err) => {
        logger.warn(`[ImapSync] Reconnect attempt failed: ${err.message}`);
      });
    }, delayMs);
  }

  /**
   * Triggers lead extraction and processing on the active persistent connection
   */
  private static async triggerPersistentSync(): Promise<ImapSyncResult> {
    if (!this.persistentClient || !this.persistentClient.usable) {
      return this.syncEmailsAndGenerateLeads();
    }

    if (this.isProcessing) {
      this.hasQueuedRun = true;
      logger.info('[ImapSync] Processing already active, queued next cycle');
      return { success: true, processedCount: 0, leadsCreatedCount: 0, message: 'Processing already active, next cycle queued' };
    }

    this.isProcessing = true;
    let totalProcessed = 0;
    let totalLeadsCreated = 0;

    try {
      const config = await this.getImapConfig();
      do {
        this.hasQueuedRun = false;
        const res = await this.processMailboxMessages(this.persistentClient, config.autoCreateLead);
        totalProcessed += res.processedCount;
        totalLeadsCreated += res.leadsCreatedCount;
      } while (this.hasQueuedRun);

      return {
        success: true,
        processedCount: totalProcessed,
        leadsCreatedCount: totalLeadsCreated,
        message: `Processed ${totalProcessed} email(s) and created ${totalLeadsCreated} lead(s).`,
      };
    } catch (err: any) {
      logger.error(`[ImapSync] Persistent sync error: ${err.message}`);
      return {
        success: false,
        processedCount: totalProcessed,
        leadsCreatedCount: totalLeadsCreated,
        error: err.message,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Core worker: Acquires mailbox lock, fetches new messages (UID > watermark),
   * runs OCR & extraction, creates leads, and advances watermark.
   */
  private static async processMailboxMessages(
    client: ImapFlow,
    autoCreateLead = true
  ): Promise<{ processedCount: number; leadsCreatedCount: number }> {
    let processedCount = 0;
    let leadsCreatedCount = 0;

    const lock = await client.getMailboxLock('INBOX');
    try {
      // 1. Read last_synced_uid watermark from core_config
      let configs: Record<string, any> = {};
      try {
        configs = await configService.getAllConfigs();
      } catch { }
      let lastUid = Number(configs['email.imap.account.last_uid'] || 0);

      // Initialize watermark to highest UID if not set, ignoring all historical backlog
      if (!lastUid || lastUid <= 0) {
        const allUids = await client.search({ all: true }).catch(() => []);
        if (Array.isArray(allUids) && allUids.length > 0) {
          lastUid = allUids[allUids.length - 1];
          await configService.saveConfigs({ 'email.imap.account.last_uid': String(lastUid) });
          logger.info(`[ImapSync] Watermark initialized to UID #${lastUid}. Historical emails ignored.`);
          return { processedCount: 0, leadsCreatedCount: 0 };
        }
      }

      // 2. Search STRICTLY for messages with UID > lastUid (strictly new emails only!)
      const searchRange = `${lastUid + 1}:*`;
      const searchRes = await client.search({ uid: searchRange }).catch(() => []);
      const rawUids = (Array.isArray(searchRes) ? searchRes : [])
        .filter((u: number) => u > lastUid)
        .sort((a: number, b: number) => a - b);

      if (!rawUids || rawUids.length === 0) {
        logger.info(`[ImapSync] No new emails received since UID #${lastUid}`);
        return { processedCount: 0, leadsCreatedCount: 0 };
      }

      logger.info(`[ImapSync] Found ${rawUids.length} brand-new email(s) since UID #${lastUid} to process`);

      let highestProcessedUid = lastUid;

      for (const uid of rawUids) {
        try {
          highestProcessedUid = Math.max(highestProcessedUid, uid);

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
          const leadCreated = await this.processParsedEmail(parsed, autoCreateLead);
          processedCount++;
          if (leadCreated) {
            leadsCreatedCount++;
          }

          // Mark message as seen/read on IMAP server
          await client.messageFlagsAdd(String(uid), ['\\Seen']);
        } catch (msgErr: any) {
          highestProcessedUid = Math.max(highestProcessedUid, uid);
          logger.error(`[ImapSync] Error processing message UID ${uid}: ${msgErr.message}`);
        }
      }

      // Advance watermark in core_config
      if (highestProcessedUid > lastUid) {
        await configService.saveConfigs({ 'email.imap.account.last_uid': String(highestProcessedUid) });
        logger.info(`[ImapSync] Updated watermark last_uid to #${highestProcessedUid}`);
      }
    } finally {
      lock.release();
    }

    return { processedCount, leadsCreatedCount };
  }

  /**
   * Connect to IMAP inbox, fetch unseen messages, run OCR on attachments, and create leads in CRM.
   * Uses active persistent connection if available, or starts one.
   */
  public static async syncEmailsAndGenerateLeads(customConfig?: Partial<ImapAccountConfig>): Promise<ImapSyncResult> {
    const dbConfig = await this.getImapConfig();
    const config: ImapAccountConfig = {
      ...dbConfig,
      ...(customConfig || {}),
    };

    if (customConfig?.password) {
      config.password = customConfig.password.replace(/\s+/g, '');
    }

    if (config.username && config.password) {
      config.enabled = true;
    }

    if (!config.enabled || !config.username || !config.password) {
      return {
        success: false,
        processedCount: 0,
        leadsCreatedCount: 0,
        message: 'IMAP sync is not enabled or credentials are not configured. Please enter email & App Password and click "Save Configuration".',
      };
    }

    // If custom credentials were provided in the sync request, persist them to core_config
    if (customConfig?.username && customConfig?.password) {
      try {
        await configService.saveConfigs({
          'email.imap.account.host': config.host,
          'email.imap.account.port': String(config.port),
          'email.imap.account.encryption': config.encryption,
          'email.imap.account.validate_cert': config.validateCert ? '1' : '0',
          'email.imap.account.username': config.username,
          'email.imap.account.password': config.password,
          'email.imap.account.enable': '1',
          'email.imap.lead.auto_create': config.autoCreateLead ? '1' : '0',
        });
        // Restart persistent connection with new credentials
        await this.startPersistentSync();
      } catch (saveErr: any) {
        logger.warn(`[ImapSync] Could not persist IMAP configs to database: ${saveErr.message}`);
      }
    }

    // If persistent connection is active and healthy, trigger sync on it directly
    if (this.persistentClient && this.persistentClient.usable && this.persistentClient.authenticated) {
      return this.triggerPersistentSync();
    }

    // Otherwise, start persistent sync and let it process
    await this.startPersistentSync();
    if (this.persistentClient && this.persistentClient.usable) {
      return this.triggerPersistentSync();
    }

    // Fallback transient sync if persistent failed
    if (this.isSyncing) {
      return { success: true, processedCount: 0, leadsCreatedCount: 0, message: 'Sync already in progress' };
    }
    this.isSyncing = true;
    const client = this.createClient(config);
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      const res = await this.processMailboxMessages(client, config.autoCreateLead);
      await client.logout();
      return {
        success: true,
        processedCount: res.processedCount,
        leadsCreatedCount: res.leadsCreatedCount,
        message: `Processed ${res.processedCount} email(s) and created ${res.leadsCreatedCount} lead(s).`,
      };
    } catch (err: any) {
      try { await client.logout(); } catch { }
      return { success: false, processedCount: 0, leadsCreatedCount: 0, error: err.message };
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
          logger.info(`[ImapSync] Running offline multi-angle OCR on image attachment: ${att.filename}`);
          try {
            const imgOcrText = await recognizeImageWithAutoOrientation(att.content, att.filename);
            if (imgOcrText && imgOcrText.trim().length > 10) {
              logger.info(`[ImapSync] Extracted ${imgOcrText.length} characters from image via multi-angle OCR`);
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
    const hasAttachments = savedAttachmentRecords.length > 0;
    let extractedLeadData: ExtractedLeadData;
    let combinedCorpus = '';

    if (hasAttachments && ocrExtractedTexts.length > 0) {
      // Prioritize the attached document/visiting card
      const attachmentCorpus = ocrExtractedTexts.join('\n\n');
      const docExtracted = parseLeadDocumentText(attachmentCorpus, subject);
      const bodyExtracted = textBody ? parseLeadDocumentText(textBody, subject) : {};

      extractedLeadData = {
        ...bodyExtracted,
        ...docExtracted,
        rawText: `${attachmentCorpus}\n\n${textBody}`,
      };

      if (!extractedLeadData.email && fromAddress) {
        extractedLeadData.email = fromAddress;
      }
      combinedCorpus = `${attachmentCorpus}\n\nSubject: ${subject}\nEmail Body:\n${textBody}`;
    } else {
      combinedCorpus = [
        `Subject: ${subject}`,
        `From: ${fromName} <${fromAddress}>`,
        textBody ? `Email Body:\n${textBody}` : '',
        ...ocrExtractedTexts,
      ].filter(Boolean).join('\n\n');

      extractedLeadData = parseLeadDocumentText(combinedCorpus, subject);
      if (!extractedLeadData.contactPerson && fromName) {
        extractedLeadData.contactPerson = fromName;
      }
      if (!extractedLeadData.email && fromAddress) {
        extractedLeadData.email = fromAddress;
      }
    }

    // Qualify whether this email represents an actual commercial Inquiry / Lead vs General Email
    const qualification = this.qualifyEmailForLeadCreation({
      fromAddress,
      subject,
      textBody,
      savedAttachmentRecords,
      ocrExtractedTexts,
      extractedLeadData,
    });

    let createdLeadId: number | null = null;
    let contactPersonId: number | null = null;

    if (autoCreateLead && qualification.shouldCreateLead) {
      logger.info(`[ImapSync] Qualified as Lead (${qualification.reason}): Creating CRM Lead from ${fromAddress}`);
      const leadResult = await this.createLeadFromEmailData({
        fromName,
        fromEmail: fromAddress,
        subject,
        textBody,
        combinedCorpus,
        hasAttachments: savedAttachmentRecords.length > 0,
        extractedData: extractedLeadData,
      });
      createdLeadId = leadResult.leadId;
      contactPersonId = leadResult.personId;
    } else {
      logger.info(`[ImapSync] Storing in Mailbox only (${qualification.reason}): No new lead created for ${fromAddress}`);
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

      // If no new lead was created, check if this contact already has an open lead to link this email thread to
      if (!createdLeadId && contactPersonId) {
        const existingLeadCheck = await client.query(
          `SELECT id FROM public.leads WHERE person_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [contactPersonId]
        );
        if (existingLeadCheck.rows.length > 0) {
          createdLeadId = existingLeadCheck.rows[0].id;
          logger.info(`[ImapSync] Linked inbound email from contact #${contactPersonId} to existing Lead #${createdLeadId}`);
        }
      }

      const emailInsertResult = await client.query(
        `INSERT INTO public.emails (
          name, subject, reply, "from", sender, from_email,
          reply_to, folders, is_read, lead_id, person_id, user_id, user_type,
          message_id, source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb,
          $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13,
          $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id`,
        [
          fromName,
          subject,
          htmlBody || textBody,
          JSON.stringify([fromAddress]),
          JSON.stringify({ name: fromName, email: fromAddress }),
          JSON.stringify({ name: fromName, email: fromAddress }),
          JSON.stringify([fromAddress]),
          JSON.stringify(['inbox']),
          false,
          createdLeadId || null,
          contactPersonId || null,
          1,
          'admin',
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
    extractedData?: ExtractedLeadData;
  }): Promise<{ leadId: number | null; personId: number | null; organizationId: number | null }> {
    const { fromName, fromEmail, subject, textBody, combinedCorpus, hasAttachments, extractedData } = params;

    // Use passed extracted data or run comprehensive document parser
    const extracted: ExtractedLeadData = extractedData || parseLeadDocumentText(combinedCorpus, subject);

    // Fallbacks: Only fallback contactPerson to fromName if there are NO attachments
    if (!extracted.email && fromEmail) extracted.email = fromEmail;
    if (!extracted.contactPerson && !hasAttachments && fromName) {
      extracted.contactPerson = fromName;
    }

    // Contact Persons list: only create contact person if valid contact extracted, or if direct text email
    const contactPersons = extracted.contactPersons && extracted.contactPersons.length > 0
      ? extracted.contactPersons
      : (extracted.contactPerson
          ? [{ name: extracted.contactPerson, phone: extracted.phone, email: extracted.email || fromEmail, title: extracted.jobTitle }]
          : (!hasAttachments && fromName
              ? [{ name: fromName, phone: extracted.phone, email: extracted.email || fromEmail, title: extracted.jobTitle }]
              : []));

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
          const orgAddress = extracted.address ? JSON.stringify({ address: extracted.address }) : null;
          const orgRes = await client.query(
            'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result',
            [extracted.organization.trim(), orgAddress, 1, '{}']
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
        const cpEmail = cp.email?.trim() || (i === 0 ? (extracted.email || fromEmail) : undefined);
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
      const leadTitle = extracted.title || (extracted.organization ? `Lead: ${extracted.organization}` : `Email Lead: ${subject.replace(/^(re:|fwd:)\s*/i, '').trim() || fromName}`);
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
      return { leadId, personId: primaryPersonId, organizationId };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error(`[ImapSync] Failed to create lead from email data: ${err.message}`);
      return { leadId: null, personId: null, organizationId: null };
    } finally {
      client.release();
    }
  }
}
