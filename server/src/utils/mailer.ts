import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import path from 'path';

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

/**
  Creates a nodemailer transporter based on environment or configuration settings.
 */
export function createTransporter() {
  const host = env.SMTP_HOST || process.env.SMTP_HOST;
  const port = env.SMTP_PORT || Number(process.env.SMTP_PORT) || 587;
  const user = env.SMTP_USER || process.env.SMTP_USER;
  const pass = env.SMTP_PASS || process.env.SMTP_PASS;
  const secure = env.SMTP_SECURE || process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    logger.warn('[Mailer] SMTP credentials not configured. Email recorded in CRM database only.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues during dev
    },
  });
}

/**
 * Sends a real email via SMTP if transporter configured.
 * Does NOT throw errors - logs warnings so CRM database recording is unaffected.
 */
export async function sendRealMail(options: SendMailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return false;
    }

    const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_USER || process.env.SMTP_USER || 'no-reply@crm.local';
    const fromName = env.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'CRM Admin';

    const formattedAttachments = options.attachments?.map((att) => {
      // Ensure path is absolute for nodemailer
      const absolutePath = att.path.startsWith('/')
        ? path.join(process.cwd(), att.path)
        : att.path;

      return {
        filename: att.filename,
        path: absolutePath,
      };
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
      attachments: formattedAttachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`[Mailer] Real email dispatched successfully via SMTP. MessageID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    logger.error(`[Mailer] Failed to send email via SMTP: ${error?.message || error}`);
    return false;
  }
}
