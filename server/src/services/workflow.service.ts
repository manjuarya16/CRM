import { pool } from '@/config/db';
import { IWorkflow } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';
import { sendRealMail } from '@/utils/mailer';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';
import { TagService } from './tag.service';

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
        try {
          const fullLeadRes = await pool.query('SELECT * FROM public.fn_get_lead_by_id($1)', [entityId]);
          if (fullLeadRes.rows[0]) {
            data = { ...data, ...fullLeadRes.rows[0] };
          }
        } catch (e) {
          logger.warn({ e, entityId }, 'WorkflowService lead fetch warning');
        }
      } else if ((lowerType === 'persons' || lowerType === 'person' || lowerType === 'contacts' || lowerType === 'contact') && entityId) {
        try {
          const fullPersonRes = await pool.query('SELECT get_person($1) as result', [entityId]);
          const personObj = fullPersonRes.rows[0]?.result || fullPersonRes.rows[0];
          if (personObj) {
            data = { ...data, ...personObj };
          }
        } catch (e) {
          logger.warn({ e, entityId }, 'WorkflowService person fetch warning');
        }
      } else if ((lowerType === 'organizations' || lowerType === 'organization') && entityId) {
        try {
          const fullOrgRes = await pool.query('SELECT get_organization($1) as result', [entityId]);
          const orgObj = fullOrgRes.rows[0]?.result || fullOrgRes.rows[0];
          if (orgObj) {
            data = { ...data, ...orgObj };
          }
        } catch (e) {
          logger.warn({ e, entityId }, 'WorkflowService organization fetch warning');
        }
      } else if ((lowerType === 'quotes' || lowerType === 'quote') && entityId) {
        try {
          const fullQuoteRes = await pool.query('SELECT * FROM public.fn_get_quote_by_id($1)', [entityId]);
          if (fullQuoteRes.rows[0]) {
            data = { ...data, ...fullQuoteRes.rows[0] };
          }
        } catch (e) {
          logger.warn({ e, entityId }, 'WorkflowService quote fetch warning');
        }
      } else if ((lowerType === 'activities' || lowerType === 'activity') && entityId) {
        try {
          const fullActRes = await pool.query('SELECT * FROM public.fn_get_activity_by_id($1)', [entityId]);
          if (fullActRes.rows[0]) {
            data = { ...data, ...fullActRes.rows[0] };
          }
        } catch (e) {
          logger.warn({ e, entityId }, 'WorkflowService activity fetch warning');
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
        } else if (fieldName === 'lead_value' || fieldName === 'value' || fieldName === 'grand_total' || fieldName === 'sub_total') {
          fieldVal = data['lead_value'] ?? data['value'] ?? data['grand_total'] ?? data['sub_total'];
        } else if (fieldName === 'user_id' || fieldName === 'assigned_to') {
          fieldVal = data['user_id'] ?? data['assigned_to'] ?? data['user_name'];
        } else if (fieldName === 'name' || fieldName === 'title' || fieldName === 'subject') {
          fieldVal = data['name'] ?? data['title'] ?? data['subject'];
        } else if (fieldName === 'emails' || fieldName === 'email') {
          fieldVal = data['emails'] ?? data['email'];
        } else if (fieldName === 'contact_numbers' || fieldName === 'phone') {
          fieldVal = data['contact_numbers'] ?? data['phone'];
        } else if (fieldName === 'comment' || fieldName === 'description') {
          fieldVal = data['comment'] ?? data['description'];
        } else if (fieldName === 'job_title') {
          fieldVal = data['job_title'];
        } else if (fieldName === 'is_vip' || fieldName === 'vip' || fieldName === 'is_vip_person') {
          // VIP check: direct property, custom attributes, job title executive match, or name/tags VIP label
          const customAttrs = typeof data.custom_attributes === 'object' ? data.custom_attributes : {};
          const isVipAttr = data.is_vip ?? data.vip ?? customAttrs.is_vip ?? customAttrs.vip;
          if (isVipAttr !== undefined && isVipAttr !== null) {
            fieldVal = isVipAttr;
          } else {
            const jobTitle = String(data.job_title || '').toLowerCase();
            const nameStr = String(data.name || '').toLowerCase();
            const tagStr = JSON.stringify(data.tags || '').toLowerCase();
            const isExecTitle = ['ceo', 'cto', 'cfo', 'coo', 'vp', 'vice president', 'director', 'founder', 'owner', 'partner', 'head', 'chief', 'president'].some(t => jobTitle.includes(t));
            const hasVipLabel = nameStr.includes('vip') || tagStr.includes('vip') || JSON.stringify(customAttrs).toLowerCase().includes('vip');
            fieldVal = isExecTitle || hasVipLabel;
          }
        }

        // Check custom_attributes JSON object if still unresolved
        if ((fieldVal === undefined || fieldVal === null) && data.custom_attributes && typeof data.custom_attributes === 'object') {
          fieldVal = data.custom_attributes[fieldName] ?? data.custom_attributes[c.field];
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
      const entityId = data.id || data.lead_id || data.person_id || data.organization_id || data.quote_id || data.activity_id;

      if (action_type === 'trigger_webhook' && (target || value)) {
        let webhookUrl = String(target || value).trim();
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
      } else if (action_type === 'add_tag' && (target || value) && entityId) {
        const tagVal = String(target || value || '').trim();
        if (tagVal) {
          let tagId = Number(tagVal);
          if (!Number.isFinite(tagId)) {
            const tagRes = await pool.query('SELECT id FROM tags WHERE LOWER(name) = LOWER($1)', [tagVal]);
            if (tagRes.rows[0]) {
              tagId = tagRes.rows[0].id;
            } else {
              const newTagRes = await pool.query('SELECT save_tag($1, $2, $3, $4) AS data', [tagVal, '#0088cc', null, null]);
              tagId = newTagRes.rows[0]?.data?.id;
            }
          }
          if (tagId) {
            const targetEntityType = entityType.toLowerCase().startsWith('person') ? 'person' : 'lead';
            const targetEntId = entityType.toLowerCase().startsWith('person') ? entityId : (data.lead_id || entityId);
            const existingTags = await TagService.getEntityTags(targetEntityType, targetEntId);
            const existingIds = (existingTags || []).map((t: any) => Number(t.id)).filter(Boolean);
            if (!existingIds.includes(tagId)) {
              await TagService.saveEntityTags(targetEntityType, targetEntId, [...existingIds, tagId]);
            }
          }
        }
      } else if (action_type === 'add_note_activity' && (target || value) && entityId) {
        const noteText = String(target || value || '').trim();
        const isLead = entityType.toLowerCase().startsWith('lead');
        const isPerson = entityType.toLowerCase().startsWith('person');
        const leadId = isLead ? entityId : (data.lead_id || null);
        const personId = isPerson ? entityId : (data.person_id || null);
        const userId = data.user_id || 1;

        await pool.query(
          `SELECT * FROM public.fn_create_activity(
            $1::varchar, $2::varchar, $3::text,
            NOW()::timestamp, (NOW() + INTERVAL '15 minutes')::timestamp,
            true::boolean, $4::integer, null::varchar, $5::integer, $6::integer
          )`,
          ['Workflow Note', 'note', noteText, userId, leadId, personId]
        );
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
          } else if (lowerEntity.startsWith('quote')) {
            await pool.query(`UPDATE quotes SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          } else if (lowerEntity.startsWith('activit')) {
            await pool.query(`UPDATE activities SET user_id = $1, updated_at = NOW() WHERE id = $2`, [userId, entityId]);
          }
        }
      } else if ((action_type === 'update_lead' || action_type === 'update_related_leads' || action_type === 'update_attribute') && target && value !== undefined) {
        const leadId = entityType.toLowerCase().startsWith('lead') ? entityId : (data.lead_id || null);
        if (leadId) {
          const targetCol = target.toLowerCase().trim();
          if (targetCol === 'stage_id' || targetCol === 'lead_pipeline_stage_id') {
            const stageId = Number(value);
            if (Number.isFinite(stageId)) {
              await pool.query(`SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)`, [leadId, stageId]);
            }
          } else {
            let colName = targetCol;
            if (colName === 'source_id') colName = 'lead_source_id';
            if (colName === 'type_id') colName = 'lead_type_id';
            if (colName === 'pipeline_id') colName = 'lead_pipeline_id';

            const leadCols = ['status', 'lead_source_id', 'lead_type_id', 'lead_pipeline_id', 'lead_value', 'title', 'description', 'user_id', 'organization_id', 'person_id'];
            if (leadCols.includes(colName)) {
              let valToSet: any = value;
              if (colName === 'status') {
                valToSet = value === 'open' || value === 'true' || value === true || value === 1;
              }
              await pool.query(`UPDATE leads SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [valToSet, leadId]);
            }
          }
        }
      } else if (action_type === 'update_person' && target && value !== undefined) {
        const personId = (entityType.toLowerCase().startsWith('person') || entityType.toLowerCase().startsWith('contact'))
          ? entityId
          : (data.person_id || null);
        if (personId) {
          const colName = target.toLowerCase().trim();
          const personCols = ['name', 'user_id', 'organization_id', 'job_title', 'is_vip'];
          if (personCols.includes(colName)) {
            await pool.query(`UPDATE persons SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [value, personId]);
          }
        }
      } else if (action_type === 'update_quote' && target && value !== undefined) {
        const quoteId = entityType.toLowerCase().startsWith('quote') ? entityId : (data.quote_id || null);
        if (quoteId) {
          const colName = target.toLowerCase().trim();
          const quoteCols = ['subject', 'description', 'user_id', 'person_id', 'lead_id', 'grand_total', 'sub_total', 'tax_amount', 'discount_amount'];
          if (quoteCols.includes(colName)) {
            await pool.query(`UPDATE quotes SET ${colName} = $1, updated_at = NOW() WHERE id = $2`, [value, quoteId]);
          }
        }
      } else if ((action_type === 'send_email_person' || action_type === 'send_email_owner' || action_type === 'send_email_participants' || action_type === 'send_email') && target) {
        const templateId = Number(target);
        if (Number.isFinite(templateId)) {
          const { rows } = await pool.query(`SELECT * FROM email_templates WHERE id = $1`, [templateId]);
          if (rows[0]) {
            const template = rows[0];
            const lowerEntity = entityType.toLowerCase();

            // Extract email address helper
            const extractEmailAddress = (val: any): string | null => {
              if (!val) return null;
              let parsed = val;
              if (typeof val === 'string') {
                const trimmed = val.trim();
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
                try { parsed = JSON.parse(val); } catch {}
              }
              if (Array.isArray(parsed) && parsed.length > 0) {
                for (const item of parsed) {
                  const emailStr = typeof item === 'object' ? (item.value || item.email || item.contact_email) : String(item);
                  if (emailStr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailStr).trim())) {
                    return String(emailStr).trim();
                  }
                }
              }
              if (typeof parsed === 'object' && parsed !== null) {
                const emailStr = parsed.value || parsed.email || parsed.contact_email;
                if (emailStr && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailStr).trim())) {
                  return String(emailStr).trim();
                }
              }
              return null;
            };

            let recipientEmail: string | null = null;
            const cleanVal = (value || '').trim();

            if (action_type === 'send_email_owner') {
              const targetUserId = data.user_id || data.assigned_to;
              if (targetUserId) {
                const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [targetUserId]);
                if (userRes.rows[0]?.email) recipientEmail = extractEmailAddress(userRes.rows[0].email);
              }
            } else if (action_type === 'send_email_participants' || action_type === 'send_email_person') {
              recipientEmail = extractEmailAddress(data.emails) ||
                               extractEmailAddress(data.person_emails) ||
                               extractEmailAddress(data.email) ||
                               extractEmailAddress(data.contact_email);

              const targetPersonId = (lowerEntity.includes('person') || lowerEntity.includes('contact'))
                ? entityId
                : (data.person_id || null);

              if (!recipientEmail && targetPersonId) {
                try {
                  const personRes = await pool.query(`SELECT emails FROM persons WHERE id = $1`, [targetPersonId]);
                  if (personRes.rows[0]?.emails) recipientEmail = extractEmailAddress(personRes.rows[0].emails);
                } catch {}
              }
            } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanVal)) {
              recipientEmail = cleanVal;
            } else {
              recipientEmail = extractEmailAddress(data.emails) ||
                               extractEmailAddress(data.person_emails) ||
                               extractEmailAddress(data.email) ||
                               extractEmailAddress(data.contact_email) ||
                               extractEmailAddress(data.user_email);
            }

            if (recipientEmail) {
              const targetPersonId = (lowerEntity.includes('person') || lowerEntity.includes('contact'))
                ? entityId
                : (data.person_id || null);
              const targetLeadId = lowerEntity.includes('lead') ? entityId : (data.lead_id || null);

              const templateContext = await fetchTemplateContext({
                lead_id: targetLeadId,
                person_id: targetPersonId,
                organization_id: lowerEntity.includes('organization') ? entityId : (data.organization_id || null),
                activity_id: lowerEntity.includes('activit') ? entityId : (data.activity_id || data.id || null),
                quote_id: lowerEntity.includes('quote') ? entityId : (data.quote_id || data.id || null),
                product_id: lowerEntity.includes('product') ? entityId : (data.product_id || data.id || null),
                to_email: recipientEmail,
              });

              const rawSubject = template.name || template.subject || 'Automated CRM Notification';
              const rawBody = template.content || template.subject || 'Automated CRM Notification';

              const subject = parsePlaceholders(rawSubject, templateContext);
              const body = parsePlaceholders(rawBody, templateContext);

              const uniqueId = `email_wf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
              const messageId = `<${uniqueId}@crm.local>`;

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
                  targetPersonId,
                  targetLeadId,
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
            } else {
              logger.warn({ entityType, entityId, value }, '[WorkflowService] Unable to resolve recipient email address');
            }
          }
        }
      }
    } catch (err: any) {
      logger.error({ err, action }, 'WorkflowService.executeAction failed');
    }
  }
}

