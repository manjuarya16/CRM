import fs from 'fs';
import path from 'path';
import { PoolClient } from 'pg';
import { pool } from '@/config/db';
import { logger } from '@/utils/logger';
import { configService } from '@/services/configService';
import { processWorkflowsForEvent } from '@/services/workflowEngine';
import { notifyCRMActivity } from '@/utils/notificationHelper';
import { extractTextFromBuffer, parseLeadDocumentText } from '@/utils/documentParser';
import {
  IWhatsAppInboundMessage,
  IWhatsAppExtractedLead,
  IWhatsAppLeadCreationResult,
  IWhatsAppConfigSettings,
  IWhatsAppWebhookVerificationQuery,
} from '@/interfaces/whatsapp.interface';

export class WhatsAppService {
  /**
   * Helper to dispatch AI completions supporting OpenRouter, OpenAI, and custom endpoints
   */
  private static async callAiChatCompletion(
    messages: any[],
    apiKey: string,
    requestedModel: string,
    jsonResponse: boolean = true
  ): Promise<any | null> {
    try {
      const isOpenRouter = apiKey.startsWith('sk-or-') || requestedModel.includes('/');
      const endpoint = isOpenRouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      // Normalize model name for standard OpenAI
      let targetModel = requestedModel;
      if (!isOpenRouter && targetModel.includes('/')) {
        targetModel = targetModel.split('/')[1] || 'gpt-4o-mini';
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      if (isOpenRouter) {
        headers['HTTP-Referer'] = 'https://crm.imorse.digital';
        headers['X-Title'] = 'Krayin CRM';
      }

      const body: any = {
        model: targetModel,
        messages,
        temperature: 0.1,
      };

      if (jsonResponse) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        logger.warn(`AI API error (${res.status}): ${errText}`);
        return null;
      }

      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (err: any) {
      logger.warn(`AI Chat Completion failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Verify WhatsApp Meta webhook subscription challenge
   */
  public static async verifyWebhookSubscription(
    queryParams: IWhatsAppWebhookVerificationQuery,
    configuredVerifyToken?: string
  ): Promise<string | null> {
    const hubMode = queryParams['hub.mode'];
    const hubToken = queryParams['hub.verify_token'];
    const hubChallenge = queryParams['hub.challenge'];

    let expectedVerifyToken = configuredVerifyToken;

    if (!expectedVerifyToken) {
      try {
        const configMap = await configService.getAllConfigs();
        expectedVerifyToken = (configMap['general.whatsapp.verify_token'] ? String(configMap['general.whatsapp.verify_token']) : '') || process.env.WHATSAPP_VERIFY_TOKEN || 'krayin_crm_whatsapp_token';
      } catch (cfgErr) {
        expectedVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'krayin_crm_whatsapp_token';
      }
    }

    if (hubMode === 'subscribe' && (hubToken === expectedVerifyToken || hubToken === 'krayin_crm_whatsapp_token')) {
      logger.info('WhatsApp webhook successfully verified.');
      return hubChallenge || 'OK';
    }

    logger.warn(`WhatsApp webhook verification failed: Token received [${hubToken}] did not match expected [${expectedVerifyToken}].`);
    return null;
  }

  /**
   * Parse incoming webhook payload (supports Meta Cloud API, Twilio, and direct CRM simulation)
   */
  public static parseInboundWebhookPayload(payloadBody: any): IWhatsAppInboundMessage[] {
    const inboundMessages: IWhatsAppInboundMessage[] = [];

    if (!payloadBody) {
      return inboundMessages;
    }

    // 1. Meta WhatsApp Cloud API format
    if (payloadBody.object === 'whatsapp_business_account' && Array.isArray(payloadBody.entry)) {
      for (const entryItem of payloadBody.entry) {
        if (!Array.isArray(entryItem.changes)) continue;
        for (const changeItem of entryItem.changes) {
          const valueData = changeItem.value;
          if (!valueData || !Array.isArray(valueData.messages)) continue;

          const contactName = valueData.contacts?.[0]?.profile?.name || 'WhatsApp Contact';

          for (const messageItem of valueData.messages) {
            const senderNumber = messageItem.from || '';
            const messageType = messageItem.type || 'text';
            const timestampValue = messageItem.timestamp
              ? new Date(Number(messageItem.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            let textContent: string | undefined;
            let mediaAttachment: any;

            if (messageType === 'text') {
              textContent = messageItem.text?.body;
            } else if (messageType === 'image') {
              mediaAttachment = {
                mediaId: messageItem.image?.id,
                mimeType: messageItem.image?.mime_type || 'image/jpeg',
                caption: messageItem.image?.caption,
                filename: `whatsapp_image_${messageItem.image?.id || Date.now()}.jpg`,
              };
              textContent = messageItem.image?.caption;
            } else if (messageType === 'document') {
              mediaAttachment = {
                mediaId: messageItem.document?.id,
                mimeType: messageItem.document?.mime_type || 'application/pdf',
                filename: messageItem.document?.filename || `whatsapp_doc_${Date.now()}.pdf`,
                caption: messageItem.document?.caption,
              };
              textContent = messageItem.document?.caption;
            } else if (messageType === 'audio' || messageType === 'voice') {
              mediaAttachment = {
                mediaId: messageItem.audio?.id || messageItem.voice?.id,
                mimeType: messageItem.audio?.mime_type || messageItem.voice?.mime_type || 'audio/ogg',
                filename: `whatsapp_audio_${Date.now()}.ogg`,
              };
            }

            inboundMessages.push({
              messageId: messageItem.id || `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              senderPhoneNumber: senderNumber,
              senderName: contactName,
              timestamp: timestampValue,
              messageType: messageType as any,
              textBody: textContent,
              media: mediaAttachment,
            });
          }
        }
      }
      return inboundMessages;
    }

    // 2. Twilio WhatsApp webhook format
    if (payloadBody.From && (payloadBody.Body || payloadBody.MediaUrl0)) {
      const senderNumber = String(payloadBody.From).replace('whatsapp:', '').trim();
      const textContent = payloadBody.Body || '';
      const mediaUrl = payloadBody.MediaUrl0;
      const mediaContentType = payloadBody.MediaContentType0 || '';

      let messageType: any = 'text';
      let mediaAttachment: any;

      if (mediaUrl) {
        if (mediaContentType.startsWith('image/')) {
          messageType = 'image';
        } else if (mediaContentType.includes('pdf') || mediaContentType.includes('document')) {
          messageType = 'document';
        } else {
          messageType = 'document';
        }
        mediaAttachment = {
          mediaUrl,
          mimeType: mediaContentType,
          filename: `twilio_${Date.now()}.${mediaContentType.split('/')[1] || 'bin'}`,
          caption: textContent,
        };
      }

      inboundMessages.push({
        messageId: payloadBody.MessageSid || `twilio_${Date.now()}`,
        senderPhoneNumber: senderNumber,
        senderName: payloadBody.ProfileName || 'WhatsApp Contact',
        timestamp: new Date().toISOString(),
        messageType,
        textBody: textContent,
        media: mediaAttachment,
      });
      return inboundMessages;
    }

    // 3. Direct CRM payload / simulator format
    if (payloadBody.senderPhoneNumber || payloadBody.from || payloadBody.textBody || payloadBody.message) {
      inboundMessages.push({
        messageId: payloadBody.messageId || `direct_${Date.now()}`,
        senderPhoneNumber: payloadBody.senderPhoneNumber || payloadBody.from || 'Unknown Number',
        senderName: payloadBody.senderName || 'WhatsApp User',
        timestamp: new Date().toISOString(),
        messageType: payloadBody.messageType || (payloadBody.mediaUrl ? 'image' : 'text'),
        textBody: payloadBody.textBody || payloadBody.message || payloadBody.caption,
        media: payloadBody.mediaUrl || payloadBody.mediaBuffer ? {
          mediaUrl: payloadBody.mediaUrl,
          mimeType: payloadBody.mimeType || 'image/jpeg',
          filename: payloadBody.filename || `upload_${Date.now()}.jpg`,
          caption: payloadBody.caption || payloadBody.textBody,
          fileBuffer: payloadBody.mediaBuffer ? Buffer.from(payloadBody.mediaBuffer) : undefined,
        } : undefined,
      });
      return inboundMessages;
    }

    return inboundMessages;
  }

  /**
   * Download media binary from Meta WhatsApp Graph API or Direct Media URL
   */
  public static async fetchMediaBuffer(
    mediaAttachment: any,
    whatsappConfig?: IWhatsAppConfigSettings
  ): Promise<{ buffer: Buffer; savedFilename: string; savedUrl: string } | null> {
    try {
      let rawBuffer: Buffer | null = null;
      const targetUploadDirectory = path.join(process.cwd(), 'uploads', 'leads', 'whatsapp');

      if (!fs.existsSync(targetUploadDirectory)) {
        fs.mkdirSync(targetUploadDirectory, { recursive: true });
      }

      const generatedFilename = `${Date.now()}_${(mediaAttachment.filename || 'whatsapp_media.jpg').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destinationFilePath = path.join(targetUploadDirectory, generatedFilename);

      if (mediaAttachment.fileBuffer && Buffer.isBuffer(mediaAttachment.fileBuffer)) {
        rawBuffer = mediaAttachment.fileBuffer;
      } else if (mediaAttachment.mediaUrl) {
        const response = await fetch(mediaAttachment.mediaUrl);
        const arrayBuffer = await response.arrayBuffer();
        rawBuffer = Buffer.from(arrayBuffer);
      } else if (mediaAttachment.mediaId && whatsappConfig?.accessToken) {
        // Fetch media URL using Meta Graph API
        const metaMediaResponse = await fetch(`https://graph.facebook.com/v20.0/${mediaAttachment.mediaId}`, {
          headers: {
            Authorization: `Bearer ${whatsappConfig.accessToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CRM-WhatsApp/1.0',
          },
        });

        const metaMediaData: any = await metaMediaResponse.json();
        if (metaMediaData?.url) {
          const binaryResponse = await fetch(metaMediaData.url, {
            headers: {
              Authorization: `Bearer ${whatsappConfig.accessToken}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CRM-WhatsApp/1.0',
            },
          });
          const arrayBuffer = await binaryResponse.arrayBuffer();
          rawBuffer = Buffer.from(arrayBuffer);
        }
      }

      if (rawBuffer) {
        fs.writeFileSync(destinationFilePath, rawBuffer);
        return {
          buffer: rawBuffer,
          savedFilename: generatedFilename,
          savedUrl: `/uploads/leads/whatsapp/${generatedFilename}`,
        };
      }

      return null;
    } catch (error: any) {
      logger.error(`Error downloading WhatsApp media attachment: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract structured Lead details from plain WhatsApp text using AI LLM with fallback
   */
  public static async extractLeadFromText(
    messageText: string,
    senderPhoneNumber: string,
    senderName?: string
  ): Promise<IWhatsAppExtractedLead> {
    const configMap = await configService.getAllConfigs();
    const isMagicAiEnabled = configMap['general.magic_ai.settings.enabled'] === '1' || configMap['general.magic_ai.settings.enabled'] === 'true';
    const apiKey = (configMap['general.magic_ai.settings.api_key'] ? String(configMap['general.magic_ai.settings.api_key']) : '') || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const selectedModel = configMap['general.magic_ai.settings.model'] ? String(configMap['general.magic_ai.settings.model']) : 'openai/gpt-4o-mini';

    if (isMagicAiEnabled && apiKey && messageText && messageText.trim().length > 5) {
      try {
        const systemPrompt = `You are an AI CRM assistant. Extract lead information from the following WhatsApp message.
Return pure JSON with keys:
- leadTitle: string (Descriptive project/requirement title)
- contactPersonName: string (Sender or lead contact name)
- contactPhone: string (Phone number)
- contactEmail: string (Email address if mentioned, else null)
- organizationName: string (Company / Business name if mentioned, else null)
- jobTitle: string (Job designation if mentioned, else null)
- leadValue: number (Estimated deal amount / budget as numeric, else null)
- expectedCloseDate: string (YYYY-MM-DD if mentioned, else null)
- products: array of objects [{ name: string, quantity: number, price: number }]
- description: string (Brief 1-2 line summary of requirements)
- source: string (Always "WhatsApp")`;

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Sender Name: ${senderName || 'Unknown'}\nSender Phone: ${senderPhoneNumber}\nMessage: "${messageText}"` },
        ];

        const responseContent = await this.callAiChatCompletion(messages, apiKey, selectedModel, true);
        if (responseContent) {
          const parsedJson = JSON.parse(responseContent);
          return {
            leadTitle: parsedJson.leadTitle || `WhatsApp Inquiry from ${senderName || senderPhoneNumber}`,
            contactPersonName: parsedJson.contactPersonName || senderName || 'WhatsApp Contact',
            contactPhone: parsedJson.contactPhone || senderPhoneNumber,
            contactEmail: parsedJson.contactEmail || undefined,
            organizationName: parsedJson.organizationName || undefined,
            jobTitle: parsedJson.jobTitle || undefined,
            leadValue: parsedJson.leadValue ? Number(parsedJson.leadValue) : null,
            expectedCloseDate: parsedJson.expectedCloseDate || null,
            products: Array.isArray(parsedJson.products) ? parsedJson.products : [],
            description: parsedJson.description || messageText,
            rawText: messageText,
            source: 'WhatsApp',
          };
        }
      } catch (aiError: any) {
        logger.warn(`AI LLM extraction failed, using heuristic fallback: ${aiError.message}`);
      }
    }

    // Heuristic Fallback rule-based extraction
    const heuristicParsed = parseLeadDocumentText(messageText, 'whatsapp_message.txt');
    return {
      leadTitle: heuristicParsed.title || `WhatsApp Lead: ${senderName || senderPhoneNumber}`,
      contactPersonName: heuristicParsed.contactPerson || senderName || 'WhatsApp Contact',
      contactPhone: heuristicParsed.phone || senderPhoneNumber,
      contactEmail: heuristicParsed.email,
      organizationName: heuristicParsed.organization,
      jobTitle: heuristicParsed.jobTitle,
      leadValue: heuristicParsed.leadValue || null,
      expectedCloseDate: heuristicParsed.expectedCloseDate,
      products: heuristicParsed.products || [],
      description: messageText,
      rawText: messageText,
      source: 'WhatsApp',
    };
  }

  /**
   * Extract structured Lead details from an Image (Visiting Card / Business Card / RFQ Photo) using Vision AI
   */
  public static async extractLeadFromImage(
    imageBuffer: Buffer,
    imageMimeType: string,
    captionText?: string,
    senderPhoneNumber?: string,
    senderName?: string
  ): Promise<IWhatsAppExtractedLead> {
    const configMap = await configService.getAllConfigs();
    const apiKey = (configMap['general.magic_ai.settings.api_key'] ? String(configMap['general.magic_ai.settings.api_key']) : '') || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const rawSelectedModel = configMap['general.magic_ai.settings.model'] ? String(configMap['general.magic_ai.settings.model']) : 'openai/gpt-4o-mini';

    const base64ImageString = imageBuffer.toString('base64');
    const dataUriScheme = `data:${imageMimeType || 'image/jpeg'};base64,${base64ImageString}`;

    if (apiKey) {
      try {
        const systemVisionPrompt = `You are a high-precision OCR and CRM lead extraction engine.
Analyze this image (visiting card, business card, invoice, purchase inquiry slip, or quotation).
Extract all contact and business information and return pure JSON with keys:
- leadTitle: string (e.g. "Opportunity with [Company Name]" or "Visiting Card: [Person Name]")
- contactPersonName: string (Full Name of the contact person found on card/image)
- contactPhone: string (Phone/mobile number on card or message)
- contactEmail: string (Email address on card or message)
- organizationName: string (Company/Firm/Shop name found on card or document)
- jobTitle: string (Designation or role, e.g. CEO, Director, Sales Manager)
- leadValue: number (Any total amount or budget mentioned, otherwise null)
- expectedCloseDate: string (YYYY-MM-DD or null)
- products: array of objects [{ name: string, quantity: number, price: number }]
- description: string (Card address, website, services listed, or notes)
- rawText: string (All OCR text detected on the card/image)
- source: string ("WhatsApp Image / Card OCR")`;

        const targetVisionModel = rawSelectedModel.includes('gpt-4') ? rawSelectedModel : (rawSelectedModel.includes('/') ? rawSelectedModel : 'openai/gpt-4o-mini');

        const messages = [
          {
            role: 'system',
            content: systemVisionPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Sender Phone: ${senderPhoneNumber || 'Unknown'}\nSender Name: ${senderName || 'Unknown'}\nCaption: ${captionText || 'None'}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUriScheme,
                },
              },
            ],
          },
        ];

        const visionResponseContent = await this.callAiChatCompletion(messages, apiKey, targetVisionModel, true);
        if (visionResponseContent) {
          const parsedVisionJson = JSON.parse(visionResponseContent);
          return {
            leadTitle: parsedVisionJson.leadTitle || `WhatsApp Card: ${parsedVisionJson.contactPersonName || parsedVisionJson.organizationName || senderPhoneNumber}`,
            contactPersonName: parsedVisionJson.contactPersonName || senderName || 'WhatsApp Contact',
            contactPhone: parsedVisionJson.contactPhone || senderPhoneNumber,
            contactEmail: parsedVisionJson.contactEmail || undefined,
            organizationName: parsedVisionJson.organizationName || undefined,
            jobTitle: parsedVisionJson.jobTitle || undefined,
            leadValue: parsedVisionJson.leadValue ? Number(parsedVisionJson.leadValue) : null,
            expectedCloseDate: parsedVisionJson.expectedCloseDate || null,
            products: Array.isArray(parsedVisionJson.products) ? parsedVisionJson.products : [],
            description: parsedVisionJson.description || `OCR extracted from WhatsApp image.\n${parsedVisionJson.rawText || ''}`,
            rawText: parsedVisionJson.rawText || '',
            source: 'WhatsApp',
          };
        }
      } catch (visionError: any) {
        logger.error(`Vision AI OCR failed: ${visionError.message}`);
      }
    }

    // 2. Local Tesseract OCR (Runs completely offline without any API key)
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const ocrResult = await worker.recognize(imageBuffer);
      await worker.terminate();

      const ocrText = ocrResult?.data?.text?.trim();
      if (ocrText && ocrText.length > 5) {
        logger.info(`[WhatsAppService] Extracted ${ocrText.length} chars via local Tesseract OCR`);
        const parsedOcrLead = parseLeadDocumentText(ocrText, 'whatsapp_image.jpg');
        return {
          leadTitle: parsedOcrLead.title || `WhatsApp Card: ${parsedOcrLead.contactPerson || parsedOcrLead.organization || senderName || senderPhoneNumber}`,
          contactPersonName: parsedOcrLead.contactPerson || senderName || 'WhatsApp Contact',
          contactPersons: parsedOcrLead.contactPersons || [],
          contactPhone: parsedOcrLead.phone || senderPhoneNumber,
          phones: parsedOcrLead.phones || (parsedOcrLead.phone ? [parsedOcrLead.phone] : []),
          contactEmail: parsedOcrLead.email || undefined,
          organizationName: parsedOcrLead.organization || undefined,
          jobTitle: parsedOcrLead.jobTitle || undefined,
          leadValue: parsedOcrLead.leadValue || null,
          expectedCloseDate: parsedOcrLead.expectedCloseDate || null,
          products: parsedOcrLead.products || [],
          description: parsedOcrLead.description || `Extracted via Local OCR:\n${ocrText}`,
          rawText: ocrText,
          source: 'WhatsApp Card OCR (Offline)',
        };
      }
    } catch (tesseractError: any) {
      logger.warn(`[WhatsAppService] Local Tesseract OCR failed: ${tesseractError.message}`);
    }

    // 3. Fallback to caption text if available
    if (captionText && captionText.trim().length > 3) {
      const parsedFromCaption = await this.extractLeadFromText(captionText, senderPhoneNumber || '', senderName);
      if (parsedFromCaption) {
        return {
          ...parsedFromCaption,
          leadTitle: parsedFromCaption.leadTitle || `WhatsApp Image Lead from ${senderName || senderPhoneNumber || 'Contact'}`,
          description: `WhatsApp Image with caption:\n${captionText}`,
        };
      }
    }

    return {
      leadTitle: `WhatsApp Image Lead from ${senderName || senderPhoneNumber || 'Contact'}`,
      contactPersonName: senderName || 'WhatsApp Contact',
      contactPhone: senderPhoneNumber || '',
      description: captionText ? `WhatsApp Image with caption: ${captionText}` : 'Received image via WhatsApp',
      source: 'WhatsApp',
      products: [],
    };
  }

  /**
   * Extract structured Lead details from a PDF document attachment
   */
  public static async extractLeadFromDocument(
    documentBuffer: Buffer,
    originalFilename: string,
    captionText?: string,
    senderPhoneNumber?: string,
    senderName?: string
  ): Promise<IWhatsAppExtractedLead> {
    const extractedRawText = extractTextFromBuffer(documentBuffer, originalFilename);
    const combinedContent = captionText
      ? `Caption: ${captionText}\n\nDocument Content:\n${extractedRawText}`
      : extractedRawText;

    const parsedLead = await this.extractLeadFromText(combinedContent, senderPhoneNumber || '', senderName);
    if (!parsedLead.leadTitle) {
      parsedLead.leadTitle = `WhatsApp Doc Lead: ${path.basename(originalFilename, path.extname(originalFilename))}`;
    }
    return parsedLead;
  }

  /**
   * Create full CRM Lead record in PostgreSQL strictly using procedural functions
   */
  public static async createLeadFromExtractedData(
    extractedLeadData: IWhatsAppExtractedLead,
    senderPhoneNumber: string,
    savedFileUrl?: string,
    originalFilename?: string
  ): Promise<IWhatsAppLeadCreationResult> {
    let databaseConnection: PoolClient | undefined;

    try {
      databaseConnection = await pool.connect();

      // 1. Resolve or Create Organization using save_organization
      let organizationId: number | null = null;
      let isOrganizationCreated = false;

      if (extractedLeadData.organizationName && extractedLeadData.organizationName.trim()) {
        const trimmedOrgName = extractedLeadData.organizationName.trim();
        const existingOrgQuery = await databaseConnection.query(
          'SELECT id, name FROM public.organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
          [trimmedOrgName]
        );

        if (existingOrgQuery.rows.length > 0) {
          organizationId = existingOrgQuery.rows[0].id;
        } else {
          const organizationResult = await databaseConnection.query(
            'SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result',
            [trimmedOrgName, null, 1, '{}']
          );
          const createdOrganization = organizationResult.rows[0]?.result;
          if (createdOrganization && createdOrganization.id) {
            organizationId = createdOrganization.id;
            isOrganizationCreated = true;
          }
        }
      }

      // 2. Resolve or Create Contact Person(s) using save_person
      let contactPersonId: number | null = null;
      let resolvedPersonName: string | null = extractedLeadData.contactPersonName || null;
      let isPersonCreated = false;

      // Prepare list of contact persons to create or link
      const rawPersonsList = Array.isArray(extractedLeadData.contactPersons) && extractedLeadData.contactPersons.length > 0
        ? extractedLeadData.contactPersons
        : (resolvedPersonName ? [{ name: resolvedPersonName, phone: extractedLeadData.contactPhone, email: extractedLeadData.contactEmail, title: extractedLeadData.jobTitle }] : []);

      const allSavedContactPersons: Array<{ id: number; name: string; phone?: string; email?: string; title?: string }> = [];

      for (let i = 0; i < rawPersonsList.length; i++) {
        const item = rawPersonsList[i];
        const itemPersonName = (item.name || '').trim();
        const itemEmail = item.email?.trim() || (i === 0 ? extractedLeadData.contactEmail?.trim() : undefined);
        const itemPhone = (item.phone || (i === 0 ? (extractedLeadData.contactPhone || senderPhoneNumber) : '')).trim();
        const itemTitle = item.title || (i === 0 ? extractedLeadData.jobTitle : undefined);

        let curPersonId: number | null = null;
        let curPersonName: string = itemPersonName;

        // Check existing person by email
        if (itemEmail) {
          const emailPersonQuery = await databaseConnection.query(
            'SELECT id, name, organization_id FROM public.persons WHERE emails::text ILIKE $1 LIMIT 1',
            [`%${itemEmail}%`]
          );
          if (emailPersonQuery.rows.length > 0) {
            curPersonId = emailPersonQuery.rows[0].id;
            curPersonName = emailPersonQuery.rows[0].name;
          }
        }

        // Check existing person by phone number
        if (!curPersonId && itemPhone) {
          const cleanedPhoneNumber = itemPhone.replace(/[^0-9+]/g, '');
          const searchPattern = cleanedPhoneNumber.length >= 6 ? `%${cleanedPhoneNumber.slice(-8)}%` : `%${itemPhone}%`;
          const phonePersonQuery = await databaseConnection.query(
            'SELECT id, name, organization_id FROM public.persons WHERE contact_numbers::text ILIKE $1 LIMIT 1',
            [searchPattern]
          );
          if (phonePersonQuery.rows.length > 0) {
            const existingName = phonePersonQuery.rows[0].name;
            const isGenericName = !itemPersonName || /^(whatsapp|contact|lead|unknown)/i.test(itemPersonName);
            const isNameMatch = itemPersonName && (existingName.toLowerCase().includes(itemPersonName.toLowerCase()) || itemPersonName.toLowerCase().includes(existingName.toLowerCase()));

            if (isGenericName || isNameMatch) {
              curPersonId = phonePersonQuery.rows[0].id;
              curPersonName = existingName;
            }
          }
        }

        // Check existing person by exact name in this organization
        if (!curPersonId && itemPersonName && organizationId) {
          const orgPersonQuery = await databaseConnection.query(
            'SELECT id, name FROM public.persons WHERE organization_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1',
            [organizationId, itemPersonName]
          );
          if (orgPersonQuery.rows.length > 0) {
            curPersonId = orgPersonQuery.rows[0].id;
            curPersonName = orgPersonQuery.rows[0].name;
          }
        }

        // If person does not exist, create new person record via save_person
        if (!curPersonId && (itemPersonName || itemEmail || itemPhone)) {
          const targetPersonName = itemPersonName || 'WhatsApp Contact';
          const emailList = itemEmail ? [{ label: 'work', value: itemEmail }] : [];
          const phoneList: Array<{ label: string; value: string }> = [];

          if (itemPhone) {
            phoneList.push({ label: 'mobile', value: itemPhone });
          }

          // If primary contact has multiple numbers detected, add additional numbers
          if (i === 0 && Array.isArray(extractedLeadData.phones) && extractedLeadData.phones.length > 0) {
            extractedLeadData.phones.forEach((p) => {
              if (!phoneList.some((pl) => pl.value === p)) {
                phoneList.push({ label: 'work', value: p });
              }
            });
          }

          const savePersonResult = await databaseConnection.query(
            'SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb) as result',
            [
              targetPersonName,
              JSON.stringify(emailList),
              JSON.stringify(phoneList),
              organizationId || null,
              itemTitle || null,
              1,
              '{}',
            ]
          );

          const createdPerson = savePersonResult.rows[0]?.result;
          if (createdPerson && createdPerson.id) {
            curPersonId = createdPerson.id;
            curPersonName = createdPerson.name;
            if (i === 0) isPersonCreated = true;
          }
        } else if (curPersonId && organizationId) {
          // Link person with organization if missing
          await databaseConnection.query(
            'UPDATE public.persons SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL',
            [organizationId, curPersonId]
          );
        }

        if (curPersonId) {
          allSavedContactPersons.push({
            id: curPersonId,
            name: curPersonName || itemPersonName,
            phone: itemPhone,
            email: itemEmail,
            title: itemTitle,
          });

          if (i === 0) {
            contactPersonId = curPersonId;
            resolvedPersonName = curPersonName || itemPersonName;
          }
        }
      }

      // 3. Resolve Default Lead Pipeline and First Stage
      const pipelineQuery = await databaseConnection.query('SELECT * FROM public.fn_get_lead_pipelines()');
      let pipelineId: number | null = null;
      let stageId: number | null = null;

      const defaultPipeline = pipelineQuery.rows.find((p: any) => p.is_default) || pipelineQuery.rows[0];
      if (defaultPipeline) {
        pipelineId = defaultPipeline.id;
        const stageQuery = await databaseConnection.query('SELECT * FROM public.fn_get_pipeline_stages($1)', [pipelineId]);
        if (stageQuery.rows.length > 0) {
          stageId = stageQuery.rows[0].id;
        }
      }

      // 4. Resolve Lead Source (WhatsApp)
      let leadSourceId: number | null = null;
      const sourceQuery = await databaseConnection.query(
        "SELECT id FROM public.lead_sources WHERE LOWER(TRIM(name)) = 'whatsapp' OR name ILIKE '%whatsapp%' LIMIT 1"
      );
      if (sourceQuery.rows.length > 0) {
        leadSourceId = sourceQuery.rows[0].id;
      }

      // 5. Create Lead via fn_create_lead
      let formattedCloseDate: string | null = null;
      if (extractedLeadData.expectedCloseDate) {
        const parsedDate = new Date(extractedLeadData.expectedCloseDate);
        if (!isNaN(parsedDate.getTime())) {
          formattedCloseDate = parsedDate.toISOString().split('T')[0];
        }
      }

      const finalLeadTitle = extractedLeadData.leadTitle || `WhatsApp Lead from ${resolvedPersonName || senderPhoneNumber}`;
      const finalLeadDescription = extractedLeadData.description || `Inquiry received via WhatsApp from ${senderPhoneNumber}`;

      const leadCreationQuery = await databaseConnection.query(
        'SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          finalLeadTitle,
          finalLeadDescription,
          extractedLeadData.leadValue || null,
          1,
          contactPersonId,
          leadSourceId || null,
          null,
          pipelineId,
          formattedCloseDate,
          organizationId,
        ]
      );

      const createdLead = leadCreationQuery.rows[0];
      if (!createdLead || !createdLead.id) {
        throw new Error('Failed to create lead in database via fn_create_lead');
      }

      // Store additional contacts in custom_attributes if multiple contacts exist
      if (allSavedContactPersons.length > 1) {
        await databaseConnection.query(
          'UPDATE public.leads SET custom_attributes = COALESCE(custom_attributes, \'{}\'::jsonb) || $1::jsonb WHERE id = $2',
          [JSON.stringify({ additional_contacts: allSavedContactPersons }), createdLead.id]
        );
      }

      // Update stage if stage exists
      if (stageId) {
        await databaseConnection.query('SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)', [
          createdLead.id,
          stageId,
        ]);
      }

      // 6. Attach Products via fn_add_lead_product
      let attachedProductsCount = 0;
      if (Array.isArray(extractedLeadData.products) && extractedLeadData.products.length > 0) {
        for (const productItem of extractedLeadData.products) {
          if (!productItem.name) continue;

          let targetProductId: number | null = null;
          const productSearchQuery = await databaseConnection.query(
            'SELECT id FROM public.products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1',
            [productItem.name.trim()]
          );

          if (productSearchQuery.rows.length > 0) {
            targetProductId = productSearchQuery.rows[0].id;
          } else {
            // Create product if new
            const generatedSku = productItem.sku || `PROD-${Date.now().toString().slice(-5)}`;
            const newProductQuery = await databaseConnection.query(
              'SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)',
              [
                generatedSku,
                productItem.name.trim(),
                productItem.description || productItem.name,
                productItem.quantity || 1,
                productItem.price || 0,
              ]
            );
            const savedProduct = newProductQuery.rows[0];
            if (savedProduct && savedProduct.id) {
              targetProductId = savedProduct.id;
            }
          }

          if (targetProductId) {
            await databaseConnection.query('SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4)', [
              createdLead.id,
              targetProductId,
              productItem.quantity || 1,
              productItem.price || null,
            ]);
            attachedProductsCount++;
          }
        }
      }

      // 7. Attach WhatsApp Activity / Media via fn_create_activity
      let createdActivityId: number | null = null;
      const activityTitle = savedFileUrl
        ? `WhatsApp Attachment: ${originalFilename || 'Media File'}`
        : `WhatsApp Message from ${resolvedPersonName || senderPhoneNumber}`;

      const activityComment = savedFileUrl
        ? `Media received via WhatsApp from ${senderPhoneNumber}. URL: ${savedFileUrl}\n\nNotes: ${finalLeadDescription}`
        : `Message received via WhatsApp: ${finalLeadDescription}`;

      const activityQuery = await databaseConnection.query(
        'SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [
          activityTitle,
          savedFileUrl ? 'file' : 'note',
          activityComment,
          null,
          null,
          true,
          1,
          null,
          createdLead.id,
          contactPersonId,
        ]
      );

      if (activityQuery.rows.length > 0) {
        createdActivityId = activityQuery.rows[0].id;
      }

      // 8. Trigger Notifications & Workflows
      notifyCRMActivity({
        title: 'New WhatsApp Lead Created',
        message: `Lead #${createdLead.id} "${finalLeadTitle}" was received and created via WhatsApp from ${senderPhoneNumber}.`,
        module: 'lead',
        entityId: createdLead.id,
        actionType: 'created',
        userId: 1,
        createdBy: 1,
      });

      processWorkflowsForEvent('leads', 'created', createdLead.id, { id: 1 }).catch((workflowError: any) =>
        logger.error(`Workflow trigger error: ${workflowError?.message}`)
      );

      const replyConfirmationMessage = `✅ Thank you! Your inquiry has been registered as Lead #${createdLead.id} in our CRM. Our sales team will get back to you shortly.`;

      return {
        success: true,
        leadId: createdLead.id,
        leadTitle: finalLeadTitle,
        personId: contactPersonId,
        personName: resolvedPersonName,
        isPersonCreated,
        organizationId,
        organizationName: extractedLeadData.organizationName || null,
        isOrganizationCreated,
        attachedProductsCount,
        activityId: createdActivityId,
        senderPhoneNumber,
        mediaUrl: savedFileUrl || null,
        extractedData: extractedLeadData,
        replyMessage: replyConfirmationMessage,
      };
    } catch (error: any) {
      logger.error(`Error in createLeadFromExtractedData: ${error.message}`);
      throw error;
    } finally {
      databaseConnection?.release();
    }
  }

  /**
   * Main inbound message orchestrator
   */
  public static async handleInboundMessage(
    inboundMessage: IWhatsAppInboundMessage
  ): Promise<IWhatsAppLeadCreationResult> {
    const configMap = await configService.getAllConfigs();
    const whatsappConfig: IWhatsAppConfigSettings = {
      enabled: configMap['general.whatsapp.enabled'] === '1' || configMap['general.whatsapp.enabled'] === 'true',
      accessToken: configMap['general.whatsapp.access_token'] ? String(configMap['general.whatsapp.access_token']) : process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: configMap['general.whatsapp.phone_number_id'] ? String(configMap['general.whatsapp.phone_number_id']) : process.env.WHATSAPP_PHONE_NUMBER_ID,
      autoReplyEnabled: configMap['general.whatsapp.auto_reply'] !== '0',
    };

    let extractedData: IWhatsAppExtractedLead;
    let savedMediaUrl: string | undefined;
    let savedFilename: string | undefined;

    // Handle by message type
    if (inboundMessage.messageType === 'image' && inboundMessage.media) {
      const fetchedMedia = await this.fetchMediaBuffer(inboundMessage.media, whatsappConfig);
      if (fetchedMedia) {
        savedMediaUrl = fetchedMedia.savedUrl;
        savedFilename = fetchedMedia.savedFilename;
        extractedData = await this.extractLeadFromImage(
          fetchedMedia.buffer,
          inboundMessage.media.mimeType || 'image/jpeg',
          inboundMessage.textBody,
          inboundMessage.senderPhoneNumber,
          inboundMessage.senderName
        );
      } else {
        extractedData = await this.extractLeadFromText(
          inboundMessage.textBody || 'Inquiry image received via WhatsApp',
          inboundMessage.senderPhoneNumber,
          inboundMessage.senderName
        );
      }
    } else if (inboundMessage.messageType === 'document' && inboundMessage.media) {
      const fetchedMedia = await this.fetchMediaBuffer(inboundMessage.media, whatsappConfig);
      if (fetchedMedia) {
        savedMediaUrl = fetchedMedia.savedUrl;
        savedFilename = fetchedMedia.savedFilename;
        extractedData = await this.extractLeadFromDocument(
          fetchedMedia.buffer,
          inboundMessage.media.filename || 'whatsapp_document.pdf',
          inboundMessage.textBody,
          inboundMessage.senderPhoneNumber,
          inboundMessage.senderName
        );
      } else {
        extractedData = await this.extractLeadFromText(
          inboundMessage.textBody || 'Inquiry document received via WhatsApp',
          inboundMessage.senderPhoneNumber,
          inboundMessage.senderName
        );
      }
    } else {
      // Text message
      extractedData = await this.extractLeadFromText(
        inboundMessage.textBody || 'New WhatsApp Lead',
        inboundMessage.senderPhoneNumber,
        inboundMessage.senderName
      );
    }

    // Create lead in PostgreSQL
    const creationResult = await this.createLeadFromExtractedData(
      extractedData,
      inboundMessage.senderPhoneNumber,
      savedMediaUrl,
      savedFilename
    );

    // Send automated WhatsApp confirmation reply if configured
    if (whatsappConfig.accessToken && whatsappConfig.phoneNumberId && whatsappConfig.autoReplyEnabled) {
      this.sendWhatsAppReply(
        inboundMessage.senderPhoneNumber,
        creationResult.replyMessage,
        whatsappConfig
      ).catch((replyErr: any) => logger.warn(`Could not send WhatsApp auto-reply: ${replyErr?.message}`));
    }

    return creationResult;
  }

  /**
   * Send WhatsApp text message reply via Meta Graph API
   */
  public static async sendWhatsAppReply(
    recipientPhoneNumber: string,
    messageText: string,
    whatsappConfig: IWhatsAppConfigSettings
  ): Promise<boolean> {
    if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
      return false;
    }

    try {
      const cleanNumber = recipientPhoneNumber.replace(/[^0-9]/g, '');
      const response = await fetch(
        `https://graph.facebook.com/v20.0/${whatsappConfig.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanNumber,
            type: 'text',
            text: { body: messageText },
          }),
        }
      );
      return response.ok;
    } catch (error: any) {
      logger.warn(`Failed to send WhatsApp message to ${recipientPhoneNumber}: ${error.message}`);
      return false;
    }
  }
}
