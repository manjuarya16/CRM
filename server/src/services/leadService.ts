import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import path from "path";
import fs from "fs";
import { notifyCRMActivity } from "@/utils/notificationHelper";
import { processWorkflowsForEvent } from "@/services/workflowEngine";
import { WorkflowService } from "@/services/workflow.service";
import { extractTextFromBuffer, parseLeadDocumentText, ExtractedLeadData } from "@/utils/documentParser";

const logger = pino();

const getLeads = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const search = String(req.query.search || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 10);

    const id = req.query.id ? Number(req.query.id) : null;
    const lead_value = req.query.lead_value ? Number(req.query.lead_value) : null;
    const user_id = req.query.user_id ? Number(req.query.user_id) : null;
    const person_id = req.query.person_id ? Number(req.query.person_id) : null;
    const lead_type_id = req.query.lead_type_id ? Number(req.query.lead_type_id) : null;
    const lead_source_id = req.query.lead_source_id ? Number(req.query.lead_source_id) : null;
    const expected_close_date = req.query.expected_close_date ? String(req.query.expected_close_date) : null;
    const created_at = req.query.created_at ? String(req.query.created_at) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_leads($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [search, page, limit, id, lead_value, user_id, person_id, lead_type_id, lead_source_id, expected_close_date, created_at]
    );

    const total = result.rows.length > 0 ? Number(result.rows[0].total_count || result.rows.length) : 0;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: result.rows,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const getLeadById = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_lead_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Lead not found",
      });
      return;
    }

    const leadData = result.rows[0];
    if (leadData && (leadData.custom_attributes === undefined || leadData.custom_attributes === null)) {
      leadData.custom_attributes = {};
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: leadData,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const createLead = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const {
      title,
      description,
      lead_value,
      user_id,
      person_id: rawPersonId,
      person,           // { name, email, phone, organization_id } for new person
      lead_source_id,
      lead_type_id,
      lead_pipeline_id,
      lead_pipeline_stage_id,
      expected_close_date,
      products,         // [{ product_id, quantity, price }]
      custom_attributes,
    } = req.body;

    // Resolve person_id: use existing or create new person via procedural function save_person
    let person_id = rawPersonId ? Number(rawPersonId) : null;

    if (!person_id && person && person.name) {
      let emailsJson: string;
      if (Array.isArray(person.emails) && person.emails.length > 0) {
        emailsJson = JSON.stringify(person.emails.filter((e: any) => e.value || (typeof e === "string" && e.trim())));
      } else if (person.email) {
        emailsJson = JSON.stringify([{ label: "work", value: person.email }]);
      } else {
        emailsJson = JSON.stringify([]);
      }

      let phonesJson: string;
      if (Array.isArray(person.contact_numbers) && person.contact_numbers.length > 0) {
        phonesJson = JSON.stringify(person.contact_numbers.filter((c: any) => c.value || (typeof c === "string" && c.trim())));
      } else if (person.phone) {
        phonesJson = JSON.stringify([{ label: "work", value: person.phone }]);
      } else {
        phonesJson = JSON.stringify([]);
      }

      const personRes = await connection.query(
        "SELECT save_person($1, $2::jsonb, $3::jsonb, $4) as result",
        [
          person.name,
          emailsJson,
          phonesJson,
          person.organization_id ? Number(person.organization_id) : null,
        ]
      );
      person_id = personRes.rows[0]?.result?.id || null;
    }

    const rawOrgId = req.body.organization_id || (person && person.organization_id) || null;
    const orgId = rawOrgId ? Number(rawOrgId) : null;

    let validExpectedCloseDate: string | null = null;
    if (expected_close_date) {
      const parsedDate = new Date(expected_close_date);
      if (!isNaN(parsedDate.getTime())) {
        validExpectedCloseDate = parsedDate.toISOString().split('T')[0];
      }
    }

    const result = await connection.query(
      "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        title,
        description || null,
        lead_value || null,
        user_id || (req as any).user?.id || null,
        person_id,
        lead_source_id || null,
        lead_type_id || null,
        lead_pipeline_id || null,
        validExpectedCloseDate,
        orgId,
      ]
    );

    const lead = result.rows[0];

    // Optionally set stage via fn_update_lead_stage
    if (lead && lead_pipeline_stage_id) {
      await connection.query(
        "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
        [lead.id, Number(lead_pipeline_stage_id)]
      );
    }

    // Save products via fn_add_lead_product
    if (lead && Array.isArray(products) && products.length > 0) {
      await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_id INT;");
      await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_location_id INT;");
      for (const p of products) {
        if (!p.product_id) continue;
        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6)",
          [
            lead.id,
            Number(p.product_id),
            Number(p.quantity) || 1,
            p.price ? Number(p.price) : null,
            p.warehouse_id ? Number(p.warehouse_id) : null,
            p.warehouse_location_id ? Number(p.warehouse_location_id) : null,
          ]
        );
      }
    }

    if (lead) {
      notifyCRMActivity({
        title: "New Lead Created",
        message: `Lead "${title}" was created successfully.`,
        module: "lead",
        entityId: lead.id,
        actionType: "created",
        userId: user_id || null,
        createdBy: (req as any).user?.id || null,
      });
      // Fire workflow automations (async, non-blocking)
      processWorkflowsForEvent('leads', 'created', lead.id, (req as any).user).catch(() => {});
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const updateLead = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    const {
      title,
      description,
      lead_value,
      status,
      lost_reason,
      user_id,
      person_id: rawPersonId,
      person,
      lead_source_id,
      lead_type_id,
      lead_pipeline_id,
      lead_pipeline_stage_id,
      expected_close_date,
      products,
      custom_attributes,
    } = req.body;

    // Resolve person_id: use existing or create new person via save_person
    let person_id = rawPersonId ? Number(rawPersonId) : null;
    if (!person_id && person && person.name) {
      let emailsJson: string;
      if (Array.isArray(person.emails) && person.emails.length > 0) {
        emailsJson = JSON.stringify(person.emails.filter((e: any) => e.value || (typeof e === "string" && e.trim())));
      } else if (person.email) {
        emailsJson = JSON.stringify([{ label: "work", value: person.email }]);
      } else {
        emailsJson = JSON.stringify([]);
      }

      let phonesJson: string;
      if (Array.isArray(person.contact_numbers) && person.contact_numbers.length > 0) {
        phonesJson = JSON.stringify(person.contact_numbers.filter((c: any) => c.value || (typeof c === "string" && c.trim())));
      } else if (person.phone) {
        phonesJson = JSON.stringify([{ label: "work", value: person.phone }]);
      } else {
        phonesJson = JSON.stringify([]);
      }

      const personRes = await connection.query(
        "SELECT save_person($1, $2::jsonb, $3::jsonb, $4) as result",
        [
          person.name,
          emailsJson,
          phonesJson,
          person.organization_id ? Number(person.organization_id) : null,
        ]
      );
      person_id = personRes.rows[0]?.result?.id || null;
    }

    const result = await connection.query(
      "SELECT * FROM public.fn_update_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [
        id,
        title ?? null,
        description ?? null,
        lead_value !== undefined && lead_value !== null ? Number(lead_value) : null,
        status !== undefined ? Boolean(status) : null,
        lost_reason ?? null,
        user_id ? Number(user_id) : null,
        person_id ? Number(person_id) : null,
        lead_source_id ? Number(lead_source_id) : null,
        lead_type_id ? Number(lead_type_id) : null,
        lead_pipeline_id ? Number(lead_pipeline_id) : null,
        lead_pipeline_stage_id ? Number(lead_pipeline_stage_id) : null,
        expected_close_date || null,
      ]
    );

    const updatedLead = result.rows[0];

    if (id && custom_attributes !== undefined) {
      const customAttrsJson = JSON.stringify(custom_attributes || {});
      await connection.query(
        "SELECT public.fn_update_lead_custom_attributes($1, $2::jsonb)",
        [id, customAttrsJson]
      );
      if (updatedLead) updatedLead.custom_attributes = custom_attributes;
    }

    // If stage explicitly provided, update stage via fn_update_lead_stage
    if (lead_pipeline_stage_id) {
      const stagesRes = await connection.query("SELECT * FROM public.fn_get_pipeline_stages(null)");
      const targetStage = stagesRes.rows.find((s: any) => Number(s.id) === Number(lead_pipeline_stage_id));
      const stageCode = (targetStage?.code || "").toLowerCase();
      const stageName = (targetStage?.name || "").toLowerCase();
      if (stageCode.includes("won") || stageName.includes("won")) {
        await deductStockForWonLead(connection, id);
      }

      await connection.query(
        "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
        [id, Number(lead_pipeline_stage_id)]
      );
    }

    // Update products if array provided using fn_clear_lead_products & fn_add_lead_product
    if (Array.isArray(products)) {
      await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_id INT;");
      await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_location_id INT;");
      await connection.query("SELECT public.fn_clear_lead_products($1)", [id]);
      for (const p of products) {
        if (!p.product_id) continue;
        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6)",
          [
            id,
            Number(p.product_id),
            Number(p.quantity) || 1,
            p.price ? Number(p.price) : null,
            p.warehouse_id ? Number(p.warehouse_id) : null,
            p.warehouse_location_id ? Number(p.warehouse_location_id) : null,
          ]
        );
      }
    }

    // Fire workflow automations (async, non-blocking)
    if (updatedLead?.id) {
      processWorkflowsForEvent('leads', 'updated', updatedLead.id, (req as any).user).catch(() => {});
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const deleteLead = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    await connection.query(
      "SELECT public.fn_delete_lead($1) AS deleted",
      [id]
    );

    WorkflowService.triggerWorkflows('leads', 'delete', { id }).catch((e: any) => logger.error(e));
    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const getLeadSources = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const result = await connection.query("SELECT * FROM public.fn_get_lead_sources()");
    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const getLeadTypes = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const result = await connection.query("SELECT * FROM public.fn_get_lead_types()");
    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const getLeadPipelines = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const result = await connection.query("SELECT * FROM public.fn_get_lead_pipelines()");
    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const getPipelineStages = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const pipelineId = req.query.pipeline_id ? Number(req.query.pipeline_id) : null;
    const result = await connection.query("SELECT * FROM public.fn_get_pipeline_stages($1)", [pipelineId]);
    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const getLeadProducts = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const leadId = Number(req.params.id);
    const result = await connection.query(
      `SELECT lp.id, lp.lead_id, lp.product_id, lp.quantity, lp.price, lp.amount,
              lp.warehouse_id, lp.warehouse_location_id,
              p.name AS product_name, p.sku,
              w.name AS warehouse_name,
              wl.name AS warehouse_location_name
       FROM lead_products lp
       LEFT JOIN products p ON p.id = lp.product_id
       LEFT JOIN warehouses w ON w.id = lp.warehouse_id
       LEFT JOIN warehouse_locations wl ON wl.id = lp.warehouse_location_id
       WHERE lp.lead_id = $1
       ORDER BY lp.id ASC`,
      [leadId]
    ).catch(async () => {
      return (connection as PoolClient).query("SELECT * FROM public.fn_get_lead_products($1)", [leadId]);
    });
    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const addLeadProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const leadId = Number(req.params.id);
    const { product_id, quantity, price, warehouse_id, warehouse_location_id } = req.body;

    await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_id INT;");
    await connection.query("ALTER TABLE lead_products ADD COLUMN IF NOT EXISTS warehouse_location_id INT;");

    const result = await connection.query(
      "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6)",
      [
        leadId,
        product_id,
        quantity || 1,
        price || null,
        warehouse_id ? Number(warehouse_id) : null,
        warehouse_location_id ? Number(warehouse_location_id) : null,
      ]
    );

    const addedItem = result.rows[0];
    res.status(HttpStatusCodes.CREATED).json({ success: true, message: "Product added to lead", data: addedItem });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const deleteLeadProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const itemId = Number(req.params.id);
    await connection.query("SELECT public.fn_delete_lead_product($1) AS deleted", [itemId]);
    res.status(HttpStatusCodes.OK).json({ success: true, message: "Product removed from lead" });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const deductStockForWonLead = async (connection: PoolClient, leadId: number): Promise<void> => {
  try {
    await connection.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_stock_deducted BOOLEAN DEFAULT FALSE;");
    const checkRes = await connection.query("SELECT is_stock_deducted FROM leads WHERE id = $1", [leadId]);
    if (checkRes.rows[0]?.is_stock_deducted) {
      return;
    }

    const lpRes = await connection.query(
      "SELECT product_id, quantity, warehouse_id, warehouse_location_id FROM lead_products WHERE lead_id = $1",
      [leadId]
    );
    const leadProducts = lpRes.rows || [];
    if (leadProducts.length === 0) return;

    for (const lp of leadProducts) {
      const productId = Number(lp.product_id);
      const qtyToDeduct = Number(lp.quantity) || 1;
      const wId = lp.warehouse_id ? Number(lp.warehouse_id) : null;
      const locId = lp.warehouse_location_id ? Number(lp.warehouse_location_id) : null;

      if (!productId || qtyToDeduct <= 0) continue;

      // Get product name for history logging
      const pNameRes = await connection.query("SELECT name FROM products WHERE id = $1", [productId]);
      const prodName = pNameRes.rows[0]?.name || `Product #${productId}`;

      let remaining = qtyToDeduct;

      // Deduct specifically from targeted warehouse_location_id if assigned
      if (locId) {
        const locInvRes = await connection.query(
          `SELECT pi.id, pi.in_stock, w.name as warehouse_name, wl.name as location_name 
           FROM product_inventories pi
           LEFT JOIN warehouses w ON w.id = pi.warehouse_id
           LEFT JOIN warehouse_locations wl ON wl.id = pi.warehouse_location_id
           WHERE pi.product_id = $1 AND pi.warehouse_location_id = $2 AND pi.in_stock > 0 LIMIT 1`,
          [productId, locId]
        );
        if (locInvRes.rows.length > 0) {
          const invRow = locInvRes.rows[0];
          const currentStock = Number(invRow.in_stock) || 0;
          const deductAmount = Math.min(currentStock, remaining);
          const newStock = currentStock - deductAmount;
          remaining -= deductAmount;

          await connection.query(
            "UPDATE product_inventories SET in_stock = $1, updated_at = NOW() WHERE id = $2",
            [newStock, invRow.id]
          );

          // Log history activity
          const actRes = await connection.query(
            `INSERT INTO public.activities (title, type, comment, is_done, created_at, updated_at)
             VALUES ($1, 'system', $2, TRUE, NOW(), NOW()) RETURNING id`,
            [
              "Inventory Stock Deducted",
              `Deducted ${deductAmount} unit(s) of "${prodName}" from Warehouse "${invRow.warehouse_name || 'Main'}" (Location: "${invRow.location_name || 'Assigned Location'}") for Lead #${leadId}.`
            ]
          );
          if (actRes.rows[0]?.id) {
            await connection.query(
              "INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [leadId, actRes.rows[0].id]
            );
          }
        }
      } else if (wId) {
        const wInvRes = await connection.query(
          `SELECT pi.id, pi.in_stock, w.name as warehouse_name, wl.name as location_name 
           FROM product_inventories pi
           LEFT JOIN warehouses w ON w.id = pi.warehouse_id
           LEFT JOIN warehouse_locations wl ON wl.id = pi.warehouse_location_id
           WHERE pi.product_id = $1 AND pi.warehouse_id = $2 AND pi.in_stock > 0 ORDER BY pi.in_stock DESC`,
          [productId, wId]
        );
        for (const invRow of wInvRes.rows) {
          if (remaining <= 0) break;
          const currentStock = Number(invRow.in_stock) || 0;
          const deductAmount = Math.min(currentStock, remaining);
          const newStock = currentStock - deductAmount;
          remaining -= deductAmount;

          await connection.query(
            "UPDATE product_inventories SET in_stock = $1, updated_at = NOW() WHERE id = $2",
            [newStock, invRow.id]
          );

          // Log history activity
          const actRes = await connection.query(
            `INSERT INTO public.activities (title, type, comment, is_done, created_at, updated_at)
             VALUES ($1, 'system', $2, TRUE, NOW(), NOW()) RETURNING id`,
            [
              "Inventory Stock Deducted",
              `Deducted ${deductAmount} unit(s) of "${prodName}" from Warehouse "${invRow.warehouse_name || 'Main'}" (Location: "${invRow.location_name || 'General'}") for Lead #${leadId}.`
            ]
          );
          if (actRes.rows[0]?.id) {
            await connection.query(
              "INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [leadId, actRes.rows[0].id]
            );
          }
        }
      }

      // Fallback: Deduct remaining quantity from any location with available stock
      if (remaining > 0) {
        const invRes = await connection.query(
          `SELECT pi.id, pi.in_stock, w.name as warehouse_name, wl.name as location_name 
           FROM product_inventories pi
           LEFT JOIN warehouses w ON w.id = pi.warehouse_id
           LEFT JOIN warehouse_locations wl ON wl.id = pi.warehouse_location_id
           WHERE pi.product_id = $1 AND pi.in_stock > 0 ORDER BY pi.in_stock DESC`,
          [productId]
        );

        for (const invRow of invRes.rows) {
          if (remaining <= 0) break;
          const currentStock = Number(invRow.in_stock) || 0;
          const deductAmount = Math.min(currentStock, remaining);
          const newStock = currentStock - deductAmount;
          remaining -= deductAmount;

          await connection.query(
            "UPDATE product_inventories SET in_stock = $1, updated_at = NOW() WHERE id = $2",
            [newStock, invRow.id]
          );

          // Log history activity
          const actRes = await connection.query(
            `INSERT INTO public.activities (title, type, comment, is_done, created_at, updated_at)
             VALUES ($1, 'system', $2, TRUE, NOW(), NOW()) RETURNING id`,
            [
              "Inventory Stock Deducted",
              `Deducted ${deductAmount} unit(s) of "${prodName}" from Warehouse "${invRow.warehouse_name || 'Main'}" (Location: "${invRow.location_name || 'General'}") for Lead #${leadId}.`
            ]
          );
          if (actRes.rows[0]?.id) {
            await connection.query(
              "INSERT INTO public.lead_activities (lead_id, activity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [leadId, actRes.rows[0].id]
            );
          }
        }
      }

      await connection.query(
        "UPDATE products SET quantity = GREATEST(0, COALESCE(quantity, 0) - $1), updated_at = NOW() WHERE id = $2",
        [qtyToDeduct, productId]
      );
    }

    await connection.query("UPDATE leads SET is_stock_deducted = TRUE WHERE id = $1", [leadId]);
    logger.info({ leadId }, "Warehouse stock successfully deducted for won lead");
  } catch (err: any) {
    logger.error({ err, leadId }, "Failed to deduct warehouse stock for won lead");
  }
};

const updateLeadStage = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const leadId = Number(req.params.id);
    const { stage_id, status, lost_reason } = req.body;

    // Fetch current lead details BEFORE updating so we can capture old stage name
    const beforeRes = await connection.query(
      "SELECT * FROM public.fn_get_lead_by_id($1)",
      [leadId]
    );
    const leadBefore = beforeRes.rows[0];
    const oldStageName = leadBefore?.stage_name || "Unknown";
    const leadTitle = leadBefore?.title || `Lead #${leadId}`;

    // Fetch new stage name via stored procedure
    const stagesRes = await connection.query(
      "SELECT * FROM public.fn_get_pipeline_stages(null)"
    );
    const targetStage = stagesRes.rows.find((s: any) => Number(s.id) === Number(stage_id));
    const newStageName = targetStage?.name || `Stage #${stage_id}`;

    // Deduct warehouse stock if transition is to a Won stage
    const stageCode = (targetStage?.code || "").toLowerCase();
    const stageName = (targetStage?.name || "").toLowerCase();
    if (stageCode.includes("won") || stageName.includes("won")) {
      await deductStockForWonLead(connection, leadId);
    }

    // Update the stage
    const result = await connection.query(
      "SELECT * FROM public.fn_update_lead_stage($1, $2, $3, $4)",
      [leadId, stage_id, status ?? true, lost_reason || null]
    );

    // Notify with full context: lead title, old stage → new stage
    notifyCRMActivity({
      title: `Lead Stage Changed: ${leadTitle}`,
      message: `"${leadTitle}" moved from "${oldStageName}" → "${newStageName}"`,
      module: "lead",
      entityId: leadId,
      actionType: "stage_changed",
      createdBy: (req as any).user?.id || null,
    });

    // Trigger stage_change / update workflows
    processWorkflowsForEvent('leads', 'updated', leadId, (req as any).user).catch((e: any) => logger.error(e));

    res.status(HttpStatusCodes.OK).json({ success: true, message: "Lead stage updated", data: result.rows[0] });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const getKanbanLeads = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const pipelineId = req.query.pipeline_id ? Number(req.query.pipeline_id) : null;
    const search = String(req.query.search || "");

    const id = req.query.id ? Number(req.query.id) : null;
    const lead_value = req.query.lead_value ? Number(req.query.lead_value) : null;
    const user_id = req.query.user_id ? Number(req.query.user_id) : null;
    const person_id = req.query.person_id ? Number(req.query.person_id) : null;
    const lead_type_id = req.query.lead_type_id ? Number(req.query.lead_type_id) : null;
    const lead_source_id = req.query.lead_source_id ? Number(req.query.lead_source_id) : null;
    const expected_close_date = req.query.expected_close_date ? String(req.query.expected_close_date) : null;
    const created_at = req.query.created_at ? String(req.query.created_at) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_leads_kanban($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [pipelineId, search, id, lead_value, user_id, person_id, lead_type_id, lead_source_id, expected_close_date, created_at]
    );

    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const createLeadByAI = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();

    const file = (req as any).file;

    if (!file) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No file uploaded. Please provide a PDF or document file.",
      });
      return;
    }

    const uploadDir = path.join(process.cwd(), "uploads", "leads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const destPath = path.join(uploadDir, uniqueName);

    let fileBuffer: Buffer | null = null;
    if (file.path && fs.existsSync(file.path)) {
      fileBuffer = fs.readFileSync(file.path);
      fs.copyFileSync(file.path, destPath);
      try { fs.unlinkSync(file.path); } catch (e) {}
    } else if (file.buffer) {
      fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);
      if (fileBuffer) {
        fs.writeFileSync(destPath, fileBuffer);
      }
    }

    const fileUrl = `/uploads/leads/${uniqueName}`;

    // 1. Extract text and parse structured data from the document
    let parsed: ExtractedLeadData = {};
    if (fileBuffer) {
      const extractedText = extractTextFromBuffer(fileBuffer, file.originalname);
      parsed = parseLeadDocumentText(extractedText, file.originalname);
    }

    const currentUserId = (req as any).user?.id || null;

    // 2. Check or create Organization
    let organizationId: number | null = null;
    let orgCreated = false;
    if (parsed.organization && parsed.organization.trim()) {
      const orgName = parsed.organization.trim();
      const existingOrgRes = await connection.query(
        "SELECT id, name FROM public.organizations WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
        [orgName]
      );
      if (existingOrgRes.rows.length > 0) {
        organizationId = existingOrgRes.rows[0].id;
      } else {
        const newOrgRes = await connection.query(
          "SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result",
          [orgName, null, currentUserId, "{}"]
        );
        const newOrg = newOrgRes.rows[0]?.result;
        if (newOrg && newOrg.id) {
          organizationId = newOrg.id;
          orgCreated = true;
          WorkflowService.triggerWorkflows("organizations", "create", newOrg).catch((e) => logger.error(e));
        }
      }
    }

    // 3. Check or create Person (Contact)
    let personId: number | null = null;
    let personCreated = false;
    let resolvedPersonName = parsed.contactPerson || null;

    if (parsed.email || parsed.phone || parsed.contactPerson) {
      // Check existing person by email
      if (parsed.email) {
        const pEmailRes = await connection.query(
          "SELECT id, name, organization_id FROM public.persons WHERE emails::text ILIKE $1 LIMIT 1",
          [`%${parsed.email.trim()}%`]
        );
        if (pEmailRes.rows.length > 0) {
          personId = pEmailRes.rows[0].id;
          resolvedPersonName = pEmailRes.rows[0].name;
        }
      }

      // Check existing person by phone if not found
      if (!personId && parsed.phone) {
        const cleanPhone = parsed.phone.replace(/[^0-9+]/g, "");
        const searchPhone = cleanPhone.length >= 5 ? `%${cleanPhone}%` : `%${parsed.phone.trim()}%`;
        const pPhoneRes = await connection.query(
          "SELECT id, name, organization_id FROM public.persons WHERE contact_numbers::text ILIKE $1 LIMIT 1",
          [searchPhone]
        );
        if (pPhoneRes.rows.length > 0) {
          personId = pPhoneRes.rows[0].id;
          resolvedPersonName = pPhoneRes.rows[0].name;
        }
      }

      // Check existing person by name if not found
      if (!personId && parsed.contactPerson) {
        const pNameRes = await connection.query(
          "SELECT id, name, organization_id FROM public.persons WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1",
          [parsed.contactPerson.trim()]
        );
        if (pNameRes.rows.length > 0) {
          personId = pNameRes.rows[0].id;
          resolvedPersonName = pNameRes.rows[0].name;
        }
      }

      // If person not found, create new person
      if (!personId && (parsed.contactPerson || parsed.email || parsed.phone)) {
        const newPersonName = parsed.contactPerson || (parsed.email ? parsed.email.split("@")[0] : "New Contact");
        const emailArr = parsed.email ? [{ label: "work", value: parsed.email }] : [];
        const phoneArr = parsed.phone ? [{ label: "work", value: parsed.phone }] : [];

        const newPersonRes = await connection.query(
          "SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb) as result",
          [
            newPersonName,
            JSON.stringify(emailArr),
            JSON.stringify(phoneArr),
            organizationId || null,
            parsed.jobTitle || null,
            currentUserId,
            "{}",
          ]
        );
        const newPerson = newPersonRes.rows[0]?.result;
        if (newPerson && newPerson.id) {
          personId = newPerson.id;
          resolvedPersonName = newPerson.name;
          personCreated = true;
          WorkflowService.triggerWorkflows("persons", "create", newPerson).catch((e) => logger.error(e));
        }
      } else if (personId && organizationId) {
        // If person already exists without organization, link the organization
        await connection.query(
          "UPDATE public.persons SET organization_id = $1 WHERE id = $2 AND organization_id IS NULL",
          [organizationId, personId]
        );
      }
    }

    // 4. Resolve Lead Source & Lead Type
    let sourceId: number | null = null;
    if (parsed.source && parsed.source.trim()) {
      const sRes = await connection.query(
        "SELECT id FROM public.lead_sources WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR name ILIKE $2 LIMIT 1",
        [parsed.source.trim(), `%${parsed.source.trim()}%`]
      );
      if (sRes.rows.length > 0) sourceId = sRes.rows[0].id;
    }

    let typeId: number | null = null;
    if (parsed.type && parsed.type.trim()) {
      const tRes = await connection.query(
        "SELECT id FROM public.lead_types WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR name ILIKE $2 LIMIT 1",
        [parsed.type.trim(), `%${parsed.type.trim()}%`]
      );
      if (tRes.rows.length > 0) typeId = tRes.rows[0].id;
    }

    // 5. Resolve default pipeline and first stage
    const pipelineRes = await connection.query("SELECT * FROM public.fn_get_lead_pipelines()");
    let pipelineId: number | null = null;
    let stageId: number | null = null;

    const defaultPipeline = pipelineRes.rows.find((p: any) => p.is_default) || pipelineRes.rows[0];
    if (defaultPipeline) {
      pipelineId = defaultPipeline.id;
      const stageRes = await connection.query("SELECT * FROM public.fn_get_pipeline_stages($1)", [pipelineId]);
      if (stageRes.rows.length > 0) {
        stageId = stageRes.rows[0].id;
      }
    }

    const leadTitle = parsed.title || `Lead from ${path.basename(file.originalname, path.extname(file.originalname))}`;

    // Parse / sanitize expected close date
    let validExpectedCloseDate: string | null = null;
    if (parsed.expectedCloseDate) {
      const parsedDate = new Date(parsed.expectedCloseDate);
      if (!isNaN(parsedDate.getTime())) {
        validExpectedCloseDate = parsedDate.toISOString().split('T')[0];
      }
    }

    // 6. Create Lead
    const leadResult = await connection.query(
      "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        leadTitle,
        parsed.description || `Created from uploaded file: ${file.originalname}`,
        parsed.leadValue || null,
        currentUserId,
        personId,
        sourceId,
        typeId,
        pipelineId,
        validExpectedCloseDate,
        organizationId,
      ]
    );

    const lead = leadResult.rows[0];

    let createdProductsCount = 0;
    let attachedProductsCount = 0;

    if (lead) {
      // Set stage on lead
      if (stageId) {
        await connection.query(
          "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
          [lead.id, stageId]
        );
      }

      // 7. Process & Attach Products from document
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        for (const prod of parsed.products) {
          if (!prod.name || !prod.name.trim()) continue;
          const pName = prod.name.trim();
          const pSku = prod.sku?.trim() || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const pQty = Number(prod.quantity) || 1;
          const pPrice = prod.price !== undefined && prod.price !== null ? Number(prod.price) : null;

          let prodId: number | null = null;
          const pCheck = await connection.query(
            "SELECT id, name, price FROM public.products WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR (sku IS NOT NULL AND LOWER(sku) = LOWER($2)) LIMIT 1",
            [pName, pSku]
          );

          if (pCheck.rows.length > 0) {
            prodId = pCheck.rows[0].id;
          } else {
            // Create new product
            const newProdRes = await connection.query(
              "SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)",
              [
                pSku,
                pName,
                prod.description || `Extracted from ${file.originalname}`,
                pQty,
                pPrice,
              ]
            );
            const createdProduct = newProdRes.rows[0];
            if (createdProduct && createdProduct.id) {
              prodId = createdProduct.id;
              createdProductsCount++;
              WorkflowService.triggerWorkflows("products", "create", createdProduct).catch((e) => logger.error(e));
            }
          }

          if (prodId && lead.id) {
            await connection.query(
              "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4)",
              [lead.id, prodId, pQty, pPrice]
            );
            attachedProductsCount++;
          }
        }
      }

      // 8. Attach file activity to the newly created lead using fn_create_activity
      await connection.query(
        "SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          file.originalname,
          "file",
          fileUrl,
          null,
          null,
          true,
          currentUserId,
          null,
          lead.id,
          personId,
        ]
      );

      // Trigger lead create workflows
      WorkflowService.triggerWorkflows("leads", "create", {
        ...lead,
        person_id: personId,
        organization_id: organizationId,
      }).catch((e) => logger.error(e));
    }

    // Build friendly success message
    const msgParts: string[] = [`Lead "${leadTitle}" created successfully`];
    if (personCreated && resolvedPersonName) {
      msgParts.push(`new contact "${resolvedPersonName}" created`);
    } else if (personId && resolvedPersonName) {
      msgParts.push(`linked to contact "${resolvedPersonName}"`);
    }
    if (orgCreated && parsed.organization) {
      msgParts.push(`new organization "${parsed.organization}" created`);
    } else if (organizationId && parsed.organization) {
      msgParts.push(`linked to organization "${parsed.organization}"`);
    }
    if (attachedProductsCount > 0) {
      msgParts.push(`${attachedProductsCount} product(s) added (${createdProductsCount} new)`);
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: `${msgParts.join(", ")}.`,
      data: {
        ...lead,
        person_id: personId,
        organization_id: organizationId,
        productsCount: attachedProductsCount,
        extracted: parsed,
      },
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

const uploadLeadFile = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const leadId = Number(req.params.id);
    const file = (req as any).file;

    if (!leadId || !file) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Lead ID and file are required.",
      });
      return;
    }

    const uploadDir = path.join(process.cwd(), "uploads", "leads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const destPath = path.join(uploadDir, uniqueName);

    if (file.path && fs.existsSync(file.path)) {
      fs.copyFileSync(file.path, destPath);
      try { fs.unlinkSync(file.path); } catch (e) {}
    }

    const fileUrl = `/uploads/leads/${uniqueName}`;

    const actRes = await connection.query(
      "SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        file.originalname,
        "file",
        fileUrl,
        null,
        null,
        true,
        (req as any).user?.id || null,
        null,
        leadId,
        null,
      ]
    );

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "File attached successfully to lead.",
      data: actRes.rows[0],
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  } finally {
    connection?.release();
  }
};

export default {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadSources,
  getLeadTypes,
  getLeadPipelines,
  getPipelineStages,
  getLeadProducts,
  addLeadProduct,
  deleteLeadProduct,
  updateLeadStage,
  getKanbanLeads,
  createLeadByAI,
  uploadLeadFile,
};
