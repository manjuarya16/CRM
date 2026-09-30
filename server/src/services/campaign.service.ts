import { pool } from '@/config/db';
import { ICampaign } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';
import { sendRealMail } from '@/utils/mailer';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class CampaignService {
  public static async getAll(search?: string): Promise<ICampaign[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_campaigns($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'CampaignService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<ICampaign | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_campaign($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'CampaignService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: {
      name: string;
      subject: string;
      status?: boolean;
      type: string;
      mail_to: string;
      spooling?: string | null;
      marketing_template_id?: number | null;
      marketing_event_id?: number | null;
    },
    id?: number | string
  ): Promise<ICampaign> {
    try {
      const numId = toNumberParam(id);
      const { rows } = await pool.query(
        'SELECT save_campaign($1, $2, $3, $4, $5, $6, $7, $8, $9) as result',
        [
          data.name.trim(),
          data.subject.trim(),
          data.status ?? false,
          data.type,
          data.mail_to,
          data.spooling || null,
          data.marketing_template_id || null,
          data.marketing_event_id || null,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'CampaignService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_campaign($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'CampaignService.delete failed');
      throw error;
    }
  }

  /**
   * Broadcast/Send campaign emails to target audience (leads or persons)
   */
  public static async sendCampaign(id: number | string): Promise<{ sentCount: number; totalRecipients: number }> {
    const numId = toNumberParam(id);
    if (!numId) throw new Error('Invalid campaign ID');

    const campaign = await this.getById(numId);
    if (!campaign) throw new Error('Campaign not found');

    if (!campaign.marketing_template_id) {
      throw new Error('This campaign does not have an Email Template attached.');
    }

    const { rows: tRows } = await pool.query(
      'SELECT id, name, subject, content FROM public.email_templates WHERE id = $1',
      [campaign.marketing_template_id]
    );
    const tmpl = tRows[0];
    if (!tmpl) throw new Error('Email template not found');

    // Fetch target recipient email addresses
    const recipientEmails: string[] = [];

    if (campaign.mail_to === 'leads') {
      const { rows: lRows } = await pool.query(`
        SELECT DISTINCT
          COALESCE(
            CASE 
              WHEN jsonb_typeof(p.emails::jsonb) = 'array' THEN p.emails->0->>'value' 
              ELSE p.emails::text 
            END,
            NULL
          ) as email
        FROM public.leads l
        JOIN public.persons p ON p.id = l.person_id
        WHERE p.emails IS NOT NULL
      `);
      for (const r of lRows) {
        if (r.email && r.email.includes('@')) recipientEmails.push(r.email.trim());
      }
    } else {
      // Default to persons / contacts
      const { rows: pRows } = await pool.query(`
        SELECT DISTINCT
          CASE 
            WHEN jsonb_typeof(emails::jsonb) = 'array' THEN emails->0->>'value' 
            ELSE emails::text 
          END as email
        FROM public.persons
        WHERE emails IS NOT NULL
      `);
      for (const r of pRows) {
        if (r.email && r.email.includes('@')) recipientEmails.push(r.email.trim());
      }
    }

    const uniqueRecipients = [...new Set(recipientEmails)];
    let sentCount = 0;

    for (const email of uniqueRecipients) {
      try {
        const ctx = await fetchTemplateContext({ to_email: email });
        const parsedSubject = parsePlaceholders(campaign.subject || tmpl.subject, ctx);
        const parsedBody = parsePlaceholders(tmpl.content, ctx);

        await sendRealMail({
          to: email,
          subject: parsedSubject,
          html: parsedBody,
        });
        sentCount++;
      } catch (err: any) {
        logger.error({ err: err?.message, email, campaignId: numId }, 'Error sending campaign email to recipient');
      }
    }

    logger.info({ campaignId: numId, sentCount, total: uniqueRecipients.length }, 'Campaign dispatched successfully');
    return { sentCount, totalRecipients: uniqueRecipients.length };
  }

  /**
   * Process all active campaigns scheduled for today (mirrors Laravel's php artisan campaign:process)
   */
  public static async processDueCampaigns(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const { rows: dueCampaigns } = await pool.query(`
      SELECT c.id
      FROM public.marketing_campaigns c
      LEFT JOIN public.marketing_events e ON c.marketing_event_id = e.id
      WHERE c.status = TRUE
        AND (e.date IS NULL OR e.date = $1::date)
    `, [today]);

    let totalDispatched = 0;
    for (const row of dueCampaigns) {
      try {
        await this.sendCampaign(row.id);
        totalDispatched++;
      } catch (e: any) {
        logger.error({ err: e?.message, campaignId: row.id }, 'processDueCampaigns error');
      }
    }
    return totalDispatched;
  }
}
