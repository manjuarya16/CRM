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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let form: any = await this.getByFormId(formId).catch(() => null);
      let resolvedTenantId: number | null = form?.tenant_id ? Number(form.tenant_id) : null;

      if (!form) {
        const lookup = await client.query(
          `SELECT id, form_id, title, create_lead, lead_pipeline_id, submit_success_action, submit_success_content, tenant_id
           FROM public.web_forms WHERE form_id = $1 LIMIT 1`,
          [formId]
        ).catch(() => ({ rows: [] as any[] }));
        if (lookup.rows[0]) {
          form = lookup.rows[0];
          resolvedTenantId = lookup.rows[0].tenant_id ? Number(lookup.rows[0].tenant_id) : null;
        }
      }

      if (!form) {
        await client.query("SELECT set_config('app.is_super_admin', 'true', true)");
        const crossLookup = await client.query(
          `SELECT id, form_id, title, create_lead, lead_pipeline_id, submit_success_action, submit_success_content, tenant_id
           FROM public.web_forms WHERE form_id = $1 LIMIT 1`,
          [formId]
        ).catch(() => ({ rows: [] as any[] }));
        await client.query("SELECT set_config('app.is_super_admin', 'false', true)");
        if (crossLookup.rows[0]) {
          form = crossLookup.rows[0];
          resolvedTenantId = crossLookup.rows[0].tenant_id ? Number(crossLookup.rows[0].tenant_id) : null;
        }
      }

      if (resolvedTenantId && resolvedTenantId > 0) {
        await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(resolvedTenantId)]);
      }

      if (!form) {
        form = {
          id: null,
          form_id: formId,
          title: 'Web Submission Form',
          create_lead: true,
          submit_success_action: 'message',
          submit_success_content: 'Thank you for your submission. Your inquiry has been received.',
          lead_pipeline_id: null,
        };
      }

      const safeData = submissionData && typeof submissionData === 'object' ? submissionData : {};
      const formAttrs: any[] = Array.isArray(form.attributes) ? form.attributes : [];

      // Validate required form attributes before saving or creating a lead
      for (let idx = 0; idx < formAttrs.length; idx++) {
        const attr = formAttrs[idx];
        if (!attr || attr.is_hidden) continue;
        const key = attr.attribute_code || `field_${idx}`;
        const rawVal = safeData[key];
        const strVal = Array.isArray(rawVal) ? rawVal.join(',').trim() : String(rawVal ?? '').trim();
        if (attr.is_required && !strVal) {
          const err: any = new Error(`${attr.name || attr.attribute_name || key} is required`);
          err.statusCode = 400;
          throw err;
        }
      }

      const pickFieldValue = (directKeys: string[], codePatterns: RegExp[], typeMatches: string[] = []): string => {
        for (const k of directKeys) {
          const v = safeData[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            return String(v).trim();
          }
        }
        for (let idx = 0; idx < formAttrs.length; idx++) {
          const attr = formAttrs[idx];
          if (!attr) continue;
          const key = attr.attribute_code || `field_${idx}`;
          const val = safeData[key];
          if (val === undefined || val === null || String(val).trim() === '') continue;
          const attrCode = String(attr.attribute_code || '').toLowerCase();
          const attrName = String(attr.name || attr.attribute_name || '').toLowerCase();
          const attrType = String(attr.attribute_type || '').toLowerCase();
          if (typeMatches.includes(attrType) || codePatterns.some((rx) => rx.test(attrCode) || rx.test(attrName))) {
            return String(val).trim();
          }
        }
        for (const [k, v] of Object.entries(safeData)) {
          if (v === undefined || v === null || String(v).trim() === '') continue;
          if (codePatterns.some((rx) => rx.test(k.toLowerCase()))) {
            return String(v).trim();
          }
        }
        return '';
      };

      const extractedEmail = pickFieldValue(
        ['persons[emails]', 'email', 'emails', 'contact_email', 'person_email'],
        [/email/i],
        ['email']
      );
      const extractedName = pickFieldValue(
        ['persons[name]', 'full_name', 'name', 'person_name', 'contact_name'],
        [/^name$/i, /full.?name/i, /person.?name/i, /contact.?name/i, /persons\[name\]/i]
      );
      const extractedPhone = pickFieldValue(
        ['persons[contact_numbers]', 'phone', 'contact_numbers', 'mobile', 'phone_number'],
        [/phone/i, /mobile/i, /contact_number/i],
        ['phone', 'tel']
      );
      const extractedLeadTitle = pickFieldValue(
        ['leads[title]', 'title', 'lead_title', 'subject'],
        [/leads\[title\]/i, /\btitle\b/i, /\bsubject\b/i]
      );
      const extractedDescription = pickFieldValue(
        ['leads[description]', 'description', 'message', 'notes', 'comments'],
        [/description/i, /message/i, /notes?/i, /comments?/i],
        ['textarea']
      );

      await client.query(
        'SELECT save_web_form_submission($1, $2, $3, $4::jsonb) as id',
        [form.id ? Number(form.id) : null, form.form_id || formId, form.title || 'Lead Form', JSON.stringify(safeData)]
      ).catch((e) => logger.warn({ err: e }, 'Failed to insert web_form_submission record'));

      let createdLeadId: number | null = null;
      if (form.create_lead !== false) {
        const distinctSuffix = extractedName || extractedEmail || extractedPhone || `#${Date.now().toString().slice(-6)}`;
        const formLabel = String(form.title || formId || 'Web Form').trim();
        let titleCandidate = extractedLeadTitle;
        if (!titleCandidate || titleCandidate.toLowerCase() === formLabel.toLowerCase()) {
          titleCandidate = `${formLabel} - ${distinctSuffix}`;
        }
        const title = String(titleCandidate).trim().slice(0, 250) || `Web Form Inquiry #${Date.now().toString().slice(-6)}`;

        const description = extractedDescription;
        const payloadPipeline = safeData.lead_pipeline_id ?? safeData.pipeline_id ?? safeData.lead_pipeline;
        const rawPipeline = payloadPipeline !== undefined && payloadPipeline !== null && payloadPipeline !== "" && Number(payloadPipeline) > 0
          ? Number(payloadPipeline)
          : (form.lead_pipeline_id && Number(form.lead_pipeline_id) > 0 ? Number(form.lead_pipeline_id) : null);

        let verifiedPipelineId: number | null = null;
        if (rawPipeline && Number.isFinite(rawPipeline)) {
          const pCheck = await client.query('SELECT id FROM public.lead_pipelines WHERE id = $1 LIMIT 1', [rawPipeline]).catch(() => ({ rows: [] as any[] }));
          if (pCheck.rows[0]?.id) {
            verifiedPipelineId = Number(pCheck.rows[0].id);
          }
        }

        const parsedLeadValue = Number(safeData['leads[lead_value]'] ?? safeData.lead_value);
        const leadValue = Number.isFinite(parsedLeadValue) && parsedLeadValue >= 0 ? parsedLeadValue : 0;

        let personId = safeData.person_id && Number(safeData.person_id) > 0 ? Number(safeData.person_id) : null;
        if (!personId && (extractedEmail || extractedName || extractedPhone)) {
          if (extractedEmail) {
            const existingPerson = await client
              .query('SELECT id FROM public.persons WHERE emails::text ILIKE $1 LIMIT 1', [`%${extractedEmail}%`])
              .catch(() => ({ rows: [] as any[] }));
            if (existingPerson.rows[0]?.id) {
              personId = Number(existingPerson.rows[0].id);
            }
          }
          if (!personId) {
            const personDisplayName = extractedName || (extractedEmail ? extractedEmail.split('@')[0] : '') || extractedPhone || 'Web Lead Contact';
            const emailsJson = JSON.stringify(extractedEmail ? [{ value: extractedEmail, label: 'work' }] : []);
            const phonesJson = JSON.stringify(extractedPhone ? [{ value: extractedPhone, label: 'work' }] : []);
            const createdPerson = await client.query(
              `INSERT INTO public.persons (name, emails, contact_numbers, created_at, updated_at)
               VALUES ($1, $2::jsonb, $3::jsonb, NOW(), NOW())
               RETURNING id`,
              [personDisplayName.slice(0, 250), emailsJson, phonesJson]
            );
            if (createdPerson.rows[0]?.id) {
              personId = Number(createdPerson.rows[0].id);
            }
          }
        }

        const sourceId = safeData.lead_source_id && Number(safeData.lead_source_id) > 0 ? Number(safeData.lead_source_id) : null;
        const typeId = safeData.lead_type_id && Number(safeData.lead_type_id) > 0 ? Number(safeData.lead_type_id) : null;
        const orgId = safeData.organization_id && Number(safeData.organization_id) > 0 ? Number(safeData.organization_id) : null;

        const leadRes = await client.query(
          'SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [
            title,
            description,
            leadValue,
            null,
            personId,
            sourceId,
            typeId,
            verifiedPipelineId,
            null,
            orgId,
          ]
        );

        if (leadRes.rows[0]?.id) {
          createdLeadId = leadRes.rows[0].id;
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Submission received successfully',
        lead_id: createdLeadId,
        action: form.submit_success_action || 'message',
        content: form.submit_success_content || 'Thank you! Your submission has been received.',
      };
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error({ error, formId, submissionData }, 'WebFormService.handleSubmission failed');
      throw error;
    } finally {
      client.release();
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
