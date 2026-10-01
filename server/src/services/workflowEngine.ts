/**
 * Workflow Engine — mirrors Laravel's Automation package flow:
 *   Listener/Entity.php  →  Validator.php  →  Entity/Lead|Activity|Person|Quote.php#executeActions()
 *
 * Responsibilities:
 *  1. processWorkflowsForEvent(entityType, event, entity, user)
 *     - Loads matching workflows from DB
 *     - Validates conditions (AND / OR)
 *     - Executes actions (send_email, trigger_webhook, add_note_as_activity)
 */

import { pool } from '@/config/db';
import { logger } from '@/utils/logger';
import { fireWebhook } from '@/utils/webhookRunner';
import { fetchTemplateContext, parsePlaceholders } from '@/utils/templateParser';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowEntityType = 'leads' | 'persons' | 'organizations' | 'quotes' | 'activities';
export type WorkflowEvent = 'created' | 'updated' | 'deleted';

/** Flat entity data object (values from DB row) */
export type EntityData = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// CONDITION VALIDATOR
// Matches Laravel's Validator.php
// ─────────────────────────────────────────────────────────────────────────────

function getAttributeValue(condition: any, entity: EntityData): any {
  const field = condition.attribute || condition.field;
  if (!field) return null;
  const val = entity[field];
  if (['multiselect', 'checkbox'].includes(condition.attribute_type)) {
    return val ? String(val).split(',') : [];
  }
  return val ?? null;
}

function matchesCondition(condition: any, entity: EntityData): boolean {
  const attrVal = getAttributeValue(condition, entity);
  const condVal = condition.value;
  let op: string = (condition.operator || '==').toLowerCase();

  // Normalize operator names from UI
  if (op === 'equals') op = '==';
  else if (op === 'not_equals') op = '!=';
  else if (op === 'greater_than') op = '>';
  else if (op === 'less_than') op = '<';
  else if (op === 'contains') op = '{}';

  let result: boolean;

  switch (op) {
    case '==':
    case '!=': {
      if (Array.isArray(condVal)) {
        result = Array.isArray(attrVal)
          ? attrVal.some((v) => condVal.includes(v))
          : condVal.includes(attrVal);
      } else if (Array.isArray(attrVal)) {
        result = attrVal.length === 1 && String(attrVal[0]) === String(condVal);
      } else {
        result = String(attrVal ?? '') === String(condVal ?? '');
      }
      break;
    }
    case '<=':
    case '>':
      result = Number(attrVal) <= Number(condVal);
      break;
    case '>=':
    case '<':
      result = Number(attrVal) >= Number(condVal);
      break;
    case '{}':
    case '!{}': {
      const haystack = Array.isArray(attrVal) ? attrVal.map(String).join(',') : String(attrVal ?? '');
      const needle = Array.isArray(condVal) ? condVal : [String(condVal)];
      result = needle.some((n) => haystack.toLowerCase().includes(String(n).toLowerCase()));
      break;
    }
    default:
      result = true;
  }

  // Negate for inverse operators
  if (['!=', '>', '<', '!{}'].includes(op)) result = !result;
  return result;
}

