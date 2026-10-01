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

async function executeActions(
  actions: any[],
  entityType: WorkflowEntityType,
  entity: EntityData,
  user?: any
): Promise<void> {
  for (const action of actions) {
    try {
      const actionKey = (action.id || action.action_type || '').toLowerCase();
      const actionVal = action.value || action.target;

      switch (actionKey) {
        // ── Send email via email template ─────────────────────────────────────
        case 'send_email':
        case 'send_email_to_person':
        case 'send_email_to_sales_owner':
        case 'send_email_to_participants': {
          const templateId = actionVal;
          if (!templateId) break;

          const { rows: tRows } = await pool.query(
            `SELECT id, name, subject, content FROM public.email_templates WHERE id = $1`,
            [Number(templateId)]
          );
          const tmpl = tRows[0];
          if (!tmpl) break;

          // Build context from entity
          const ctxParams: any = { user };
          if (entityType === 'leads') {
            ctxParams.lead_id = entity.id;
            ctxParams.person_id = entity.person_id;
          } else if (entityType === 'persons') {
            ctxParams.person_id = entity.id;
          } else if (entityType === 'activities') {
            // Look up which lead this activity belongs to
            const { rows: laRows } = await pool.query(
              `SELECT lead_id FROM public.lead_activities WHERE activity_id = $1 LIMIT 1`,
              [entity.id]
            );
            ctxParams.lead_id = laRows[0]?.lead_id;
          }

          const ctx = await fetchTemplateContext(ctxParams);
          const parsedSubject = parsePlaceholders(tmpl.subject, ctx);
          const parsedBody = parsePlaceholders(tmpl.content, ctx);

          // Resolve recipient email
          let toEmail: string | null = null;
          if (actionKey === 'send_email_to_sales_owner') {
            toEmail = entity.user_email || ctx.user?.email || null;
          } else if (actionKey === 'send_email_to_participants') {
            // For activities: send to all participants via their emails
            if (entity.id) {
              const { rows: pRows } = await pool.query(
                `SELECT COALESCE(u.email, p.emails->>0) as email
                 FROM public.activity_participants ap
                 LEFT JOIN public.users u ON u.id = ap.user_id
                 LEFT JOIN public.persons p ON p.id = ap.person_id
                 WHERE ap.activity_id = $1`,
                [entity.id]
              );
              for (const pr of pRows) {
                if (!pr.email) continue;
                await sendWorkflowEmail(pr.email, parsedSubject, parsedBody);
              }
            }
            continue;
          } else {
            // send_email_to_person or send_email
            const rawEmails = entity.emails || ctx.person?.emails;
            if (rawEmails) {
              try {
                const parsed = typeof rawEmails === 'string' ? JSON.parse(rawEmails) : rawEmails;
                toEmail = Array.isArray(parsed) ? parsed[0]?.value : null;
              } catch { toEmail = null; }
            }
            if (!toEmail && (entity.user_email || ctx.user?.email)) {
              toEmail = entity.user_email || ctx.user?.email || null;
            }
          }

          if (toEmail) {
            await sendWorkflowEmail(toEmail, parsedSubject, parsedBody);
          }
          break;
        }

        // ── Add a note activity ────────────────────────────────────────────────
        case 'add_note_as_activity':
        case 'create_activity': {
          if (entityType !== 'leads') break;
          const comment = String(actionVal || 'Activity created by workflow automation');
          const { rows: actRows } = await pool.query(
            `INSERT INTO public.activities (title, type, comment, is_done, user_id, created_at, updated_at)
             VALUES ($1, 'note', $2, true, $3, NOW(), NOW())
             RETURNING id`,
            [`Workflow: ${comment.slice(0, 60)}`, comment, user?.id || null]
          );
          const actId = actRows[0]?.id;
          if (actId && entity.id) {
            await pool.query(
              `INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [entity.id, actId]
            );
          }
          logger.info({ leadId: entity.id, actId }, '[WorkflowEngine] add_note_as_activity done');
          break;
        }

        // ── Fire Webhook ─────────────────────────────────────────────────────
        case 'trigger_webhook': {
          const webhookId = actionVal;
          if (!webhookId) break;

          const { rows: wRows } = await pool.query(
            `SELECT id, name, method, end_point, headers, query_params, payload_type, raw_payload_type, payload
             FROM public.webhooks WHERE id = $1`,
            [Number(webhookId)]
          );
          const wh = wRows[0];
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
            ? { ...entityCtx, ...basePayload }   // default: entity data + custom overrides
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

/** Send email via the existing mailer utility */
async function sendWorkflowEmail(to: string, subject: string, body: string): Promise<void> {
  try {
    const { sendRealMail } = await import('@/utils/mailer');
    await sendRealMail({ to, subject, html: body });
    logger.info({ to, subject }, '[WorkflowEngine] Email sent');
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
