/**
 * Workflow Engine — mirrors Laravel's Automation package flow:
 *   Listener/Entity.php  →  Validator.php  →  Entity/Lead|Activity|Person|Quote.php#executeActions()
 *
 * Responsibilities:
 *  1. processWorkflowsForEvent(entityType, event, entityId, user)
 *     - Loads matching workflows from DB
 *     - Enriches entity data from PostgreSQL
 *     - Validates conditions (AND / OR)
 *     - Executes actions (send_email_person, send_email_owner, send_email_participants, send_email, update_lead, update_person, update_quote, add_tag, add_note_activity, trigger_webhook, assign_user)
 */

import { pool } from '@/config/db';
import { logger } from '@/utils/logger';
import { fireWebhook } from '@/utils/webhookRunner';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';
import { sendRealMail } from '@/utils/mailer';
import { TagService } from '@/services/tag.service';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowEntityType = 'leads' | 'persons' | 'organizations' | 'quotes' | 'activities' | 'lead' | 'person' | 'organization' | 'quote' | 'activity' | 'contacts' | 'contact';
export type WorkflowEvent = 'created' | 'updated' | 'deleted' | 'create' | 'update' | 'delete';

/** Flat entity data object (values from DB row) */
export type EntityData = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION VALIDATOR
// ─────────────────────────────────────────────────────────────────────────────

function getAttributeValue(condition: any, entity: EntityData): any {
  const field = condition.attribute || condition.field || condition.attribute_name;
  if (!field) return null;
  const lowerField = String(field).toLowerCase().trim();

  // Look up common CRM alias fields
  let val = entity[lowerField] ?? entity[field];
  if (val === undefined || val === null) {
    if (lowerField === 'stage_id' || lowerField === 'lead_pipeline_stage_id') {
      val = entity['lead_pipeline_stage_id'] ?? entity['stage_id'] ?? entity['stage_name'];
    } else if (lowerField === 'source_id' || lowerField === 'lead_source_id') {
      val = entity['lead_source_id'] ?? entity['source_id'] ?? entity['source_name'];
    } else if (lowerField === 'pipeline_id' || lowerField === 'lead_pipeline_id') {
      val = entity['lead_pipeline_id'] ?? entity['pipeline_id'] ?? entity['pipeline_name'];
    } else if (lowerField === 'type_id' || lowerField === 'lead_type_id' || lowerField === 'type') {
      val = entity['lead_type_id'] ?? entity['type_id'] ?? entity['type_name'] ?? entity['type'];
    } else if (lowerField === 'lead_value' || lowerField === 'value') {
      val = entity['lead_value'] ?? entity['value'] ?? entity['grand_total'];
    } else if (lowerField === 'user_id' || lowerField === 'assigned_to') {
      val = entity['user_id'] ?? entity['assigned_to'] ?? entity['user_name'];
    } else if (lowerField === 'name' || lowerField === 'title' || lowerField === 'subject') {
      val = entity['title'] ?? entity['name'] ?? entity['subject'];
    } else if (lowerField === 'emails' || lowerField === 'email') {
      val = entity['emails'] ?? entity['person_emails'] ?? entity['email'] ?? entity['person_email'];
    } else if (lowerField === 'contact_numbers' || lowerField === 'phone') {
      val = entity['contact_numbers'] ?? entity['person_contact_numbers'] ?? entity['phone'];
    } else if (lowerField === 'organization_id') {
      val = entity['organization_id'] ?? entity['organization_name'];
    }
  }

  if (['multiselect', 'checkbox'].includes(condition.attribute_type)) {
    return val ? String(val).split(',') : [];
  }
  return val ?? null;
}

