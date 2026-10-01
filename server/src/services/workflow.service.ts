import { pool } from '@/config/db';
import { IWorkflow } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';
import { sendRealMail } from '@/utils/mailer';

const toNumberParam = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export class WorkflowService {
  public static async getAll(search?: string): Promise<IWorkflow[]> {
    try {
      const searchTerm = search?.trim() || null;
      const { rows } = await pool.query('SELECT get_all_workflows($1) as result', [searchTerm]);
      return rows[0]?.result || [];
    } catch (error: any) {
      logger.error({ error, search }, 'WorkflowService.getAll failed');
      throw error;
    }
  }

  public static async getById(id: number | string): Promise<IWorkflow | null> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return null;
      const { rows } = await pool.query('SELECT get_workflow($1) as result', [numId]);
      return rows[0]?.result || null;
    } catch (error: any) {
      logger.error({ error, id }, 'WorkflowService.getById failed');
      throw error;
    }
  }

  public static async save(
    data: {
      name: string;
      description?: string | null;
      entity_type: string;
      event: string;
      condition_type: string;
      conditions?: any;
      actions?: any;
    },
    id?: number | string
  ): Promise<IWorkflow> {
    try {
      const numId = toNumberParam(id);
      const conditionsJson = JSON.stringify(data.conditions || []);
      const actionsJson = JSON.stringify(data.actions || []);

      const { rows } = await pool.query(
        'SELECT save_workflow($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8) as result',
        [
          data.name.trim(),
          data.description || null,
          data.entity_type,
          data.event,
          data.condition_type,
          conditionsJson,
          actionsJson,
          numId,
        ]
      );
      return rows[0]?.result;
    } catch (error: any) {
      logger.error({ error, data, id }, 'WorkflowService.save failed');
      throw error;
    }
  }

  public static async delete(id: number | string): Promise<boolean> {
    try {
      const numId = toNumberParam(id);
      if (!numId) return false;
      const { rows } = await pool.query('SELECT delete_workflow($1) as result', [numId]);
      return Boolean(rows[0]?.result);
    } catch (error: any) {
      logger.error({ error, id }, 'WorkflowService.delete failed');
      throw error;
    }
  }

  /**
   * Triggers active workflows matching entityType and event, evaluating conditions & running actions.
   */
  public static async triggerWorkflows(entityType: string, event: string, rawData: any): Promise<void> {
    try {
      if (!rawData) return;
      let data = { ...rawData };
      const entityId = rawData.id || rawData.lead_id || rawData.person_id || rawData.organization_id || rawData.quote_id || rawData.activity_id;
      const lowerType = entityType.toLowerCase();

      // Enhance payload with complete details from DB for accurate condition evaluation
      if ((lowerType === 'leads' || lowerType === 'lead') && entityId) {
        const fullLeadRes = await pool.query('SELECT * FROM public.fn_get_lead_by_id($1)', [entityId]);
        if (fullLeadRes.rows[0]) {
          data = { ...data, ...fullLeadRes.rows[0] };
        }
      } else if ((lowerType === 'persons' || lowerType === 'person' || lowerType === 'contacts' || lowerType === 'contact') && entityId) {
        const fullPersonRes = await pool.query('SELECT * FROM public.fn_get_person_by_id($1)', [entityId]);
        if (fullPersonRes.rows[0]) {
          data = { ...data, ...fullPersonRes.rows[0] };
        }
      } else if ((lowerType === 'organizations' || lowerType === 'organization') && entityId) {
        const fullOrgRes = await pool.query('SELECT * FROM public.fn_get_organization_by_id($1)', [entityId]);
        if (fullOrgRes.rows[0]) {
          data = { ...data, ...fullOrgRes.rows[0] };
        }
      } else if ((lowerType === 'quotes' || lowerType === 'quote') && entityId) {
        const fullQuoteRes = await pool.query('SELECT * FROM public.fn_get_quote_by_id($1)', [entityId]);
        if (fullQuoteRes.rows[0]) {
          data = { ...data, ...fullQuoteRes.rows[0] };
        }
      } else if ((lowerType === 'activities' || lowerType === 'activity') && entityId) {
        const fullActRes = await pool.query('SELECT * FROM public.fn_get_activity_by_id($1)', [entityId]);
        if (fullActRes.rows[0]) {
          data = { ...data, ...fullActRes.rows[0] };
        }
      }

      // Build array of matching entity type aliases for DB query
      const entityTypesToMatch = [lowerType];
      if (lowerType === 'leads' || lowerType === 'lead') entityTypesToMatch.push('leads', 'lead');
      if (lowerType === 'persons' || lowerType === 'person' || lowerType === 'contacts' || lowerType === 'contact') entityTypesToMatch.push('persons', 'person', 'contacts', 'contact');
      if (lowerType === 'organizations' || lowerType === 'organization') entityTypesToMatch.push('organizations', 'organization');
      if (lowerType === 'quotes' || lowerType === 'quote') entityTypesToMatch.push('quotes', 'quote');
      if (lowerType === 'activities' || lowerType === 'activity') entityTypesToMatch.push('activities', 'activity');

      // Query workflows matching any of the entity_type aliases and event
      const { rows } = await pool.query(
        `SELECT * FROM workflows WHERE LOWER(entity_type) = ANY($1::text[]) AND (LOWER(event) = LOWER($2) OR LOWER(event) LIKE '%' || LOWER($2) || '%')`,
        [entityTypesToMatch, event]
      );

      if (!rows || rows.length === 0) return;

      for (const wf of rows) {
        const condType = (wf.condition_type || 'and').toLowerCase();
        let conditions = wf.conditions;
        if (typeof conditions === 'string') {
          try { conditions = JSON.parse(conditions); } catch {}
        }
        let actions = wf.actions;
        if (typeof actions === 'string') {
          try { actions = JSON.parse(actions); } catch {}
        }

        const passes = this.evaluateConditions(condType, conditions, data);
        if (passes && Array.isArray(actions)) {
          for (const action of actions) {
            await this.executeAction(action, entityType, data);
          }
        }
      }
    } catch (error: any) {
      logger.error({ error, entityType, event }, 'WorkflowService.triggerWorkflows failed');
    }
  }

  private static evaluateConditions(condType: string, conditions: any[], data: any): boolean {
    if (!Array.isArray(conditions) || conditions.length === 0) return true;

    const results = conditions.map((c) => {
      const fieldName = (c.field || c.attribute || c.attribute_name || '').toLowerCase().trim();
      if (!fieldName) return true;

      // Resolve field value with common CRM aliases
      let fieldVal = data[fieldName];
      if (fieldVal === undefined || fieldVal === null) {
        if (fieldName === 'stage_id' || fieldName === 'lead_pipeline_stage_id') {
          fieldVal = data['stage_id'] ?? data['lead_pipeline_stage_id'] ?? data['stage_name'];
        } else if (fieldName === 'source_id' || fieldName === 'lead_source_id') {
          fieldVal = data['source_id'] ?? data['lead_source_id'] ?? data['source_name'];
        } else if (fieldName === 'pipeline_id' || fieldName === 'lead_pipeline_id') {
          fieldVal = data['pipeline_id'] ?? data['lead_pipeline_id'] ?? data['pipeline_name'];
        } else if (fieldName === 'type_id' || fieldName === 'lead_type_id' || fieldName === 'type') {
          fieldVal = data['type_id'] ?? data['lead_type_id'] ?? data['type_name'] ?? data['type'];
        } else if (fieldName === 'lead_value' || fieldName === 'value') {
          fieldVal = data['lead_value'] ?? data['value'] ?? data['grand_total'];
        } else if (fieldName === 'user_id' || fieldName === 'assigned_to') {
          fieldVal = data['user_id'] ?? data['assigned_to'] ?? data['user_name'];
        } else if (fieldName === 'name' || fieldName === 'title' || fieldName === 'subject') {
          fieldVal = data['name'] ?? data['title'] ?? data['subject'];
        } else if (fieldName === 'emails' || fieldName === 'email') {
          fieldVal = data['emails'] ?? data['email'];
        } else if (fieldName === 'contact_numbers' || fieldName === 'phone') {
          fieldVal = data['contact_numbers'] ?? data['phone'];
        }
      }

      const op = (c.operator || 'equals').toLowerCase();

      // Check empty / not empty
      if (op === 'is_empty') {
        return fieldVal === undefined || fieldVal === null || fieldVal === '' || (Array.isArray(fieldVal) && fieldVal.length === 0);
      }
      if (op === 'is_not_empty') {
        return fieldVal !== undefined && fieldVal !== null && fieldVal !== '' && (!Array.isArray(fieldVal) || fieldVal.length > 0);
      }

      if (fieldVal === undefined || fieldVal === null) return false;

      const targetVal = c.value;

      // Handle multiselect / array conditions (e.g. operator '{}' or array target)
      if (Array.isArray(targetVal) || Array.isArray(fieldVal) || op === '{}' || op === 'in') {
        const targetArr = Array.isArray(targetVal) ? targetVal : [targetVal];
        const fieldStr = typeof fieldVal === 'object' ? JSON.stringify(fieldVal).toLowerCase() : String(fieldVal).toLowerCase();
        return targetArr.some((t: any) => fieldStr.includes(String(t).toLowerCase()));
      }

      // Handle boolean status matching (open/won/lost/true/false)
      if (fieldName === 'status' || typeof fieldVal === 'boolean' || targetVal === 'true' || targetVal === 'false' || targetVal === 'open' || targetVal === 'closed') {
        const b1 = fieldVal === true || String(fieldVal).toLowerCase() === 'true' || String(fieldVal).toLowerCase() === 'open' || String(fieldVal).toLowerCase() === '1';
        const b2 = targetVal === true || String(targetVal).toLowerCase() === 'true' || String(targetVal).toLowerCase() === 'open' || String(targetVal).toLowerCase() === '1';
        if (op === 'equals' || op === '=' || op === '==') return b1 === b2;
        if (op === 'not_equals' || op === '!=') return b1 !== b2;
      }

      switch (op) {
        case 'equals':
        case '=':
        case '==':
          return String(fieldVal).trim().toLowerCase() === String(targetVal).trim().toLowerCase();
        case 'not_equals':
        case '!=':
          return String(fieldVal).trim().toLowerCase() !== String(targetVal).trim().toLowerCase();
        case 'greater_than':
        case '>':
          return Number(fieldVal) > Number(targetVal);
        case 'greater_than_or_equal':
        case '>=':
          return Number(fieldVal) >= Number(targetVal);
        case 'less_than':
        case '<':
          return Number(fieldVal) < Number(targetVal);
        case 'less_than_or_equal':
        case '<=':
          return Number(fieldVal) <= Number(targetVal);
        case 'contains':
        case 'like':
        case 'ilike':
          return String(fieldVal).toLowerCase().includes(String(targetVal).toLowerCase());
        case 'not_contains':
          return !String(fieldVal).toLowerCase().includes(String(targetVal).toLowerCase());
        case 'starts_with':
          return String(fieldVal).toLowerCase().startsWith(String(targetVal).toLowerCase());
        case 'ends_with':
          return String(fieldVal).toLowerCase().endsWith(String(targetVal).toLowerCase());
        default:
          return String(fieldVal).toLowerCase().includes(String(targetVal).toLowerCase());
      }
    });

    return condType === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  private static async executeAction(action: any, entityType: string, data: any): Promise<void> {
    try {
      const { action_type, target, value } = action;
      const entityId = data.id || data.lead_id || data.person_id || data.organization_id;

      if (action_type === 'trigger_webhook' && target) {
        let webhookUrl = String(target).trim();
        // If target is a numeric ID (e.g. "2"), resolve URL from webhooks table
        if (!webhookUrl.startsWith('http://') && !webhookUrl.startsWith('https://')) {
          const webhookId = Number(webhookUrl);
          if (Number.isFinite(webhookId)) {
            const webhookRes = await pool.query('SELECT url FROM webhooks WHERE id = $1', [webhookId]);
            if (webhookRes.rows[0]?.url) {
              webhookUrl = webhookRes.rows[0].url;
            }
          }
        }
        if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event_type: entityType, event_data: data, triggered_at: new Date().toISOString() }),
          }).catch(() => {});
        }
      } else if (action_type === 'create_activity' && entityId) {
        const isLead = entityType.toLowerCase().startsWith('lead');
        const isPerson = entityType.toLowerCase().startsWith('person');
        const leadId = isLead ? entityId : (data.lead_id || null);
        const personId = isPerson ? entityId : (data.person_id || null);
        const userId = data.user_id || 1;

        const validTypes = ['call', 'meeting', 'task', 'email', 'lunch'];
        const activityType = validTypes.includes(String(target).toLowerCase())
          ? String(target).toLowerCase()
          : 'call';
        const activityTitle = (validTypes.includes(String(target).toLowerCase()) ? value : target) || value || 'Automated Workflow Activity';

        await pool.query(
          `SELECT * FROM public.fn_create_activity(
            $1::varchar, $2::varchar, $3::text,
            NOW()::timestamp, (NOW() + INTERVAL '30 minutes')::timestamp,
            false::boolean, $4::integer, null::varchar, $5::integer, $6::integer
          )`,
          [
            activityTitle,
            activityType,
            `Triggered by workflow rule for ${entityType} #${entityId}`,
            userId,
            leadId,
            personId,
          ]
        );
      } else if (action_type === 'assign_user' && (target || value) && entityId) {
        const userId = Number(target) || Number(value);
        if (Number.isFinite(userId)) {
          const lowerEntity = entityType.toLowerCase();
          if (lowerEntity.startsWith('lead')) {
            await pool.query(`UPDATE leads SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          } else if (lowerEntity.startsWith('person') || lowerEntity.startsWith('contact')) {
            await pool.query(`UPDATE persons SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          } else if (lowerEntity.startsWith('organization')) {
            await pool.query(`UPDATE organizations SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          } else if (lowerEntity.startsWith('quote')) {
            await pool.query(`UPDATE quotes SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          } else if (lowerEntity.startsWith('activit')) {
            await pool.query(`UPDATE activities SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          }
        }
      } else if (action_type === 'update_attribute' && target && value !== undefined && entityId) {
        const targetCol = target.toLowerCase().trim();
        if (targetCol === 'stage_id' || targetCol === 'lead_pipeline_stage_id') {
          const stageId = Number(value);
          if (Number.isFinite(stageId)) {
            await pool.query(`SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)`, [entityId, stageId]);
          }
        } else {
          const lowerEntity = entityType.toLowerCase();
          let colName = targetCol;
          if (colName === 'source_id') colName = 'lead_source_id';
          if (colName === 'type_id') colName = 'lead_type_id';
          if (colName === 'pipeline_id') colName = 'lead_pipeline_id';

          if (lowerEntity.startsWith('lead')) {
            const leadCols = ['status', 'lead_source_id', 'lead_type_id', 'lead_pipeline_id', 'lead_value', 'title', 'description', 'user_id', 'organization_id', 'person_id'];
            if (leadCols.includes(colName)) {
              let valToSet: any = value;
              if (colName === 'status') {
                valToSet = value === 'open' || value === 'true' || value === true || value === 1;
              }
              await pool.query(`UPDATE leads SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [valToSet, entityId]);
            }
          } else if (lowerEntity.startsWith('person') || lowerEntity.startsWith('contact')) {
            const personCols = ['name', 'user_id', 'organization_id', 'job_title'];
            if (personCols.includes(colName)) {
              await pool.query(`UPDATE persons SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [value, entityId]);
            }
          } else if (lowerEntity.startsWith('organization')) {
            const orgCols = ['name', 'address', 'user_id'];
            if (orgCols.includes(colName)) {
              await pool.query(`UPDATE organizations SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [value, entityId]);
            }
          } else if (lowerEntity.startsWith('quote')) {
            const quoteCols = ['subject', 'description', 'user_id', 'person_id', 'lead_id', 'grand_total', 'sub_total', 'tax_amount', 'discount_amount'];
            if (quoteCols.includes(colName)) {
              await pool.query(`UPDATE quotes SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [value, entityId]);
            }
          } else if (lowerEntity.startsWith('activit')) {
            const actCols = ['title', 'type', 'comment', 'user_id', 'location', 'is_done'];
            if (actCols.includes(colName)) {
              let valToSet: any = value;
              if (colName === 'is_done') {
                valToSet = value === 'true' || value === true || value === 1;
              }
              await pool.query(`UPDATE activities SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [valToSet, entityId]);
            }
          }
        }
      } else if (action_type === 'send_email' && target) {
        const templateId = Number(target);
        if (Number.isFinite(templateId)) {
          const { rows } = await pool.query(`SELECT * FROM email_templates WHERE id = $1`, [templateId]);
          if (rows[0]) {
            const template = rows[0];
            let recipientEmail = value?.trim();

            if (!recipientEmail || recipientEmail === 'contact_email' || recipientEmail === 'person_email') {
              if (data.person_id) {
                const personRes = await pool.query(`SELECT emails FROM persons WHERE id = $1`, [data.person_id]);
                if (personRes.rows[0]?.emails) {
                  let emailsArr = personRes.rows[0].emails;
                  if (typeof emailsArr === 'string') {
                    try { emailsArr = JSON.parse(emailsArr); } catch {}
                  }
                  if (Array.isArray(emailsArr) && emailsArr[0]) {
                    recipientEmail = emailsArr[0].value || emailsArr[0];
                  }
                }
              }
              if (!recipientEmail && data.emails) {
                let emailsArr = data.emails;
                if (typeof emailsArr === 'string') {
                  try { emailsArr = JSON.parse(emailsArr); } catch {}
                }
                if (Array.isArray(emailsArr) && emailsArr[0]) {
                  recipientEmail = emailsArr[0].value || emailsArr[0];
                }
              }
              if (!recipientEmail && data.user_id) {
                const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [data.user_id]);
                if (userRes.rows[0]?.email) {
                  recipientEmail = userRes.rows[0].email;
                }
              }
            }

            if (recipientEmail) {
              const uniqueId = `email_wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
              const messageId = `<${uniqueId}@crm.local>`;
              const subject = template.name || template.subject || 'Automated CRM Notification';
              const body = template.content || template.subject || 'Automated CRM Notification';

              // 1. Record email in database
              await pool.query(
                `INSERT INTO public.emails (
                  subject, source, user_type, name, reply, is_read, folders,
                  from_email, sender, reply_to, cc, bcc, unique_id, message_id,
                  person_id, lead_id, user_id, created_at, updated_at
                ) VALUES (
                  $1, 'mail', 'admin', 'Automated Workflow', $2, true, '["sent"]'::jsonb,
                  '{"name":"CRM Automation","email":"system@crm.local"}'::jsonb,
                  '{"name":"CRM Automation","email":"system@crm.local"}'::jsonb,
                  $3, '[]'::jsonb, '[]'::jsonb, $4, $5,
                  $6, $7, $8, NOW(), NOW()
                )`,
                [
                  subject,
                  body,
                  JSON.stringify([recipientEmail]),
                  uniqueId,
                  messageId,
                  data.person_id || null,
                  entityType.toLowerCase().startsWith('lead') ? entityId : (data.lead_id || null),
                  data.user_id || 1,
                ]
              );

              // 2. Dispatch real email via SMTP
              sendRealMail({
                to: recipientEmail,
                subject,
                text: body,
                html: body,
              }).catch((err) => logger.error({ err }, '[WorkflowService] sendRealMail failed'));
            }
          }
        }
      }
    } catch (err: any) {
      logger.error({ err, action }, 'WorkflowService.executeAction failed');
    }
  }
}