function validateWorkflow(workflow: any, entity: EntityData): boolean {
  const conditions: any[] = workflow.conditions || [];
  if (!conditions.length) return true;

  const valid = conditions.filter(
    (c) => (c.attribute || c.field) && c.value !== undefined && c.value !== null && c.value !== ''
  );
  if (!valid.length) return true;

  if (workflow.condition_type === 'or') {
    return valid.some((c) => matchesCondition(c, entity));
  }
  // AND
  return valid.every((c) => matchesCondition(c, entity));
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH ENRICHED ENTITY (full data from DB for condition matching)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEntityData(entityType: WorkflowEntityType, entityId: number): Promise<EntityData | null> {
  try {
    const { rows } = await pool.query(
      'SELECT public.fn_get_entity_for_workflow($1, $2) as entity',
      [entityType, entityId]
    );
    const entity = rows[0]?.entity;
    if (entity && Object.keys(entity).length > 0) {
      return entity;
    }
  } catch (err: any) {
    logger.error({ err: err?.message, entityType, entityId }, '[WorkflowEngine] fetchEntityData failed');
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ACTION EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

async function executeActions(
  actions: any[],
  entityType: WorkflowEntityType,
  entity: EntityData,
  user?: any
): Promise<void> {
  for (const action of actions) {
    try {
      const actionKey = (action.id || action.action_type || '').toLowerCase();

      switch (actionKey) {
        // ── Send email via email template ─────────────────────────────────────
        case 'send_email':
        case 'send_email_to_person':
        case 'send_email_to_sales_owner':
        case 'send_email_to_participants':
        case 'email':
        case 'send_mail': {
          // Template ID can be in action.target or action.value or action.template_id
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

          // Build context from entity
          const ctxParams: any = { user };
          if (entityType === 'leads') {
            ctxParams.lead_id = entity.id;
            ctxParams.person_id = entity.person_id;
            ctxParams.organization_id = entity.organization_id;
          } else if (entityType === 'persons') {
            ctxParams.person_id = entity.id;
            ctxParams.organization_id = entity.organization_id;
          } else if (entityType === 'quotes') {
            ctxParams.quote_id = entity.id;
            ctxParams.person_id = entity.person_id;
            ctxParams.lead_id = entity.lead_id;
            ctxParams.organization_id = entity.organization_id;
          } else if (entityType === 'organizations') {
            ctxParams.organization_id = entity.id;
          } else if (entityType === 'activities') {
            ctxParams.activity_id = entity.id;
            // Look up which lead this activity belongs to
            const { rows: laRows } = await pool.query(
              `SELECT lead_id FROM public.lead_activities WHERE activity_id = $1 LIMIT 1`,
              [entity.id]
            );
            ctxParams.lead_id = laRows[0]?.lead_id;
          }

          const ctx = await fetchTemplateContext(ctxParams);
          const parsedSubject = parsePlaceholders(tmpl.subject || '(No Subject)', ctx);
          const parsedBody = parsePlaceholders(tmpl.content || '', ctx);

          // Resolve recipient specification
          let recipientSpec = '';
          if (action.value && isNaN(Number(action.value))) {
            recipientSpec = String(action.value).trim();
          } else if (action.target && isNaN(Number(action.target))) {
            recipientSpec = String(action.target).trim();
          }
          const recLower = recipientSpec.toLowerCase();

          // Resolve recipient email
          let toEmail: string | null = null;
          if (actionKey === 'send_email_to_sales_owner' || recLower === 'sales_owner' || recLower === 'sales_person' || recLower === 'user_email') {
            toEmail = entity.user_email || ctx.user?.email || null;
          } else if (actionKey === 'send_email_to_participants' || recLower === 'participants') {
            // For activities: send to all participants via their emails
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
                });
              }
            }
            continue;
          } else if (recipientSpec.includes('@')) {
            toEmail = recipientSpec;
          } else {
            // Default: Contact / Person email
            const rawEmails = entity.person_emails || entity.emails || (ctx.person?.emails ? ctx.person.emails : null);
            if (rawEmails) {
              if (typeof rawEmails === 'string') {
                try {
                  const parsed = JSON.parse(rawEmails);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    toEmail = typeof parsed[0] === 'object' ? (parsed[0].value || parsed[0].email) : String(parsed[0]);
                  } else {
                    toEmail = rawEmails;
                  }
                } catch {
                  toEmail = rawEmails.replace(/[\[\]"']/g, '').trim();
                }
              } else if (Array.isArray(rawEmails) && rawEmails.length > 0) {
                toEmail = typeof rawEmails[0] === 'object' ? (rawEmails[0].value || rawEmails[0].email) : String(rawEmails[0]);
              }
            }

            if (!toEmail && entity.person_email) {
              toEmail = entity.person_email;
            }
            if (!toEmail && ctx.person?.email) {
              toEmail = ctx.person.email;
            }
            if (!toEmail && (entity.user_email || ctx.user?.email)) {
              toEmail = entity.user_email || ctx.user?.email || null;
            }
          }

          if (toEmail) {
            await sendWorkflowEmail(toEmail, parsedSubject, parsedBody, {
              lead_id: ctxParams.lead_id,
              person_id: ctxParams.person_id,
              quote_id: ctxParams.quote_id,
            });
          } else {
            logger.warn({ entityType, entityId: entity.id, action }, '[WorkflowEngine] Could not resolve recipient email for workflow send_email');
          }
          break;
        }

        // ── Assign User ───────────────────────────────────────────────────────
        case 'assign_user': {
          let assignedUserId: number | null = null;
          if (action.target && !isNaN(Number(action.target))) assignedUserId = Number(action.target);
          else if (action.value && !isNaN(Number(action.value))) assignedUserId = Number(action.value);

          if (assignedUserId && entity.id) {
            const table = entityType.toLowerCase();
            if (['leads', 'persons', 'organizations', 'quotes', 'activities'].includes(table)) {
              await pool.query(`UPDATE public.${table} SET user_id = $1, updated_at = NOW() WHERE id = $2`, [assignedUserId, entity.id]);
              logger.info({ table, entityId: entity.id, assignedUserId }, '[WorkflowEngine] assign_user done');
            }
          }
          break;
        }

        // ── Update Attribute ─────────────────────────────────────────────────
        case 'update_attribute': {
          const field = action.target;
          const val = action.value;
          if (field && val !== undefined && entity.id) {
            const table = entityType.toLowerCase();
            if (['leads', 'persons', 'organizations', 'quotes'].includes(table)) {
              await pool.query(`UPDATE public.${table} SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [val, entity.id]);
              logger.info({ table, entityId: entity.id, field, val }, '[WorkflowEngine] update_attribute done');
            }
          }
          break;
        }

        // ── Add a note activity ────────────────────────────────────────────────
        case 'add_note_as_activity':
        case 'create_activity': {
          const comment = String(action.value || action.target || 'Activity created by workflow automation');
          const actType = (action.target && !action.target.startsWith('http') && action.target.length < 20) ? action.target : 'note';

          const { rows: actRows } = await pool.query(
            `INSERT INTO public.activities (title, type, comment, is_done, user_id, created_at, updated_at)
             VALUES ($1, $2, $3, true, $4, NOW(), NOW())
             RETURNING id`,
            [`Workflow: ${comment.slice(0, 60)}`, actType, comment, user?.id || null]
          );
          const actId = actRows[0]?.id;
          if (actId && entity.id) {
            if (entityType === 'leads') {
              await pool.query(
                `INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [entity.id, actId]
              );
            } else if (entityType === 'persons') {
              await pool.query(
                `INSERT INTO public.person_activities (person_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [entity.id, actId]
              );
            }
          }
          logger.info({ entityType, entityId: entity.id, actId }, '[WorkflowEngine] create_activity done');
          break;
        }

        // ── Fire Webhook ─────────────────────────────────────────────────────
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

          if (!wh) {
            logger.warn({ webhookId }, '[WorkflowEngine] Webhook not found');
            break;
          }

          // Build the payload = entity data merged with any custom payload
          let basePayload = wh.payload || {};
          if (typeof basePayload === 'string') {
            try { basePayload = JSON.parse(basePayload); } catch { basePayload = {}; }
          }

          // Replace {%field%} placeholders in the endpoint, payload, and headers using entity data
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

          logger.info({ webhookId, webhookName: wh.name, result }, '[WorkflowEngine] trigger_webhook done');
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
function buildSimpleContext(entityType: WorkflowEntityType, entity: EntityData): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      ctx[`${entityType}.${k}`] = String(v);
      ctx[k] = String(v); // also expose bare keys
    }
  }
  return ctx;
}

/** Simple {%key%} replacement in a string */
function replacePlaceholdersSimple(str: string, ctx: Record<string, string>): string {
  return str.replace(/\{%\s*([a-zA-Z0-9_.]+)\s*%\}/g, (_, key) => ctx[key] ?? '');
}

/** Send email via the existing mailer utility and log to emails table */
async function sendWorkflowEmail(
  to: string,
  subject: string,
  body: string,
  meta?: { lead_id?: number | null; person_id?: number | null; quote_id?: number | null }
): Promise<void> {
  try {
    const { sendRealMail } = await import('@/utils/mailer');
    const sent = await sendRealMail({ to, subject, html: body, text: body });
    logger.info({ to, subject, sent }, '[WorkflowEngine] Workflow email dispatch attempted');

    // Record in database emails table
    try {
      const fromEmail = { name: 'CRM Automation', email: 'automation@crm.local' };
      const uniqueId = `wf_email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await pool.query(
        `INSERT INTO public.emails (
          subject, source, user_type, name, reply, is_read, folders,
          from_email, sender, reply_to, unique_id, message_id,
          person_id, lead_id, created_at, updated_at
        ) VALUES (
          $1, 'workflow', 'admin', $2, $3, true, '["sent"]'::jsonb,
          $4, $4, $5, $6, $7,
          $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )`,
        [
          subject,
          'Workflow Automation',
          body,
          JSON.stringify(fromEmail),
          JSON.stringify([to]),
          uniqueId,
          `<${uniqueId}@crm.local>`,
          meta?.person_id || null,
          meta?.lead_id || null,
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
    const lowerType = entityType.toLowerCase();
    const altType = lowerType.endsWith('s') ? lowerType.slice(0, -1) : `${lowerType}s`;

    // 1. Find all matching workflows for this entityType
    const { rows: allWorkflows } = await pool.query(
      `SELECT id, name, entity_type, event, condition_type, conditions, actions
       FROM public.workflows
       WHERE LOWER(entity_type) = $1 OR LOWER(entity_type) = $2`,
      [lowerType, altType]
    );

    // Filter event flexibly (supports 'create', 'created', 'activity.create.after', etc.)
    const workflows = allWorkflows.filter((wf: any) => {
      const e = String(wf.event || '').toLowerCase();
      if (event === 'created') return e === 'created' || e === 'create' || e.includes('create');
      if (event === 'updated') return e === 'updated' || e === 'update' || e.includes('update');
      if (event === 'deleted') return e === 'deleted' || e === 'delete' || e.includes('delete');
      return e === event;
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
      '[WorkflowEngine] Processing workflows'
    );

    // 3. Evaluate each workflow
    for (const wf of workflows) {
      try {
        const conditions = Array.isArray(wf.conditions) ? wf.conditions : [];
        const actions = Array.isArray(wf.actions) ? wf.actions : [];

        const passes = validateWorkflow({ ...wf, conditions }, entity);
        if (!passes) {
          logger.debug({ workflowId: wf.id, workflowName: wf.name }, '[WorkflowEngine] Conditions not met, skipping');
          continue;
        }

        logger.info({ workflowId: wf.id, workflowName: wf.name }, '[WorkflowEngine] Conditions passed, executing actions');
        // Run actions in the background (don't block the HTTP response)
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