function matchesCondition(condition: any, entity: EntityData): boolean {
  const attrVal = getAttributeValue(condition, entity);
  const condVal = condition.value;
  let op: string = (condition.operator || 'equals').toLowerCase().trim();

  // Handle empty / not empty checks
  if (op === 'is_empty') {
    return attrVal === undefined || attrVal === null || attrVal === '' || (Array.isArray(attrVal) && attrVal.length === 0);
  }
  if (op === 'is_not_empty') {
    return attrVal !== undefined && attrVal !== null && attrVal !== '' && (!Array.isArray(attrVal) || attrVal.length > 0);
  }

  // Normalize operator names from UI
  if (op === 'equals' || op === '=') op = '==';
  else if (op === 'not_equals' || op === '!=') op = '!=';
  else if (op === 'greater_than') op = '>';
  else if (op === 'greater_than_or_equal') op = '>=';
  else if (op === 'less_than') op = '<';
  else if (op === 'less_than_or_equal') op = '<=';
  else if (op === 'contains' || op === 'like' || op === 'ilike') op = '{}';

  // Boolean normalization
  if (typeof attrVal === 'boolean' || condVal === 'true' || condVal === 'false' || condVal === 'open' || condVal === 'closed') {
    const b1 = attrVal === true || String(attrVal).toLowerCase() === 'true' || String(attrVal).toLowerCase() === 'open' || String(attrVal).toLowerCase() === '1';
    const b2 = condVal === true || String(condVal).toLowerCase() === 'true' || String(condVal).toLowerCase() === 'open' || String(condVal).toLowerCase() === '1';
    if (op === '==' || op === 'equals') return b1 === b2;
    if (op === '!=' || op === 'not_equals') return b1 !== b2;
  }

  let result: boolean;

  switch (op) {
    case '==': {
      if (Array.isArray(condVal)) {
        result = Array.isArray(attrVal)
          ? attrVal.some((v) => condVal.includes(v))
          : condVal.includes(attrVal);
      } else if (Array.isArray(attrVal)) {
        result = attrVal.length === 1 && String(attrVal[0]).toLowerCase() === String(condVal).toLowerCase();
      } else {
        result = String(attrVal ?? '').trim().toLowerCase() === String(condVal ?? '').trim().toLowerCase();
      }
      break;
    }
    case '!=': {
      if (Array.isArray(condVal)) {
        result = !condVal.includes(attrVal);
      } else {
        result = String(attrVal ?? '').trim().toLowerCase() !== String(condVal ?? '').trim().toLowerCase();
      }
      break;
    }
    case '>':
      result = Number(attrVal) > Number(condVal);
      break;
    case '>=':
      result = Number(attrVal) >= Number(condVal);
      break;
    case '<':
      result = Number(attrVal) < Number(condVal);
      break;
    case '<=':
      result = Number(attrVal) <= Number(condVal);
      break;
    case '{}': {
      const haystack = Array.isArray(attrVal) ? attrVal.map(String).join(',') : String(attrVal ?? '');
      const needle = Array.isArray(condVal) ? condVal : [String(condVal)];
      result = needle.some((n) => haystack.toLowerCase().includes(String(n).toLowerCase()));
      break;
    }
    case 'starts_with':
      result = String(attrVal ?? '').toLowerCase().startsWith(String(condVal ?? '').toLowerCase());
      break;
    case 'ends_with':
      result = String(attrVal ?? '').toLowerCase().endsWith(String(condVal ?? '').toLowerCase());
      break;
    default:
      result = String(attrVal ?? '').toLowerCase().includes(String(condVal ?? '').toLowerCase());
  }

  return result;
}

