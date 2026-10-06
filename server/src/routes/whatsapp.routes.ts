import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WhatsAppService } from '@/services/whatsapp.service';
import { logger } from '@/utils/logger';
import HttpStatusCodes from '@/common/constants/HttpStatusCodes';
import { IWhatsAppWebhookVerificationQuery } from '@/interfaces/whatsapp.interface';

const router = Router();

// Ensure upload directory exists
const whatsappUploadDir = path.join(process.cwd(), 'uploads', 'leads', 'whatsapp');
if (!fs.existsSync(whatsappUploadDir)) {
  fs.mkdirSync(whatsappUploadDir, { recursive: true });
}

// Multer for file simulation/upload
const upload = multer({
  dest: whatsappUploadDir,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

/**
 * Verification endpoint for Meta WhatsApp Cloud API Webhook
 * GET /api/whatsapp/webhook or GET /api/webhooks/whatsapp
 */
router.get(['/', '/webhook'], async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = req.query as IWhatsAppWebhookVerificationQuery;
    const challenge = await WhatsAppService.verifyWebhookSubscription(queryParams);

    if (challenge) {
      res.status(HttpStatusCodes.OK).send(challenge);
      return;
    }

    res.status(HttpStatusCodes.FORBIDDEN).json({
      success: false,
      message: 'Verification token mismatch or invalid hub mode.',
    });
  } catch (error: any) {
    logger.error(`Error verifying WhatsApp webhook: ${error.message}`);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Inbound webhook receiver for WhatsApp messages (Meta Cloud API, Twilio, etc.)
 * POST /api/whatsapp/webhook or POST /api/webhooks/whatsapp
 */
router.post(['/', '/webhook'], async (req: Request, res: Response): Promise<void> => {
  try {
    const inboundMessages = WhatsAppService.parseInboundWebhookPayload(req.body);

    if (!inboundMessages || inboundMessages.length === 0) {
      // Respond 200 immediately to acknowledge webhook delivery even if empty or status update
      res.status(HttpStatusCodes.OK).json({
        success: true,
        message: 'Webhook received (no actionable lead messages to process).',
      });
      return;
    }

    const creationResults = [];
    for (const messageItem of inboundMessages) {
      try {
        const result = await WhatsAppService.handleInboundMessage(messageItem);
        creationResults.push(result);
      } catch (processError: any) {
        logger.error(`Failed to process WhatsApp message ${messageItem.messageId}: ${processError.message}`);
      }
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: `Processed ${creationResults.length} WhatsApp message(s).`,
      data: creationResults,
    });
  } catch (error: any) {
    logger.error(`Error processing WhatsApp webhook payload: ${error.message}`);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Simulator / Testing endpoint for WhatsApp Lead Creation
 * POST /api/whatsapp/simulate
 */
router.post('/simulate', upload.single('mediaFile'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { senderPhoneNumber, senderName, textBody, messageType } = req.body;
    const file = req.file;

    let mediaAttachment: any = undefined;

    if (file) {
      const fileBuffer = fs.readFileSync(file.path);
      mediaAttachment = {
        filename: file.originalname,
        mimeType: file.mimetype,
        caption: textBody,
        fileBuffer,
      };

      // Clean temp upload file
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        // ignore cleanup error
      }
    }

    const inferredType = file
      ? (file.mimetype.startsWith('image/') ? 'image' : 'document')
      : (messageType || 'text');

    const syntheticMessage = {
      messageId: `sim_${Date.now()}`,
      senderPhoneNumber: senderPhoneNumber || '+15550199283',
      senderName: senderName || 'WhatsApp Lead Contact',
      timestamp: new Date().toISOString(),
      messageType: inferredType,
      textBody,
      media: mediaAttachment,
    };

    const creationResult = await WhatsAppService.handleInboundMessage(syntheticMessage as any);

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: `Lead successfully created from simulated WhatsApp message.`,
      data: creationResult,
    });
  } catch (error: any) {
    logger.error(`Error simulating WhatsApp lead creation: ${error.message}`);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * Status and Webhook URL helper
 * GET /api/whatsapp/status
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawProto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'crmsrv.imorse.digital';
    const detectedServerOrigin = `${rawProto}://${rawHost}`;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: {
        status: 'active',
        serverOrigin: detectedServerOrigin,
        webhookUrl: `${detectedServerOrigin}/api/whatsapp/webhook`,
        productionWebhookUrl: 'https://crmsrv.imorse.digital/api/whatsapp/webhook',
        supportedTypes: ['text', 'image (OCR)', 'document (PDF)', 'audio'],
        webhookEndpoints: {
          metaCloudApi: `${detectedServerOrigin}/api/whatsapp/webhook`,
          twilioWebhook: `${detectedServerOrigin}/api/whatsapp/webhook`,
          leadSimulator: `${detectedServerOrigin}/api/whatsapp/simulate`,
        },
      },
    });
  } catch (error: any) {
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
