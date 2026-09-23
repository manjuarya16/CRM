import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { configService } from '@/services/configService';
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

export interface SmtpSettingsConfig {
  enabled: boolean;
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Fetches dynamic SMTP configuration from database (core_config), with fallback to .env
 */
export async function getSmtpConfig(): Promise<SmtpSettingsConfig> {
  let dbConfigs: Record<string, any> = {};
  try {
    dbConfigs = await configService.getAllConfigs();
  } catch (err) {
    logger.warn('[Mailer] Could not load DB configs, falling back to env variables');
  }

  const dbEnable = dbConfigs['email.smtp.account.enable'];
  const enabled = dbEnable !== undefined ? dbEnable === '1' || dbEnable === 'true' : true;

  const host = (dbConfigs['email.smtp.account.host'] || env.SMTP_HOST || process.env.SMTP_HOST || '').trim();
  const portStr = dbConfigs['email.smtp.account.port'] || env.SMTP_PORT || process.env.SMTP_PORT || '587';
  const port = Number(portStr) || 587;
  const encryption = dbConfigs['email.smtp.account.encryption'] || 'tls';
  const user = (dbConfigs['email.smtp.account.username'] || env.SMTP_USER || process.env.SMTP_USER || '').trim();
  const pass = (dbConfigs['email.smtp.account.password'] || env.SMTP_PASS || process.env.SMTP_PASS || '').trim();
  const fromName = dbConfigs['email.smtp.account.from_name'] || env.SMTP_FROM_NAME || process.env.SMTP_FROM_NAME || 'CRM Admin';
  const fromEmail = dbConfigs['email.smtp.account.from_email'] || env.SMTP_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || user || 'no-reply@crm.local';

  const secure = encryption === 'ssl' || port === 465;

  return {
    enabled,
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
  };
}

/**
 * Helper to build nodemailer transporter options with auto-detection for Gmail
 */
function buildTransporterOptions(config: SmtpSettingsConfig) {
  const cleanUser = (config.user || '').trim();
  // Strip all whitespace from App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const cleanPass = (config.pass || '').trim().replace(/\s+/g, '');

  const hostLower = (config.host || '').toLowerCase();
  const isGmail = hostLower.includes('gmail');

  if (isGmail) {
    return {
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
    };
  }

  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  };
}

/**
 * Creates a nodemailer transporter based on dynamic SMTP configuration
 */
export function createTransporterFromConfig(config: SmtpSettingsConfig) {
  if (!config.enabled) {
    logger.warn('[Mailer] Email delivery disabled in Configuration settings.');
    return null;
  }

  if (!config.host || !config.user || !config.pass) {
    logger.warn('[Mailer] SMTP settings missing in Configuration and .env. Email recorded in database only.');
    return null;
  }

  return nodemailer.createTransport(buildTransporterOptions(config));
}

/**
 * Tests SMTP connection using provided or database settings
 */
export async function testSmtpConnection(customConfig?: Partial<SmtpSettingsConfig>): Promise<{ success: boolean; message: string }> {
  try {
    const currentConfig = await getSmtpConfig();
    
    // Filter out undefined / null / empty override values from customConfig
    const sanitizedCustom: Record<string, any> = {};
    if (customConfig) {
      for (const [k, v] of Object.entries(customConfig)) {
        if (v !== undefined && v !== null && v !== '') {
          sanitizedCustom[k] = v;
        }
      }
    }

    const config: SmtpSettingsConfig = {
      ...currentConfig,
      ...sanitizedCustom,
    };

    if (!config.host) throw new Error('SMTP Host is required');
    if (!config.user) throw new Error('SMTP Username/Email is required');
    if (!config.pass) throw new Error('SMTP Password is required');

    const transporterOptions = buildTransporterOptions(config);
    const transporter = nodemailer.createTransport(transporterOptions);

    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully!' };
  } catch (error: any) {
    let msg = error?.message || 'Failed to connect to SMTP server';
    if (msg.includes('535') || msg.includes('BadCredentials')) {
      msg = 'Invalid login: Gmail rejected the username or App Password. Please verify your 16-character App Password (with 2-Step Verification enabled on your Google Account).';
    }
    return { success: false, message: msg };
  }
}

/**
 * Sends a real email via SMTP if transporter is configured and enabled.
 * Does NOT throw errors - logs warnings so database recording is unaffected.
 */
export async function sendRealMail(options: SendMailOptions): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    const transporter = createTransporterFromConfig(config);
    if (!transporter) {
      return false;
    }

    const fromEmail = config.fromEmail || config.user || 'no-reply@crm.local';
    const fromName = config.fromName || 'CRM Admin';

    const formattedAttachments = options.attachments?.map((att) => {
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
