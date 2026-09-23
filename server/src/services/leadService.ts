import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import path from "path";
import fs from "fs";

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
    } = req.body;

    // Resolve person_id: use existing or create new person via procedural function save_person
    let person_id = rawPersonId ? Number(rawPersonId) : null;

    if (!person_id && person && person.name) {
      const emailsJson = JSON.stringify(
        person.email ? [{ label: "work", value: person.email }] : []
      );
      const phonesJson = JSON.stringify(
        person.phone ? [{ label: "work", value: person.phone }] : []
      );
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
      "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        title,
        description || null,
        lead_value || null,
        user_id || (req as any).user?.id || null,
        person_id,
        lead_source_id || null,
        lead_type_id || null,
        lead_pipeline_id || null,
        expected_close_date || null,
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
      for (const p of products) {
        if (!p.product_id) continue;
        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4)",
          [lead.id, Number(p.product_id), Number(p.quantity) || 1, p.price ? Number(p.price) : null]
        );
      }
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
      const emailsJson = JSON.stringify(
        person.email ? [{ label: "work", value: person.email }] : []
      );
      const phonesJson = JSON.stringify(
        person.phone ? [{ label: "work", value: person.phone }] : []
      );
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
      await connection.query(
        "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
        [id, Number(lead_pipeline_stage_id)]
      );
    }

    // Update products if array provided using fn_clear_lead_products & fn_add_lead_product
    if (Array.isArray(products)) {
      await connection.query("SELECT public.fn_clear_lead_products($1)", [id]);
      for (const p of products) {
        if (!p.product_id) continue;
        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4)",
          [id, Number(p.product_id), Number(p.quantity) || 1, p.price ? Number(p.price) : null]
        );
      }
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
    const result = await connection.query("SELECT * FROM public.fn_get_lead_products($1)", [leadId]);
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
    const { product_id, quantity, price } = req.body;
    const result = await connection.query(
      "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4)",
      [leadId, product_id, quantity || 1, price || null]
    );
    res.status(HttpStatusCodes.CREATED).json({ success: true, message: "Product added to lead", data: result.rows[0] });
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
    const itemId = Number(req.params.itemId);
    await connection.query("SELECT public.fn_delete_lead_product($1) AS deleted", [itemId]);
    res.status(HttpStatusCodes.OK).json({ success: true, message: "Product removed from lead" });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

const updateLeadStage = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const leadId = Number(req.params.id);
    const { stage_id, status, lost_reason } = req.body;
    const result = await connection.query(
      "SELECT * FROM public.fn_update_lead_stage($1, $2, $3, $4)",
      [leadId, stage_id, status ?? true, lost_reason || null]
    );
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
        message: "No file uploaded. Please provide a PDF or image file.",
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

    const fileBaseName = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const leadTitle = fileBaseName || `Lead from ${new Date().toLocaleDateString()}`;

    // Get default pipeline and its first stage using stored functions
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

    // Create the lead using fn_create_lead
    const leadResult = await connection.query(
      "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        leadTitle,
        `Created from uploaded file: ${file.originalname}`,
        null,
        (req as any).user?.id || null,
        null,
        null,
        null,
        pipelineId,
        null,
      ]
    );

    const lead = leadResult.rows[0];

    if (lead) {
      if (stageId) {
        await connection.query(
          "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
          [lead.id, stageId]
        );
      }

      // Attach file activity to the newly created lead using fn_create_activity
      await connection.query(
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
          lead.id,
          null,
        ]
      );
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: `Lead "${leadTitle}" created successfully from uploaded file.`,
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
