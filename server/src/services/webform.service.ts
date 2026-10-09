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
      const pipelineId = data.lead_pipeline_id && Number(data.lead_pipeline_id) > 0 ? Number(data.lead_pipeline_id) : null;

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
          pipelineId,
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
      let form: any = await this.getByFormId(formId).catch(() => null);

      if (!form) {
        const { rows } = await pool.query('SELECT get_all_web_forms(null) as result').catch(() => ({ rows: [] }));
        const formsList = rows[0]?.result;
        if (Array.isArray(formsList) && formsList[0]) {
          form = formsList[0];
        } else {
          form = {
            id: 1,
            form_id: formId,
            title: 'Web Submission Form',
            create_lead: true,
            submit_success_action: 'message',
            submit_success_content: 'Thank you for your submission. Your inquiry has been received.',
            lead_pipeline_id: 1,
          };
        }
      }

      await pool.query(
        'SELECT save_web_form_submission($1, $2, $3, $4::jsonb) as id',
        [form.id || null, form.form_id || formId, form.title || 'Lead Form', JSON.stringify(submissionData)]
      ).catch((e) => logger.warn({ err: e }, 'Failed to insert web_form_submission record'));

      let createdLeadId: number | null = null;
      if (form.create_lead !== false) {
        const title = submissionData.title || submissionData.name || 'Web Form Inquiry: ' + (form.title || formId);
        const description = typeof submissionData.description === 'string' && submissionData.description.trim()
          ? submissionData.description.trim()
          : typeof submissionData.message === 'string' && submissionData.message.trim()
          ? submissionData.message.trim()
          : '';
        const payloadPipeline = submissionData.lead_pipeline_id ?? submissionData.pipeline_id ?? submissionData.lead_pipeline;
        const leadPipelineId = payloadPipeline !== undefined && payloadPipeline !== null && payloadPipeline !== "" && Number(payloadPipeline) > 0 
          ? Number(payloadPipeline) 
          : (form.lead_pipeline_id && Number(form.lead_pipeline_id) > 0 ? Number(form.lead_pipeline_id) : 1);

        const leadRes = await pool.query(
          'SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [
            title,
            description,
            Number(submissionData.lead_value) || 0,
            null, // p_user_id
            submissionData.person_id ? Number(submissionData.person_id) : null,
            submissionData.lead_source_id ? Number(submissionData.lead_source_id) : null,
            submissionData.lead_type_id ? Number(submissionData.lead_type_id) : null,
            leadPipelineId,
            null, // p_expected_close_date
            submissionData.organization_id ? Number(submissionData.organization_id) : null
          ]
        );

        if (leadRes.rows[0]?.id) {
          createdLeadId = leadRes.rows[0].id;
        }
      }

      return {
        success: true,
        message: 'Submission received successfully',
        lead_id: createdLeadId,
        action: form.submit_success_action || 'message',
        content: form.submit_success_content || 'Thank you! Your submission has been received.',
      };
    } catch (error: any) {
      logger.error({ error, formId, submissionData }, 'WebFormService.handleSubmission failed');
      throw error;
    }
  }

  public static async getSubmissions(webFormId?: number | string): Promise<any[]> {
    try {
      const numId = toNumberParam(webFormId);
      const { rows } = await pool.query(
        'SELECT * FROM get_web_form_submissions($1)',
        [numId]
      );
      return rows;
    } catch (error: any) {
      logger.error({ error, webFormId }, 'WebFormService.getSubmissions failed');
      throw error;
    }
  }
}
