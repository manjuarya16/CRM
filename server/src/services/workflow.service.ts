import { pool } from '@/config/db';
import { IWorkflow } from '@/interfaces/crm.interface';
import { logger } from '@/utils/logger';

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
  public static async triggerWorkflows(entityType: string, event: string, data: any): Promise<void> {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM workflows WHERE LOWER(entity_type) = LOWER($1) AND LOWER(event) = LOWER($2)`,
        [entityType, event]
      );

      if (!rows || rows.length === 0) return;

      for (const wf of rows) {
        const condType = wf.condition_type || 'and';
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
            await this.executeAction(action, data);
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
      const fieldVal = data[c.field];
      const targetVal = c.value;
      if (fieldVal === undefined || fieldVal === null) return false;

      switch (c.operator) {
        case 'equals':
          return String(fieldVal).toLowerCase() === String(targetVal).toLowerCase();
        case 'not_equals':
          return String(fieldVal).toLowerCase() !== String(targetVal).toLowerCase();
        case 'greater_than':
          return Number(fieldVal) > Number(targetVal);
        case 'less_than':
          return Number(fieldVal) < Number(targetVal);
        case 'contains':
          return String(fieldVal).toLowerCase().includes(String(targetVal).toLowerCase());
        case 'is_empty':
          return fieldVal === '' || fieldVal === null;
        case 'is_not_empty':
          return fieldVal !== '' && fieldVal !== null;
        default:
          return true;
      }
    });

    return condType === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  private static async executeAction(action: any, data: any): Promise<void> {
    try {
      const { action_type, target, value } = action;
      const entityId = data.id || data.lead_id;

      if (action_type === 'trigger_webhook' && target) {
        await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_data: data, triggered_at: new Date().toISOString() }),
        }).catch(() => {});
      } else if (action_type === 'create_activity' && entityId) {
        await pool.query(
          `INSERT INTO activities (title, type, comment, lead_id, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [value || 'Automated Workflow Activity', target || 'call', `Triggered by workflow rule for ID ${entityId}`, entityId]
        ).catch(() => {});
      } else if (action_type === 'assign_user' && target && entityId) {
        const userId = Number(target);
        if (Number.isFinite(userId)) {
          await pool.query(
            `UPDATE leads SET user_id = $1, updated_at = NOW() WHERE id = $2`,
            [userId, entityId]
          ).catch(() => {});
        }
      } else if (action_type === 'update_attribute' && target && value !== undefined && entityId) {
        // Sanitize column name to allow common fields only
        const allowedColumns = ['status', 'stage_id', 'source_id', 'lead_value', 'title', 'user_id'];
        const targetCol = target.toLowerCase().trim();
        if (allowedColumns.includes(targetCol)) {
          await pool.query(
            `UPDATE leads SET ${targetCol} = $1, updated_at = NOW() WHERE id = $2`,
            [value, entityId]
          ).catch(() => {});
        }
      } else if (action_type === 'send_email' && target) {
        const templateId = Number(target);
        if (Number.isFinite(templateId)) {
          const { rows } = await pool.query(`SELECT * FROM email_templates WHERE id = $1`, [templateId]);
          if (rows[0]) {
            let recipientEmail = value?.trim();

            // 1. If recipient email is not directly specified or is a placeholder like 'contact_email'
            if (!recipientEmail || recipientEmail === 'contact_email' || recipientEmail === 'person_email') {
              recipientEmail = data.emails || data.email || null;

              // If entity is an Organization or linked to an Organization, query linked contact persons
              if (!recipientEmail && entityId) {
                const personRes = await pool.query(
                  `SELECT emails FROM persons WHERE organization_id = $1 OR id = $1 LIMIT 1`,
                  [entityId]
                );
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

              // Fallback to assigned sales owner / user email
              if (!recipientEmail && data.user_id) {
                const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [data.user_id]);
                if (userRes.rows[0]?.email) {
                  recipientEmail = userRes.rows[0].email;
                }
              }
            }

            logger.info(
              { templateId, recipientEmail: recipientEmail || 'No email found', data },
              `Workflow executed send_email template "${rows[0].name}" for Organization/Entity #${entityId} $\rightarrow$ ${recipientEmail || 'Unresolved Recipient'}`
            );
          }
        }
      }
    } catch (err: any) {
      logger.error({ err, action }, 'WorkflowService.executeAction failed');
    }
  }
}