function validateWorkflow(workflow: any, entity: EntityData): boolean {
  let conditions: any[] = workflow.conditions || [];
  if (typeof conditions === 'string') {
    try { conditions = JSON.parse(conditions); } catch { conditions = []; }
  }
  if (!conditions.length) return true;

  const valid = conditions.filter(
    (c) => (c.attribute || c.field || c.attribute_name) && (c.value !== undefined && c.value !== null && c.value !== '' || c.operator === 'is_empty' || c.operator === 'is_not_empty')
  );
  if (!valid.length) return true;

  if (String(workflow.condition_type).toLowerCase() === 'or') {
    return valid.some((c) => matchesCondition(c, entity));
  }
  // AND
  return valid.every((c) => matchesCondition(c, entity));
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ENRICHED ENTITY (Direct SQL queries with joins)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEntityData(entityType: string, entityId: number): Promise<EntityData | null> {
  try {
    const lowerType = String(entityType).toLowerCase().trim();

    if (lowerType === 'leads' || lowerType === 'lead') {
      const { rows } = await pool.query(
        `SELECT l.*,
                p.name AS person_name,
                p.emails AS person_emails,
                p.contact_numbers AS person_contact_numbers,
                o.name AS organization_name,
                u.name AS user_name,
                u.email AS user_email,
                s.name AS stage_name,
                src.name AS source_name,
                pipe.name AS pipeline_name,
                lt.name AS type_name
         FROM public.leads l
         LEFT JOIN public.persons p ON p.id = l.person_id
         LEFT JOIN public.organizations o ON o.id = l.organization_id
         LEFT JOIN public.users u ON u.id = l.user_id
         LEFT JOIN public.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
         LEFT JOIN public.lead_sources src ON src.id = l.lead_source_id
         LEFT JOIN public.lead_pipelines pipe ON pipe.id = l.lead_pipeline_id
         LEFT JOIN public.lead_types lt ON lt.id = l.lead_type_id
         WHERE l.id = $1`,
        [entityId]
      );
      return rows[0] || null;
    }

    if (lowerType === 'persons' || lowerType === 'person' || lowerType === 'contacts' || lowerType === 'contact') {
      const { rows } = await pool.query(
        `SELECT p.*,
                o.name AS organization_name,
                u.name AS user_name,
                u.email AS user_email
         FROM public.persons p
         LEFT JOIN public.organizations o ON o.id = p.organization_id
         LEFT JOIN public.users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [entityId]
      );
      return rows[0] || null;
    }

    if (lowerType === 'organizations' || lowerType === 'organization') {
      const { rows } = await pool.query(
        `SELECT o.*,
                u.name AS user_name,
                u.email AS user_email
         FROM public.organizations o
         LEFT JOIN public.users u ON u.id = o.user_id
         WHERE o.id = $1`,
        [entityId]
      );
      return rows[0] || null;
    }

    if (lowerType === 'quotes' || lowerType === 'quote') {
      const { rows } = await pool.query(
        `SELECT q.*,
                p.name AS person_name,
                p.emails AS person_emails,
                l.title AS lead_title,
                u.name AS user_name,
                u.email AS user_email
         FROM public.quotes q
         LEFT JOIN public.persons p ON p.id = q.person_id
         LEFT JOIN public.leads l ON l.id = q.lead_id
         LEFT JOIN public.users u ON u.id = q.user_id
         WHERE q.id = $1`,
        [entityId]
      );
      return rows[0] || null;
    }

    if (lowerType === 'activities' || lowerType === 'activity') {
      const { rows } = await pool.query(
        `SELECT a.*,
                u.name AS user_name,
                u.email AS user_email,
                la.lead_id,
                pa.person_id
         FROM public.activities a
         LEFT JOIN public.users u ON u.id = a.user_id
         LEFT JOIN public.lead_activities la ON la.activity_id = a.id
         LEFT JOIN public.person_activities pa ON pa.activity_id = a.id
         WHERE a.id = $1`,
        [entityId]
      );
      return rows[0] || null;
    }
  } catch (err: any) {
    logger.error({ err: err?.message, entityType, entityId }, '[WorkflowEngine] fetchEntityData failed');
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL RECIPIENT RESOLUTION HELPER
// ─────────────────────────────────────────────────────────────────────────────

function extractEmail(val: any): string | null {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

async function executeActions(
  actions: any[],
  entityType: string,
  entity: EntityData,
  user?: any
): Promise<void> {
  const normEntityType = entityType.toLowerCase().trim();

  for (const action of actions) {
    try {
      const actionKey = (action.action_type || action.id || '').toLowerCase().trim();

      switch (actionKey) {
        // ── 1. Send Email Actions ─────────────────────────────────────────────
        case 'send_email':
        case 'send_email_person':
        case 'send_email_to_person':
        case 'send_email_owner':
        case 'send_email_to_sales_owner':
        case 'send_email_participants':
        case 'send_email_to_participants':
        case 'email':
        case 'send_mail': {
          // Resolve template ID from target / value / template_id
          let templateId: number | null = null;
          if (action.target && !isNaN(Number(action.target)) && Number(action.target) > 0) {
            templateId = Number(action.target);
          } else if (action.value && !isNaN(Number(action.value)) && Number(action.value) > 0) {
            templateId = Number(action.value);
          } else if (action.template_id && !isNaN(Number(action.template_id))) {
            templateId = Number(action.template_id);
          }

          if (!templateId) {
            logger.warn({ action, entityType, entityId: entity.id }, '[WorkflowEngine] No valid template ID found in action');
            break;
          }

          const { rows: tRows } = await pool.query(
            `SELECT id, name, subject, content FROM public.email_templates WHERE id = $1`,
            [templateId]
          );
          const tmpl = tRows[0];
          if (!tmpl) {
            logger.warn({ templateId }, '[WorkflowEngine] Email template not found in DB');
            break;
          }

          // Build template context
          const ctxParams: any = { user };
          if (normEntityType.startsWith('lead')) {
            ctxParams.lead_id = entity.id;
            ctxParams.person_id = entity.person_id;
            ctxParams.organization_id = entity.organization_id;
          } else if (normEntityType.startsWith('person') || normEntityType.startsWith('contact')) {
            ctxParams.person_id = entity.id;
            ctxParams.organization_id = entity.organization_id;
          } else if (normEntityType.startsWith('quote')) {
            ctxParams.quote_id = entity.id;
            ctxParams.person_id = entity.person_id;
            ctxParams.lead_id = entity.lead_id;
            ctxParams.organization_id = entity.organization_id;
          } else if (normEntityType.startsWith('organization')) {
            ctxParams.organization_id = entity.id;
          } else if (normEntityType.startsWith('activit')) {
            ctxParams.activity_id = entity.id;
            ctxParams.lead_id = entity.lead_id;
            ctxParams.person_id = entity.person_id;
          }

          const ctx = await fetchTemplateContext(ctxParams);
          const rawSubject = tmpl.subject || tmpl.name || 'Automated Notification';
          const rawBody = tmpl.content || tmpl.subject || '';
          const parsedSubject = parsePlaceholders(rawSubject, ctx);
          const parsedBody = parsePlaceholders(rawBody, ctx);

          // Resolve recipient email address
          const isOwnerAction = actionKey === 'send_email_owner' || actionKey === 'send_email_to_sales_owner';
          const isParticipantsAction = actionKey === 'send_email_participants' || actionKey === 'send_email_to_participants';

          if (isParticipantsAction) {
            if (entity.id) {
              const { rows: pRows } = await pool.query(
                `SELECT COALESCE(u.email, (
                   CASE 
                     WHEN jsonb_typeof(p.emails::jsonb) = 'array' THEN p.emails->0->>'value'
                     ELSE p.emails::text 
                   END
                 )) as email
                 FROM public.activity_participants ap
                 LEFT JOIN public.users u ON u.id = ap.user_id
                 LEFT JOIN public.persons p ON p.id = ap.person_id
                 WHERE ap.activity_id = $1`,
                [entity.id]
              );
              for (const pr of pRows) {
                if (!pr.email) continue;
                await sendWorkflowEmail(pr.email, parsedSubject, parsedBody, {
                  lead_id: ctxParams.lead_id,
                  person_id: ctxParams.person_id,
                  quote_id: ctxParams.quote_id,
                  user_id: user?.id || entity.user_id || 1,
                });
              }
            }
            continue;
          }

          let toEmail: string | null = null;

          if (isOwnerAction) {
            if (entity.user_email) toEmail = entity.user_email;
            else if (entity.user_id) {
              const { rows: uRows } = await pool.query('SELECT email FROM public.users WHERE id = $1', [entity.user_id]);
              toEmail = uRows[0]?.email || null;
            } else if (ctx.user?.email) {
              toEmail = ctx.user.email;
            }
          } else {
            // Default or Person email
            const customVal = typeof action.value === 'string' ? action.value.trim() : '';
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customVal)) {
              toEmail = customVal;
            } else {
              toEmail = extractEmail(entity.person_emails) ||
                        extractEmail(entity.emails) ||
                        extractEmail(entity.person_email) ||
                        extractEmail(entity.email) ||
                        extractEmail(ctx.person?.emails) ||
                        extractEmail(ctx.person?.email);

              // Fallback DB lookup for Person
              if (!toEmail && ctxParams.person_id) {
                const { rows: pRows } = await pool.query('SELECT emails FROM public.persons WHERE id = $1', [ctxParams.person_id]);
                if (pRows[0]?.emails) toEmail = extractEmail(pRows[0].emails);
              }

              // Fallback DB lookup for Lead's Person
              if (!toEmail && ctxParams.lead_id) {
                const { rows: lpRows } = await pool.query(
                  'SELECT p.emails FROM public.leads l JOIN public.persons p ON p.id = l.person_id WHERE l.id = $1',
                  [ctxParams.lead_id]
                );
                if (lpRows[0]?.emails) toEmail = extractEmail(lpRows[0].emails);
              }
            }
          }

          if (toEmail) {
            await sendWorkflowEmail(toEmail, parsedSubject, parsedBody, {
              lead_id: ctxParams.lead_id,
              person_id: ctxParams.person_id,
              quote_id: ctxParams.quote_id,
              user_id: user?.id || entity.user_id || 1,
            });
          } else {
            logger.warn({ entityType, entityId: entity.id, actionKey }, '[WorkflowEngine] Could not resolve recipient email for workflow email action');
          }
          break;
        }

        // ── 2. Assign User Action ─────────────────────────────────────────────
        case 'assign_user': {
          const assignedUserId = Number(action.target || action.value);
          if (assignedUserId && entity.id) {
            const table = normEntityType.startsWith('lead') ? 'leads'
                        : normEntityType.startsWith('person') || normEntityType.startsWith('contact') ? 'persons'
                        : normEntityType.startsWith('quote') ? 'quotes'
                        : normEntityType.startsWith('organization') ? 'organizations'
                        : normEntityType.startsWith('activit') ? 'activities'
                        : null;
            if (table) {
              await pool.query(`UPDATE public.${table} SET user_id = $1, updated_at = NOW() WHERE id = $2`, [assignedUserId, entity.id]);
              logger.info({ table, entityId: entity.id, assignedUserId }, '[WorkflowEngine] assign_user executed successfully');
            }
          }
          break;
        }

        // ── 3. Update Lead Action ─────────────────────────────────────────────
        case 'update_lead':
        case 'update_related_leads':
        case 'update_attribute': {
          const field = (action.target || '').toLowerCase().trim();
          const val = action.value;
          const leadId = normEntityType.startsWith('lead') ? entity.id : (entity.lead_id || null);

          if (field && val !== undefined && leadId) {
            if (field === 'stage_id' || field === 'lead_pipeline_stage_id') {
              const stageId = Number(val);
              if (!isNaN(stageId)) {
                await pool.query('UPDATE public.leads SET lead_pipeline_stage_id = $1, updated_at = NOW() WHERE id = $2', [stageId, leadId]);
                logger.info({ leadId, stageId }, '[WorkflowEngine] updated lead stage');
              }
            } else {
              let col = field;
              if (col === 'source_id') col = 'lead_source_id';
              if (col === 'type_id') col = 'lead_type_id';
              if (col === 'pipeline_id') col = 'lead_pipeline_id';

              const allowedCols = ['status', 'lead_source_id', 'lead_type_id', 'lead_pipeline_id', 'lead_value', 'title', 'description', 'user_id', 'organization_id', 'person_id'];
              if (allowedCols.includes(col)) {
                let valToSet: any = val;
                if (col === 'status') {
                  valToSet = val === 'open' || val === 'true' || val === true || val === 1 || val === '1';
                }
                await pool.query(`UPDATE public.leads SET ${col} = $1, updated_at = NOW() WHERE id = $2`, [valToSet, leadId]);
                logger.info({ leadId, col, valToSet }, '[WorkflowEngine] update_lead executed successfully');
              }
            }
          }
          break;
        }

        // ── 4. Update Person Action ───────────────────────────────────────────
        case 'update_person': {
          const field = (action.target || '').toLowerCase().trim();
          const val = action.value;
          const personId = normEntityType.startsWith('person') || normEntityType.startsWith('contact') ? entity.id : (entity.person_id || null);

          if (field && val !== undefined && personId) {
            const allowedCols = ['name', 'user_id', 'organization_id', 'job_title', 'is_vip'];
            if (allowedCols.includes(field)) {
              await pool.query(`UPDATE public.persons SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [val, personId]);
              logger.info({ personId, field, val }, '[WorkflowEngine] update_person executed successfully');
            }
          }
          break;
        }

        // ── 5. Update Quote Action ────────────────────────────────────────────
        case 'update_quote': {
          const field = (action.target || '').toLowerCase().trim();
          const val = action.value;
          const quoteId = normEntityType.startsWith('quote') ? entity.id : (entity.quote_id || null);

          if (field && val !== undefined && quoteId) {
            const allowedCols = ['subject', 'description', 'user_id', 'person_id', 'lead_id', 'grand_total', 'sub_total', 'tax_amount', 'discount_amount'];
            if (allowedCols.includes(field)) {
              await pool.query(`UPDATE public.quotes SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [val, quoteId]);
              logger.info({ quoteId, field, val }, '[WorkflowEngine] update_quote executed successfully');
            }
          }
          break;
        }

        // ── 6. Add Tag Action ─────────────────────────────────────────────────
        case 'add_tag': {
          const tagVal = String(action.target || action.value || '').trim();
          if (tagVal && entity.id) {
            let tagId = Number(tagVal);
            if (isNaN(tagId)) {
              const { rows: tRows } = await pool.query('SELECT id FROM public.tags WHERE LOWER(name) = LOWER($1)', [tagVal]);
              if (tRows[0]) {
                tagId = tRows[0].id;
              } else {
                const { rows: nRows } = await pool.query(
                  'INSERT INTO public.tags (name, color, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id',
                  [tagVal, '#0088cc']
                );
                tagId = nRows[0]?.id;
              }
            }

            if (tagId) {
              const targetType = normEntityType.startsWith('person') ? 'person' : 'lead';
              const targetId = normEntityType.startsWith('person') ? entity.id : (entity.lead_id || entity.id);
              const existingTags = await TagService.getEntityTags(targetType, targetId);
              const existingIds = (existingTags || []).map((t: any) => Number(t.id)).filter(Boolean);
              if (!existingIds.includes(tagId)) {
                await TagService.saveEntityTags(targetType, targetId, [...existingIds, tagId]);
                logger.info({ targetType, targetId, tagId }, '[WorkflowEngine] add_tag executed successfully');
              }
            }
          }
          break;
        }

        // ── 7. Add Activity / Note Action ─────────────────────────────────────
        case 'add_note_activity':
        case 'add_note_as_activity':
        case 'create_activity': {
          const comment = String(action.value || action.target || 'Activity created by workflow automation');
          const validTypes = ['call', 'meeting', 'task', 'email', 'lunch', 'note'];
          const rawTarget = String(action.target || '').toLowerCase();
          const actType = validTypes.includes(rawTarget) ? rawTarget : 'note';

          const isLead = normEntityType.startsWith('lead');
          const isPerson = normEntityType.startsWith('person');
          const leadId = isLead ? entity.id : (entity.lead_id || null);
          const personId = isPerson ? entity.id : (entity.person_id || null);
          const userId = entity.user_id || user?.id || 1;

          const { rows: actRows } = await pool.query(
            `INSERT INTO public.activities (title, type, comment, is_done, user_id, created_at, updated_at)
             VALUES ($1, $2, $3, true, $4, NOW(), NOW())
             RETURNING id`,
            [`Workflow: ${comment.slice(0, 60)}`, actType, comment, userId]
          );

          const actId = actRows[0]?.id;
          if (actId) {
            if (leadId) {
              await pool.query(
                `INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [leadId, actId]
              );
            }
            if (personId) {
              await pool.query(
                `INSERT INTO public.person_activities (person_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [personId, actId]
              );
            }
            logger.info({ actId, leadId, personId }, '[WorkflowEngine] create_activity executed successfully');
          }
          break;
        }

        // ── 8. Webhook Action ─────────────────────────────────────────────────
        case 'trigger_webhook': {
          const webhookId = action.target || action.value;
          if (!webhookId) break;

          let wh: any = null;
          if (!isNaN(Number(webhookId))) {
            const { rows: wRows } = await pool.query(
              `SELECT id, name, method, end_point, headers, query_params, payload_type, raw_payload_type, payload
               FROM public.webhooks WHERE id = $1`,
              [Number(webhookId)]
            );
            wh = wRows[0];
          } else if (typeof webhookId === 'string' && webhookId.startsWith('http')) {
            wh = {
              name: 'Direct URL Webhook',
              method: 'POST',
              end_point: webhookId,
              headers: [],
              query_params: [],
              payload_type: 'default',
              raw_payload_type: 'json',
              payload: {},
            };
          }

          if (wh) {
            let basePayload = wh.payload || {};
            if (typeof basePayload === 'string') {
              try { basePayload = JSON.parse(basePayload); } catch { basePayload = {}; }
            }

            const entityCtx = buildSimpleContext(entityType, entity);
            const resolvedEndpoint = replacePlaceholdersSimple(wh.end_point, entityCtx);
            const resolvedPayload = wh.payload_type === 'default'
              ? { ...entityCtx, ...basePayload }
              : basePayload;

            const result = await fireWebhook({
              method: wh.method || 'POST',
              end_point: resolvedEndpoint,
              headers: wh.headers || [],
              query_params: wh.query_params || [],
              payload_type: wh.payload_type || 'default',
              raw_payload_type: wh.raw_payload_type || 'json',
              payload: resolvedPayload,
            });

            logger.info({ webhookId, webhookName: wh.name, result }, '[WorkflowEngine] trigger_webhook executed successfully');
          }
          break;
        }

        default:
          logger.debug({ actionKey }, '[WorkflowEngine] Unknown action, skipping');
      }
    } catch (err: any) {
      logger.error({ err: err?.message, action }, '[WorkflowEngine] Action failed');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build a flat context map from entity for simple placeholder replacement in URLs / payloads */
function buildSimpleContext(entityType: string, entity: EntityData): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      ctx[`${entityType}.${k}`] = String(v);
      ctx[k] = String(v);
    }
  }
  return ctx;
}

/** Simple {%key%} replacement in a string */
function replacePlaceholdersSimple(str: string, ctx: Record<string, string>): string {
  return str.replace(/\{%\s*([a-zA-Z0-9_.]+)\s*%\}/g, (_, key) => ctx[key] ?? '');
}

/** Send email via SMTP mailer and log to database emails table */
async function sendWorkflowEmail(
  to: string,
  subject: string,
  body: string,
  meta?: { lead_id?: number | null; person_id?: number | null; quote_id?: number | null; user_id?: number | null }
): Promise<void> {
  try {
    const sent = await sendRealMail({ to, subject, html: body, text: body });
    logger.info({ to, subject, sent }, '[WorkflowEngine] Workflow email dispatch attempted');

    // Record in database emails table
    try {
      const fromEmail = { name: 'CRM Automation', email: 'automation@crm.local' };
      const uniqueId = `wf_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await pool.query(
        `INSERT INTO public.emails (
          subject, source, user_type, name, reply, is_read, folders,
          from_email, sender, reply_to, cc, bcc, unique_id, message_id,
          person_id, lead_id, user_id, created_at, updated_at
        ) VALUES (
          $1, 'workflow', 'admin', 'Workflow Automation', $2, true, '["sent"]'::jsonb,
          $3, $3, $4, '[]'::jsonb, '[]'::jsonb, $5, $6,
          $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        [
          subject,
          body,
          JSON.stringify(fromEmail),
          JSON.stringify([to]),
          uniqueId,
          `<${uniqueId}@crm.local>`,
          meta?.person_id || null,
          meta?.lead_id || null,
          meta?.user_id || 1,
        ]
      );
    } catch (dbErr: any) {
      logger.warn('[WorkflowEngine] Could not record email to DB: ' + dbErr?.message);
    }
  } catch (err: any) {
    logger.error({ err: err?.message, to }, '[WorkflowEngine] sendWorkflowEmail failed');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this after any CRM entity create/update/delete.
 *
 * @param entityType  'leads' | 'persons' | 'activities' | 'quotes' | 'organizations'
 * @param event       'created' | 'updated' | 'deleted'
 * @param entityId    The DB id of the entity
 * @param user        The logged-in user object (from req.user), optional
 */
export async function processWorkflowsForEvent(
  entityType: WorkflowEntityType,
  event: WorkflowEvent,
  entityId: number,
  user?: any
): Promise<void> {
  try {
    const rawType = String(entityType).toLowerCase().trim();
    const cleanEvent = String(event).toLowerCase().trim();

    // Map all entity type aliases
    const aliases = [rawType];
    if (rawType === 'lead' || rawType === 'leads') aliases.push('lead', 'leads');
    if (rawType === 'person' || rawType === 'persons' || rawType === 'contact' || rawType === 'contacts') aliases.push('person', 'persons', 'contact', 'contacts');
    if (rawType === 'organization' || rawType === 'organizations') aliases.push('organization', 'organizations');
    if (rawType === 'quote' || rawType === 'quotes') aliases.push('quote', 'quotes');
    if (rawType === 'activity' || rawType === 'activities') aliases.push('activity', 'activities');

    // 1. Find all matching workflows for this entityType
    const { rows: allWorkflows } = await pool.query(
      `SELECT id, name, entity_type, event, condition_type, conditions, actions
       FROM public.workflows
       WHERE LOWER(entity_type) = ANY($1::text[])`,
      [aliases]
    );

    // Filter event flexibly (supports 'create', 'created', 'activity.create.after', 'update', 'updated', etc.)
    const workflows = allWorkflows.filter((wf: any) => {
      const e = String(wf.event || '').toLowerCase().trim();
      if (cleanEvent === 'created' || cleanEvent === 'create') {
        return e === 'created' || e === 'create' || e.includes('create');
      }
      if (cleanEvent === 'updated' || cleanEvent === 'update') {
        return e === 'updated' || e === 'update' || e.includes('update');
      }
      if (cleanEvent === 'deleted' || cleanEvent === 'delete') {
        return e === 'deleted' || e === 'delete' || e.includes('delete');
      }
      return e === cleanEvent;
    });

    if (!workflows.length) return;

    // 2. Fetch enriched entity data for condition evaluation
    const entity = await fetchEntityData(entityType, entityId);
    if (!entity) {
      logger.warn({ entityType, entityId }, '[WorkflowEngine] Entity not found for workflow processing');
      return;
    }

    logger.info(
      { entityType, event, entityId, workflowCount: workflows.length },
      '[WorkflowEngine] Processing matching workflows'
    );

    // 3. Evaluate each workflow
    for (const wf of workflows) {
      try {
        let conditions = wf.conditions || [];
        if (typeof conditions === 'string') {
          try { conditions = JSON.parse(conditions); } catch { conditions = []; }
        }
        let actions = wf.actions || [];
        if (typeof actions === 'string') {
          try { actions = JSON.parse(actions); } catch { actions = []; }
        }

        const passes = validateWorkflow({ ...wf, conditions }, entity);
        if (!passes) {
          logger.debug({ workflowId: wf.id, workflowName: wf.name }, '[WorkflowEngine] Conditions not met, skipping');
          continue;
        }

        logger.info({ workflowId: wf.id, workflowName: wf.name }, '[WorkflowEngine] Conditions passed, executing actions');
        // Run actions in the background
        executeActions(actions, entityType, entity, user).catch((err) => {
          logger.error({ err: err?.message, workflowId: wf.id }, '[WorkflowEngine] executeActions error');
        });
      } catch (err: any) {
        logger.error({ err: err?.message, workflowId: wf.id }, '[WorkflowEngine] Workflow evaluation error');
      }
    }
  } catch (err: any) {
    logger.error({ err: err?.message, entityType, event, entityId }, '[WorkflowEngine] processWorkflowsForEvent failed');
  }
}
