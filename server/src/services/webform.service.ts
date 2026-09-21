import { pool } from '@/config/db';
import { IWebForm } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class WebFormService {
  public static async getAll(search?: string): Promise<IWebForm[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_web_forms($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'WebFormService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IWebForm | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_web_form($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'WebFormService.getById failed');
      throw error;
    }
  }

  public static async getByFormId(formId: string): Promise<IWebForm | null> {
    try {
      const { rows } = await pool.query('SELECT get_web_form_by_form_id($1) as result', [formId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, formId }, 'WebFormService.getByFormId failed');
      throw error;
    }
  }

  public static async save(
    data: {
      form_id: string;
      title: string;
      description?: string | null;
      submit_button_label?: string;
      submit_success_action?: string;
      submit_success_content?: string;
      create_lead?: boolean;
      lead_pipeline_id?: number | null;
      background_color?: string;
      form_background_color?: string;
      form_title_color?: string;
      form_submit_button_color?: string;
      attribute_label_color?: string;
      attributes?: any[];
    },
    id?: number | string
  ): Promise<IWebForm> {
    try {
      const numId = toNumberParam(id);
      const attributesJson = data.attributes ? JSON.stringify(data.attributes) : '[]';

      const { rows } = await pool.query(
        'SELECT save_web_form($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15) as result',
        [
          data.form_id.trim(),
          data.title.trim(),
          data.description || null,
          data.submit_button_label || 'Submit',
          data.submit_success_action || 'message',
          data.submit_success_content || 'Thank you for your submission.',
          data.create_lead ?? false,
          data.lead_pipeline_id || null,
          data.background_color || '#ffffff',
          data.form_background_color || '#ffffff',
          data.form_title_color || '#1e293b',
          data.form_submit_button_color || '#0088cc',
          data.attribute_label_color || '#475569',
          attributesJson,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'WebFormService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_web_form($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'WebFormService.delete failed');
      throw error;
    }
  }

  public static async handleSubmission(formId: string, submissionData: Record<string, any>): Promise<any> {
    try {
      const form = await this.getByFormId(formId);
      if (!form) {
        throw new Error('Web form not found');
      }

      // 1. Record raw submission into web_form_submissions table
      await pool.query(
        'INSERT INTO web_form_submissions (web_form_id, form_id, form_title, data, created_at) VALUES ($1, $2, $3, $4::jsonb, NOW())',
        [form.id, form.form_id, form.title, JSON.stringify(submissionData)]
      );

      // 2. If create_lead is true, create lead and contact
      if (form.create_lead) {
        const title = submissionData.title || submissionData.name || 'Web Form Lead: ' + form.title;
        await pool.query(
          `INSERT INTO leads (title, description, lead_pipeline_id, lead_pipeline_stage_id, status, created_at, updated_at)
           VALUES ($1, $2, $3, (SELECT id FROM lead_pipeline_stages WHERE lead_pipeline_id = $3 ORDER BY sort_order ASC LIMIT 1), true, NOW(), NOW())`,
          [
            title,
            'Submitted via form ' + form.title + ' (' + form.form_id + '):\n' + JSON.stringify(submissionData, null, 2),
            form.lead_pipeline_id || 1,
          ]
        );
      }

      return {
        success: true,
        action: form.submit_success_action,
        content: form.submit_success_content,
      };
    } catch (error: any) {
      logger.error({ error, formId, submissionData }, 'WebFormService.handleSubmission failed');
      throw error;
    }
  }

  public static async getSubmissions(webFormId?: number | string): Promise<any[]> {
    try {
      const numId = toNumberParam(webFormId);
      if (numId) {
        const { rows } = await pool.query(
          'SELECT * FROM web_form_submissions WHERE web_form_id = $1 ORDER BY id DESC',
          [numId]
        );
        return rows;
      } else {
        const { rows } = await pool.query(
          'SELECT * FROM web_form_submissions ORDER BY id DESC LIMIT 200'
        );
        return rows;
      }
    } catch (error: any) {
      logger.error({ error, webFormId }, 'WebFormService.getSubmissions failed');
      throw error;
    }
  }
}
