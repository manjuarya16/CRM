import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { notifyCRMActivity } from "@/utils/notificationHelper";
import { processWorkflowsForEvent } from "@/services/workflowEngine";
import { WorkflowService } from "@/services/workflow.service";
import { saveEntityAttributeValues } from "@/services/dataTransfer.service";
import { extractTextFromBuffer, parseLeadDocumentText, ExtractedLeadData, ExtractedProduct } from "@/utils/documentParser";
import { parseVoiceTranscript, transcribeAudioWithWhisper, translateToEnglish, IVoiceLeadExtractedData } from "@/utils/voiceLeadParser";
import { configService } from "@/services/configService";

const logger = pino();

const getLeads = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const lead_pipeline_id = req.query.lead_pipeline_id || req.query.pipeline_id ? Number(req.query.lead_pipeline_id || req.query.pipeline_id) : null;
    const lead_pipeline_stage_id = req.query.lead_pipeline_stage_id || req.query.stage_id ? Number(req.query.lead_pipeline_stage_id || req.query.stage_id) : null;
    const tag = req.query.tag ? String(req.query.tag) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_leads($1::varchar, $2::int, $3::int, $4::int, $5::numeric, $6::int, $7::int, $8::int, $9::int, $10::date, $11::date, $12::int, $13::int, $14::varchar)",
      [search, page, limit, id, lead_value, user_id, person_id, lead_type_id, lead_source_id, expected_close_date, created_at, lead_pipeline_id, lead_pipeline_stage_id, tag]
    );

    const total = result.rows.length > 0 ? Number(result.rows[0].total_count || result.rows.length) : 0;

    if (result.rows.length > 0) {
      const leadIds = result.rows.map((r: any) => r.id);
      try {
        const enrichRes = await connection.query(
          `SELECT l.id, l.organization_id, org.name AS organization_name, l.custom_attributes 
           FROM leads l 
           LEFT JOIN organizations org ON org.id = l.organization_id 
           WHERE l.id = ANY($1::int[])`,
          [leadIds]
        );
        const enrichMap = new Map<number, any>();
        for (const row of enrichRes.rows) {
          enrichMap.set(row.id, row);
        }
        for (const row of result.rows) {
          const enriched = enrichMap.get(row.id);
          if (enriched) {
            row.organization_id = enriched.organization_id ?? row.organization_id ?? null;
            row.organization_name = enriched.organization_name ?? row.organization_name ?? null;
            row.custom_attributes = enriched.custom_attributes ?? row.custom_attributes ?? {};
          }
        }
      } catch (enrichErr) {
        logger.warn({ enrichErr }, "Failed to enrich leads list with custom attributes");
      }
    }

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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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

    try {
      const extraRes = await connection.query(
        `SELECT l.custom_attributes, l.organization_id, org.name AS organization_name,
                l.person_id, p.name AS person_name, p.emails AS person_emails, p.contact_numbers AS person_contact_numbers
         FROM leads l 
         LEFT JOIN organizations org ON org.id = l.organization_id 
         LEFT JOIN persons p ON p.id = l.person_id
         WHERE l.id = $1`,
        [id]
      );
      if (extraRes.rows[0]) {
        const row = extraRes.rows[0];
        leadData.custom_attributes = row.custom_attributes || {};
        if (!leadData.organization_id && row.organization_id) {
          leadData.organization_id = row.organization_id;
        }
        if (!leadData.organization_name && row.organization_name) {
          leadData.organization_name = row.organization_name;
        }
        if (!leadData.person_id && row.person_id) {
          leadData.person_id = row.person_id;
        }
        if (!leadData.person_name && row.person_name) {
          leadData.person_name = row.person_name;
        }
        leadData.person_emails = row.person_emails;
        leadData.person_contact_numbers = row.person_contact_numbers;
        leadData.person = {
          id: row.person_id || leadData.person_id,
          name: row.person_name || leadData.person_name,
          emails: row.person_emails,
          contact_numbers: row.person_contact_numbers,
        };
      }
    } catch (enrichErr) {
      logger.warn({ enrichErr, id }, "Failed to enrich getLeadById with custom attributes");
    }

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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
    const {
      title,
      description,
      lead_value,
      user_id,
      person_id: rawPersonId,
      person,           // { name, email, phone, organization_id } for new person
      lead_source_id,
      lead_type_id,
      expected_close_date,
      products,         // [{ product_id, quantity, price }]
      custom_attributes,
    } = req.body;

    const rawPipelineId = req.body.lead_pipeline_id ?? req.body.pipeline_id;
    const lead_pipeline_id = rawPipelineId !== undefined && rawPipelineId !== null && rawPipelineId !== "" && !isNaN(Number(rawPipelineId))
      ? Number(rawPipelineId)
      : null;

    const rawStageId = req.body.lead_pipeline_stage_id ?? req.body.pipeline_stage_id ?? req.body.stage_id;
    const lead_pipeline_stage_id = rawStageId !== undefined && rawStageId !== null && rawStageId !== "" && !isNaN(Number(rawStageId))
      ? Number(rawStageId)
      : null;

    const currentUserId = user_id || (req as any).user?.id || null;

    // ─── STEP 1: RESOLVE OR CREATE ORGANIZATION FIRST ───────────────────────
    const rawOrgId = req.body.organization_id || (person && person.organization_id) || null;
    let organizationId: number | null = rawOrgId ? Number(rawOrgId) : null;
    const orgName = (
      req.body.organization_name ||
      (typeof req.body.organization === "string" ? req.body.organization : req.body.organization?.name) ||
      (person && (typeof person.organization === "string" ? person.organization : person.organization?.name)) ||
      ""
    ).trim();

    if (!organizationId && orgName) {
      const existingOrgRes = await connection.query(
        "SELECT * FROM public.fn_find_organization_by_name($1)",
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
          WorkflowService.triggerWorkflows("organizations", "create", newOrg).catch((e) => logger.error(e));
        }
      }
    }

    // ─── STEP 2: RESOLVE OR CREATE CONTACT PERSON SECOND ────────────────────
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

      // Check if person already exists by contact
      const emailVal = person.email || (Array.isArray(person.emails) && person.emails[0]?.value) || null;
      const phoneVal = person.phone || (Array.isArray(person.contact_numbers) && person.contact_numbers[0]?.value) || null;

      const pFindRes = await connection.query(
        "SELECT * FROM public.fn_find_person_by_contact($1, $2, $3, $4)",
        [emailVal, phoneVal, person.name, organizationId || null]
      );

      if (pFindRes.rows.length > 0) {
        person_id = pFindRes.rows[0].id;
        if (organizationId && !pFindRes.rows[0].organization_id) {
          await connection.query(
            "SELECT save_person(null, null, null, $1, null, null, null, $2) as result",
            [organizationId, person_id]
          );
        }
      } else {
        // Create new person linked with organization
        const personRes = await connection.query(
          "SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb) as result",
          [
            person.name,
            emailsJson,
            phonesJson,
            organizationId || null,
            person.job_title || null,
            currentUserId,
            "{}",
          ]
        );
        const newPerson = personRes.rows[0]?.result;
        if (newPerson && newPerson.id) {
          person_id = newPerson.id;
          WorkflowService.triggerWorkflows("persons", "create", newPerson).catch((e) => logger.error(e));
        }
      }
    } else if (person_id && organizationId) {
      await connection.query(
        "SELECT save_person(null, null, null, $1, null, null, null, $2) as result",
        [organizationId, person_id]
      );
    }

    // ─── STEP 3: CREATE THE LEAD THIRD ──────────────────────────────────────
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
        currentUserId,
        person_id,
        lead_source_id || null,
        lead_type_id || null,
        lead_pipeline_id || null,
        validExpectedCloseDate,
        organizationId,
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
        const pQty = Math.max(1, parseInt(String(p.quantity), 10) || 1);
        const pPrice = p.price !== undefined && p.price !== null && p.price !== "" ? Number(p.price) : null;
        const pWarehouse = p.warehouse_id ? Number(p.warehouse_id) : null;
        const pWarehouseLoc = p.warehouse_location_id ? Number(p.warehouse_location_id) : null;
        const pRecurring = Boolean(p.is_recurring === true || p.is_recurring === "true" || p.is_recurring === 1 || p.is_recurring === "1");
        const pBilling = pRecurring && p.billing_cycle ? String(p.billing_cycle).trim() : null;
        const pDuration = pRecurring ? Math.max(1, parseInt(String(p.contract_duration), 10) || 12) : 1;
        const rawStart = p.contract_start_date || p.start_date;
        const rawEnd = p.contract_end_date || p.end_date;
        const pStartDate = pRecurring && rawStart && String(rawStart).trim() ? String(rawStart).trim().slice(0, 10) : null;
        const pEndDate = pRecurring && rawEnd && String(rawEnd).trim() ? String(rawEnd).trim().slice(0, 10) : null;
        const todayStr = new Date().toISOString().slice(0, 10);
        if (pRecurring && pStartDate && pStartDate < todayStr) {
          throw new Error(`Product: Contract start date cannot be in the past`);
        }
        if (pRecurring && pEndDate && (pEndDate < todayStr || (pStartDate && pEndDate < pStartDate))) {
          throw new Error(`Product: Contract end date cannot be in the past or earlier than start date`);
        }

        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
          [
            lead.id,
            Number(p.product_id),
            pQty,
            pPrice,
            pWarehouse,
            pWarehouseLoc,
            pRecurring,
            pBilling,
            pDuration,
            pStartDate,
            pEndDate,
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
      message: "Lead successfully saved",
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
      expected_close_date,
      products,
      custom_attributes,
    } = req.body;

    const rawPipelineId = req.body.lead_pipeline_id ?? req.body.pipeline_id;
    const lead_pipeline_id = rawPipelineId !== undefined && rawPipelineId !== null && rawPipelineId !== "" && !isNaN(Number(rawPipelineId))
      ? Number(rawPipelineId)
      : null;

    const rawStageId = req.body.lead_pipeline_stage_id ?? req.body.pipeline_stage_id ?? req.body.stage_id;
    const lead_pipeline_stage_id = rawStageId !== undefined && rawStageId !== null && rawStageId !== "" && !isNaN(Number(rawStageId))
      ? Number(rawStageId)
      : null;

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
      await connection.query("SELECT public.fn_clear_lead_products($1)", [id]);
      for (const p of products) {
        if (!p.product_id) continue;
        const pQty = Math.max(1, parseInt(String(p.quantity), 10) || 1);
        const pPrice = p.price !== undefined && p.price !== null && p.price !== "" ? Number(p.price) : null;
        const pWarehouse = p.warehouse_id ? Number(p.warehouse_id) : null;
        const pWarehouseLoc = p.warehouse_location_id ? Number(p.warehouse_location_id) : null;
        const pRecurring = Boolean(p.is_recurring === true || p.is_recurring === "true" || p.is_recurring === 1 || p.is_recurring === "1");
        const pBilling = pRecurring && p.billing_cycle ? String(p.billing_cycle).trim() : null;
        const pDuration = pRecurring ? Math.max(1, parseInt(String(p.contract_duration), 10) || 12) : 1;
        const rawStart = p.contract_start_date || p.start_date;
        const rawEnd = p.contract_end_date || p.end_date;
        const pStartDate = pRecurring && rawStart && String(rawStart).trim() ? String(rawStart).trim().slice(0, 10) : null;
        const pEndDate = pRecurring && rawEnd && String(rawEnd).trim() ? String(rawEnd).trim().slice(0, 10) : null;

        await connection.query(
          "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
          [
            id,
            Number(p.product_id),
            pQty,
            pPrice,
            pWarehouse,
            pWarehouseLoc,
            pRecurring,
            pBilling,
            pDuration,
            pStartDate,
            pEndDate,
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
      message: "Lead successfully saved",
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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

const deleteBulkLeads = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    const rawIds = req.body.ids || req.body.lead_ids || req.body.id;
    const ids: number[] = Array.isArray(rawIds)
      ? rawIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id) && id > 0)
      : typeof rawIds === "number" || typeof rawIds === "string"
      ? [Number(rawIds)].filter((id: number) => !isNaN(id) && id > 0)
      : [];

    if (!ids || ids.length === 0) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No valid lead IDs provided for bulk deletion",
      });
      return;
    }

    connection = await pool.connect();
    const result = await connection.query(
      "SELECT public.fn_delete_leads_bulk($1::integer[]) AS count",
      [ids]
    );

    const deletedCount = Number(result.rows[0]?.count) || 0;

    ids.forEach((id) => {
      WorkflowService.triggerWorkflows('leads', 'delete', { id }).catch((e: any) => logger.error(e));
    });

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: `${deletedCount} lead(s) deleted successfully`,
      deletedCount,
      ids,
    });
  } catch (error: any) {
    logger.error(error, "deleteBulkLeads failed");
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to bulk delete leads",
    });
  } finally {
    connection?.release();
  }
};

const getLeadSources = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
    const leadId = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_lead_products($1)",
      [leadId]
    );
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
    const leadId = Number(req.params.id);
    const {
      product_id,
      quantity,
      price,
      warehouse_id,
      warehouse_location_id,
      is_recurring,
      billing_cycle,
      contract_duration,
      contract_start_date,
      contract_end_date,
      start_date,
      end_date,
    } = req.body;

    const result = await connection.query(
      "SELECT * FROM public.fn_add_lead_product($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        leadId,
        product_id,
        quantity || 1,
        price || null,
        warehouse_id ? Number(warehouse_id) : null,
        warehouse_location_id ? Number(warehouse_location_id) : null,
        is_recurring === true || is_recurring === "true",
        billing_cycle || null,
        contract_duration ? Number(contract_duration) : 1,
        contract_start_date || start_date || null,
        contract_end_date || end_date || null,
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    await connection.query("SELECT public.fn_deduct_lead_stock($1)", [leadId]);
    logger.info({ leadId }, "Warehouse stock successfully deducted for won lead");
  } catch (err: any) {
    logger.error({ err, leadId }, "Failed to deduct warehouse stock for won lead");
  }
};

const updateLeadStage = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
    const rawPipelineId = req.query.lead_pipeline_id || req.query.pipeline_id;
    const pipelineId = rawPipelineId ? Number(rawPipelineId) : null;
    const search = String(req.query.search || "");

    const id = req.query.id ? Number(req.query.id) : null;
    const lead_value = req.query.lead_value ? Number(req.query.lead_value) : null;
    const user_id = req.query.user_id ? Number(req.query.user_id) : null;
    const person_id = req.query.person_id ? Number(req.query.person_id) : null;
    const lead_type_id = req.query.lead_type_id ? Number(req.query.lead_type_id) : null;
    const lead_source_id = req.query.lead_source_id ? Number(req.query.lead_source_id) : null;
    const expected_close_date = req.query.expected_close_date ? String(req.query.expected_close_date) : null;
    const created_at = req.query.created_at ? String(req.query.created_at) : null;
    const lead_pipeline_stage_id = req.query.lead_pipeline_stage_id || req.query.stage_id ? Number(req.query.lead_pipeline_stage_id || req.query.stage_id) : null;
    const tag = req.query.tag ? String(req.query.tag) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_leads_kanban($1::int, $2::varchar, $3::int, $4::numeric, $5::int, $6::int, $7::int, $8::int, $9::date, $10::date, $11::int, $12::varchar)",
      [pipelineId, search, id, lead_value, user_id, person_id, lead_type_id, lead_source_id, expected_close_date, created_at, lead_pipeline_stage_id, tag]
    );

    if (result.rows.length > 0) {
      const leadIds = result.rows.map((r: any) => r.id);
      try {
        const enrichRes = await connection.query(
          `SELECT l.id, l.organization_id, org.name AS organization_name, l.custom_attributes 
           FROM leads l 
           LEFT JOIN organizations org ON org.id = l.organization_id 
           WHERE l.id = ANY($1::int[])`,
          [leadIds]
        );
        const enrichMap = new Map<number, any>();
        for (const row of enrichRes.rows) {
          enrichMap.set(row.id, row);
        }
        for (const row of result.rows) {
          const enriched = enrichMap.get(row.id);
          if (enriched) {
            row.organization_id = enriched.organization_id ?? row.organization_id ?? null;
            row.organization_name = enriched.organization_name ?? row.organization_name ?? null;
            row.custom_attributes = enriched.custom_attributes ?? row.custom_attributes ?? {};
          }
        }
      } catch (enrichErr) {
        logger.warn({ enrichErr }, "Failed to enrich kanban leads with organization and custom attributes");
      }
    }

    res.status(HttpStatusCodes.OK).json({ success: true, data: result.rows });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
  } finally {
    connection?.release();
  }
};

function mapRowToExtractedLead(
  row: Record<string, any>,
  rowIdx: number,
  originalFilename: string,
  dbAttributes: any[] = []
): ExtractedLeadData | null {
  if (!row || typeof row !== "object") return null;

  let title = "";
  let contactPerson = "";
  let email = "";
  let phone = "";
  let organization = "";
  let addressVal = "";
  let websiteVal = "";
  let leadValue: number | null = null;
  let description = "";
  let source = "";
  let type = "";
  let jobTitle = "";
  let expectedCloseDate = "";
  let stageVal = "";
  let pipelineVal = "";
  const products: ExtractedProduct[] = [];
  const customAttrs: Record<string, any> = {};

  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Ignore serial number or sequence row indicators
    if (["srno", "sno", "serialno", "no", "id", "leadid"].includes(k)) continue;

    // Title / Lead Title / Subject / Deal
    if (["leadtitle", "title", "subject", "leadname", "opportunity", "deal", "dealname", "project"].includes(k)) {
      title = strVal;
    }
    // Contact Person / Full Name / Person / Name
    else if (["contactperson", "contactname", "personname", "customername", "clientname", "fullname", "contact", "person"].includes(k)) {
      contactPerson = strVal;
    }
    else if (k === "name") {
      if (!contactPerson) contactPerson = strVal;
      else if (!title) title = strVal;
    }
    // Email
    else if (["email", "emailaddress", "workemail", "contactemail", "mail", "primaryemail", "emailid"].includes(k)) {
      email = strVal;
    }
    // Phone / Mobile / Contact Phone / Contact Number / Calls
    else if (["phone", "phonenumber", "mobile", "mobilenumber", "contactno", "contactphone", "contactnumber", "contactnumbers", "tel", "cell", "telephone", "whatsapp", "primaryphone", "calls", "phoneno", "mobileno", "phone_no", "mobile_no", "contact_no"].includes(k)) {
      phone = strVal;
    }
    // Organization / Company / Institute
    else if (["organization", "organizationname", "company", "companyname", "org", "business", "firm", "account", "client", "institute"].includes(k)) {
      organization = strVal;
    }
    // Stage / Pipeline Stage / Status
    else if (["stage", "leadstage", "pipelinestage", "leadpipelinestage", "pipeline_stage", "currentstage", "stagestatus"].includes(k)) {
      stageVal = strVal;
    }
    // Pipeline / Sales Pipeline
    else if (["pipeline", "leadpipeline", "pipelinename", "salespipeline"].includes(k)) {
      pipelineVal = strVal;
    }
    // Address / Location
    else if (["address", "location", "city", "street", "addr"].includes(k)) {
      addressVal = strVal;
    }
    // Website / URL
    else if (["website", "web", "url", "site", "portal"].includes(k)) {
      websiteVal = strVal;
    }
    // Lead Value / Amount / Deal Value
    else if (["leadvalue", "value", "amount", "dealvalue", "price", "budget", "revenue"].includes(k)) {
      const num = parseFloat(strVal.replace(/[^0-9.-]/g, ""));
      if (!isNaN(num)) leadValue = num;
    }
    // Description / Notes / Requirements / Message
    else if (["description", "notes", "note", "requirement", "requirements", "details", "message", "comments", "remark", "remarks"].includes(k)) {
      description = strVal;
    }
    // Source
    else if (["source", "leadsource"].includes(k)) {
      source = strVal;
    }
    // Type
    else if (["type", "leadtype"].includes(k)) {
      type = strVal;
    }
    // Designation / Job Title
    else if (["jobtitle", "designation", "position", "role"].includes(k)) {
      jobTitle = strVal;
    }
    // Expected Close Date
    else if (["expectedclosedate", "closedate", "expecteddate", "duedate"].includes(k)) {
      expectedCloseDate = strVal;
    }
    // Products / Item
    else if (["product", "products", "item", "items", "sku"].includes(k)) {
      products.push({ name: strVal, quantity: 1 });
    }

    // Match against database custom attributes
    const matchedAttr = dbAttributes.find((attr: any) => {
      const c = (attr.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const n = (attr.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return k === c || k === n;
    });

    if (matchedAttr) {
      customAttrs[matchedAttr.code] = strVal;
    } else {
      const standardCols = [
        "leadtitle", "title", "subject", "leadname", "opportunity", "deal", "dealname", "project",
        "contactperson", "contactname", "personname", "customername", "clientname", "fullname", "contact", "person", "name",
        "email", "emailaddress", "workemail", "contactemail", "mail", "primaryemail",
        "phone", "phonenumber", "mobile", "mobilenumber", "contactno", "contactphone", "contactnumber", "contactnumbers", "tel", "cell", "telephone", "whatsapp", "primaryphone", "calls", "phoneno", "mobileno", "phone_no", "mobile_no", "contact_no",
        "organization", "organizationname", "company", "companyname", "org", "business", "firm", "account", "client", "institute",
        "leadvalue", "value", "amount", "dealvalue", "price", "budget", "revenue",
        "description", "notes", "note", "requirement", "requirements", "details", "message", "comments", "remark", "remarks",
        "source", "leadsource", "type", "leadtype", "jobtitle", "designation", "position", "role",
        "expectedclosedate", "closedate", "expecteddate", "duedate",
        "product", "products", "item", "items", "sku",
        "stage", "leadstage", "pipelinestage", "leadpipelinestage", "pipeline_stage", "currentstage", "stagestatus",
        "pipeline", "leadpipeline", "pipelinename", "salespipeline"
      ];
      if (!standardCols.includes(k)) {
        const normCode = key.trim().toLowerCase().replace(/[\s\/-]+/g, "_").replace(/[^a-z0-9_]/g, "");
        if (normCode) {
          customAttrs[normCode] = strVal;
        }
      }
    }
  }

  // Ensure extracted standard fields that correspond to tenant custom attributes are also saved
  if (phone) {
    if (!customAttrs.phone_number) customAttrs.phone_number = phone;
    if (!customAttrs.phone) customAttrs.phone = phone;
  }
  if (email) {
    if (!customAttrs.email_id) customAttrs.email_id = email;
    if (!customAttrs.email) customAttrs.email = email;
  }
  if (addressVal) {
    if (!customAttrs.address) customAttrs.address = addressVal;
  }
  if (websiteVal) {
    if (!customAttrs.website) customAttrs.website = websiteVal;
  }

  // If the row has no identifying information at all, skip it
  if (!title && !contactPerson && !email && !phone && !organization && !description && Object.keys(customAttrs).length === 0) {
    return null;
  }

  if (!title) {
    title = organization || contactPerson || `Lead #${rowIdx + 1} from ${path.basename(originalFilename, path.extname(originalFilename))}`;
  }

  return {
    title,
    contactPerson,
    email,
    phone,
    organization,
    address: addressVal,
    website: websiteVal,
    leadValue,
    description: description || `Imported from Excel file ${originalFilename} (row ${rowIdx + 1})`,
    source,
    type,
    jobTitle,
    expectedCloseDate,
    products,
    stage: stageVal,
    pipeline: pipelineVal,
    custom_attributes: customAttrs,
  };
}

async function saveExtractedLeadRecord(
  connection: PoolClient,
  parsed: ExtractedLeadData,
  file: any,
  fileUrl: string,
  currentUserId: number | null
): Promise<{
  lead: any;
  personId: number | null;
  organizationId: number | null;
  personCreated: boolean;
  orgCreated: boolean;
  resolvedPersonName: string | null;
  leadTitle: string;
  createdProductsCount: number;
  attachedProductsCount: number;
}> {
  // 1. Check or create Organization
  let organizationId: number | null = null;
  let orgCreated = false;
  let orgCandidate = (parsed.organization && parsed.organization.trim())
    ? parsed.organization.trim()
    : (parsed.custom_attributes?.organization && String(parsed.custom_attributes.organization).trim())
    ? String(parsed.custom_attributes.organization).trim()
    : (parsed.custom_attributes?.company && String(parsed.custom_attributes.company).trim())
    ? String(parsed.custom_attributes.company).trim()
    : (parsed.custom_attributes?.institute && String(parsed.custom_attributes.institute).trim())
    ? String(parsed.custom_attributes.institute).trim()
    : "";

  if (!orgCandidate && parsed.title && !parsed.title.toLowerCase().startsWith("lead #")) {
    const titleParts = parsed.title.split(/[|–—]/);
    const candidate = titleParts[0].trim();
    if (candidate.length >= 2 && candidate.length <= 120) {
      orgCandidate = candidate;
    }
  }

  if (orgCandidate) {
    const existingOrgRes = await connection.query(
      "SELECT * FROM public.fn_find_organization_by_name($1)",
      [orgCandidate]
    );
    if (existingOrgRes.rows.length > 0) {
      organizationId = existingOrgRes.rows[0].id;
    } else {
      const addrJson = parsed.address ? JSON.stringify({ street: parsed.address }) : null;
      try {
        const newOrgRes = await connection.query(
          "SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result",
          [orgCandidate, addrJson, currentUserId, "{}"]
        );
        const newOrg = newOrgRes.rows[0]?.result;
        if (newOrg && newOrg.id) {
          organizationId = newOrg.id;
          orgCreated = true;
          WorkflowService.triggerWorkflows("organizations", "create", newOrg).catch((e) => logger.error(e));
        }
      } catch (orgErr) {
        // Fallback direct insert
        try {
          const directOrg = await connection.query(
            "INSERT INTO organizations (name, address, user_id, created_at, updated_at) VALUES ($1, $2::jsonb, $3, NOW(), NOW()) RETURNING id",
            [orgCandidate, addrJson, currentUserId]
          );
          if (directOrg.rows[0]?.id) {
            organizationId = directOrg.rows[0].id;
            orgCreated = true;
          }
        } catch {}
      }
    }
  }

  // 2. Check or create Person (Contact)
  let personId: number | null = null;
  let personCreated = false;
  let resolvedPersonName = parsed.contactPerson || null;

  if (parsed.email || parsed.phone || parsed.contactPerson) {
    const pFindRes = await connection.query(
      "SELECT * FROM public.fn_find_person_by_contact($1, $2, $3)",
      [parsed.email || null, parsed.phone || null, parsed.contactPerson || null]
    );
    if (pFindRes.rows.length > 0) {
      personId = pFindRes.rows[0].id;
      resolvedPersonName = pFindRes.rows[0].name;
    }

    // Parse phone numbers (handle multiple numbers separated by comma, semicolon, slash)
    const phoneArr: Array<{ label: string; value: string }> = [];
    if (parsed.phone) {
      const rawPhones = String(parsed.phone).split(/[,;/|]+/).map((p) => p.trim()).filter(Boolean);
      for (const p of rawPhones) {
        if (p && !phoneArr.some((x) => x.value === p)) {
          phoneArr.push({ label: "work", value: p });
        }
      }
    }
    // Parse emails (handle multiple emails separated by comma, semicolon)
    const emailArr: Array<{ label: string; value: string }> = [];
    if (parsed.email) {
      const rawEmails = String(parsed.email).split(/[,;/|]+/).map((e) => e.trim()).filter(Boolean);
      for (const e of rawEmails) {
        if (e && !emailArr.some((x) => x.value.toLowerCase() === e.toLowerCase())) {
          emailArr.push({ label: "work", value: e });
        }
      }
    }

    if (!personId && (parsed.contactPerson || parsed.email || parsed.phone)) {
      const newPersonName = parsed.contactPerson || (parsed.email ? parsed.email.split("@")[0] : (orgCandidate ? `${orgCandidate} Contact` : "New Contact"));

      try {
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
      } catch (pErr) {
        // Fallback direct insert
        try {
          const directP = await connection.query(
            "INSERT INTO persons (name, emails, contact_numbers, organization_id, job_title, user_id, created_at, updated_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, NOW(), NOW()) RETURNING id",
            [newPersonName, JSON.stringify(emailArr), JSON.stringify(phoneArr), organizationId || null, parsed.jobTitle || null, currentUserId]
          );
          if (directP.rows[0]?.id) {
            personId = directP.rows[0].id;
            resolvedPersonName = newPersonName;
            personCreated = true;
          }
        } catch {}
      }
    } else if (personId) {
      // If person already exists, enrich their contact_numbers, emails, and organization_id
      try {
        const pRes = await connection.query(
          "SELECT emails, contact_numbers, organization_id FROM persons WHERE id = $1",
          [personId]
        );
        if (pRes.rows.length > 0) {
          const rowP = pRes.rows[0];
          let curEmails: any[] = [];
          try {
            curEmails = Array.isArray(rowP.emails) ? rowP.emails : JSON.parse(rowP.emails || "[]");
          } catch { curEmails = []; }
          let curNumbers: any[] = [];
          try {
            curNumbers = Array.isArray(rowP.contact_numbers) ? rowP.contact_numbers : JSON.parse(rowP.contact_numbers || "[]");
          } catch { curNumbers = []; }

          const emailMap = new Map<string, string>();
          for (const item of [...curEmails, ...emailArr]) {
            const v = (typeof item === "object" ? item.value || item.email : String(item || "")).trim();
            if (v && !emailMap.has(v.toLowerCase())) {
              emailMap.set(v.toLowerCase(), item.label || "work");
            }
          }
          const mergedEmails = Array.from(emailMap.entries()).map(([value, label]) => ({ label, value }));

          const phoneMap = new Map<string, string>();
          for (const item of [...curNumbers, ...phoneArr]) {
            const v = (typeof item === "object" ? item.value || item.number || item.phone : String(item || "")).trim();
            if (v && !phoneMap.has(v.toLowerCase())) {
              phoneMap.set(v.toLowerCase(), item.label || "work");
            }
          }
          const mergedNumbers = Array.from(phoneMap.entries()).map(([value, label]) => ({ label, value }));

          const targetOrgId = organizationId || rowP.organization_id || null;

          await connection.query(
            "UPDATE persons SET emails = $1::jsonb, contact_numbers = $2::jsonb, organization_id = COALESCE($3, organization_id), updated_at = NOW() WHERE id = $4",
            [JSON.stringify(mergedEmails), JSON.stringify(mergedNumbers), targetOrgId, personId]
          );
        }
      } catch (pUpErr) {
        logger.warn({ pUpErr }, "[saveExtractedLeadRecord] Failed to enrich person contact info");
      }
    }
  }

  // Update organization attributes (website, phone, email) if organization exists
  if (organizationId && (parsed.website || parsed.phone || parsed.email)) {
    try {
      const orgRes = await connection.query("SELECT custom_attributes FROM organizations WHERE id = $1", [organizationId]);
      if (orgRes.rows.length > 0) {
        const existingAttrs = orgRes.rows[0].custom_attributes || {};
        const mergedOrgAttrs = { ...existingAttrs };
        if (parsed.website && !mergedOrgAttrs.website) mergedOrgAttrs.website = parsed.website;
        if (parsed.phone && !mergedOrgAttrs.phone) mergedOrgAttrs.phone = parsed.phone;
        if (parsed.email && !mergedOrgAttrs.email) mergedOrgAttrs.email = parsed.email;
        await connection.query(
          "UPDATE organizations SET custom_attributes = $1::jsonb, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(mergedOrgAttrs), organizationId]
        );
      }
    } catch (orgUpErr) {
      logger.warn({ orgUpErr }, "[saveExtractedLeadRecord] Failed to update organization attributes");
    }
  }

  // 3. Resolve Lead Source & Lead Type
  let sourceId: number | null = null;
  if (parsed.source && parsed.source.trim()) {
    const sRes = await connection.query(
      "SELECT * FROM public.fn_find_lead_source_by_name($1)",
      [parsed.source.trim()]
    );
    if (sRes.rows.length > 0) sourceId = sRes.rows[0].id;
  }

  let typeId: number | null = null;
  if (parsed.type && parsed.type.trim()) {
    const tRes = await connection.query(
      "SELECT * FROM public.fn_find_lead_type_by_name($1)",
      [parsed.type.trim()]
    );
    if (tRes.rows.length > 0) typeId = tRes.rows[0].id;
  }

  // 4. Resolve pipeline and stage
  const pipelineRes = await connection.query("SELECT * FROM public.fn_get_lead_pipelines()");
  let pipelineId: number | null = null;
  let stageId: number | null = null;

  const pipelines: any[] = pipelineRes.rows || [];
  let targetPipeline = null;
  if (parsed.pipeline && parsed.pipeline.trim()) {
    const pTrim = parsed.pipeline.trim().toLowerCase();
    targetPipeline = pipelines.find((p: any) => (p.name || "").toLowerCase() === pTrim);
  }
  if (!targetPipeline) {
    targetPipeline = pipelines.find((p: any) => p.is_default) || pipelines[0];
  }

  if (targetPipeline) {
    pipelineId = targetPipeline.id;
    const stageRes = await connection.query("SELECT * FROM public.fn_get_pipeline_stages($1)", [pipelineId]);
    const stages: any[] = stageRes.rows || [];

    if (parsed.stage && parsed.stage.trim()) {
      const sTrim = parsed.stage.trim().toLowerCase();
      const matchedStage = stages.find((s: any) => (s.name || "").toLowerCase() === sTrim);
      if (matchedStage) {
        stageId = matchedStage.id;
      } else {
        // Auto-create new stage in lead_pipeline_stages
        try {
          const maxOrderRes = await connection.query(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM lead_pipeline_stages WHERE pipeline_id = $1",
            [pipelineId]
          );
          const nextOrder = maxOrderRes.rows[0]?.next_order || 1;
          const insStageRes = await connection.query(
            "INSERT INTO lead_pipeline_stages (pipeline_id, name, color, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id",
            [pipelineId, parsed.stage.trim(), "#0088cc", nextOrder]
          );
          if (insStageRes.rows[0]?.id) {
            stageId = insStageRes.rows[0].id;
          }
        } catch (stageInsErr) {
          logger.warn({ stageInsErr }, "[saveExtractedLeadRecord] Failed to create new stage");
        }
      }
    }

    if (!stageId && stages.length > 0) {
      stageId = stages[0].id;
    }
  }

  const leadTitle = parsed.title || `Lead from ${path.basename(file.originalname, path.extname(file.originalname))}`;

  let validExpectedCloseDate: string | null = null;
  if (parsed.expectedCloseDate) {
    const parsedDate = new Date(parsed.expectedCloseDate);
    if (!isNaN(parsedDate.getTime())) {
      validExpectedCloseDate = parsedDate.toISOString().split("T")[0];
    }
  }

  // 5. Create Lead
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
    if (stageId) {
      await connection.query(
        "SELECT * FROM public.fn_update_lead_stage($1, $2, true, null)",
        [lead.id, stageId]
      );
    }

    // 5a. Save custom attributes to leads table and attribute_values table
    const finalCustomAttrs = { ...(parsed.custom_attributes || {}) };
    if (parsed.phone && !finalCustomAttrs.phone_number) finalCustomAttrs.phone_number = parsed.phone;
    if (parsed.email && !finalCustomAttrs.email_id) finalCustomAttrs.email_id = parsed.email;
    if (parsed.address && !finalCustomAttrs.address) finalCustomAttrs.address = parsed.address;
    if (parsed.website && !finalCustomAttrs.website) finalCustomAttrs.website = parsed.website;

    if (Object.keys(finalCustomAttrs).length > 0) {
      await connection.query(
        "UPDATE leads SET custom_attributes = $1::jsonb, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(finalCustomAttrs), lead.id]
      );
      lead.custom_attributes = finalCustomAttrs;

      try {
        await saveEntityAttributeValues(connection, "leads", lead.id, finalCustomAttrs);
      } catch (attrValErr) {
        logger.warn({ attrValErr }, "Failed to save attribute_values records for lead");
      }
    } else {
      lead.custom_attributes = {};
    }

    // Enrich lead return with organization_name and person_name
    lead.organization_id = organizationId;
    lead.person_id = personId;
    if (organizationId) {
      const orgLookup = await connection.query("SELECT name FROM organizations WHERE id = $1", [organizationId]);
      lead.organization_name = orgLookup.rows[0]?.name || orgCandidate || null;
    } else {
      lead.organization_name = null;
    }
    lead.person_name = resolvedPersonName || parsed.contactPerson || null;

    if (Array.isArray(parsed.products) && parsed.products.length > 0) {
      for (const prod of parsed.products) {
        if (!prod.name || !prod.name.trim()) continue;
        const pName = prod.name.trim();
        const pSku = prod.sku?.trim() || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const pQty = Number(prod.quantity) || 1;
        const pPrice = prod.price !== undefined && prod.price !== null ? Number(prod.price) : null;

        let prodId: number | null = null;
        const pCheck = await connection.query(
          "SELECT * FROM public.fn_find_product_by_name_or_sku($1, $2)",
          [pName, pSku]
        );

        if (pCheck.rows.length > 0) {
          prodId = pCheck.rows[0].id;
        } else {
          const newProdRes = await connection.query(
            "SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)",
            [pSku, pName, prod.description || `Extracted from ${file.originalname}`, pQty, pPrice]
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

    WorkflowService.triggerWorkflows("leads", "create", {
      ...lead,
      person_id: personId,
      organization_id: organizationId,
    }).catch((e) => logger.error(e));
  }

  return {
    lead,
    personId,
    organizationId,
    personCreated,
    orgCreated,
    resolvedPersonName,
    leadTitle,
    createdProductsCount,
    attachedProductsCount,
  };
}

const createLeadByAI = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }

    const file = (req as any).file;

    if (!file) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No file uploaded. Please provide an Excel (.xlsx, .xls, .csv), PDF, Word, or image file.",
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
    const currentUserId = (req as any).user?.id || null;
    const ext = path.extname(file.originalname).toLowerCase();
    const isExcelOrCsv = ext === ".xlsx" || ext === ".xls" || ext === ".csv";

    // Query active lead attributes from DB for matching
    const { rows: dbAttributes } = await connection.query(
      "SELECT id, code, name, type FROM attributes WHERE entity_type = 'leads'"
    );

    const leadItems: ExtractedLeadData[] = [];

    // 1. Process Excel / CSV files
    if (isExcelOrCsv && fileBuffer) {
      try {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = sheetName ? workbook.Sheets[sheetName] : null;

        if (worksheet) {
          const sheet2d: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          let headerRowIndex = 0;
          let maxCols = 0;

          // Scan the first 10 rows to detect the true header row with maximum column names
          for (let r = 0; r < Math.min(sheet2d.length, 10); r++) {
            const rowVals = sheet2d[r] || [];
            const nonBlankCount = rowVals.filter((c: any) => c !== undefined && c !== null && String(c).trim() !== "").length;
            if (nonBlankCount > maxCols) {
              maxCols = nonBlankCount;
              headerRowIndex = r;
            }
          }

          let rawRows: any[] = [];
          if (maxCols >= 2 && headerRowIndex < sheet2d.length) {
            const headerRow = sheet2d[headerRowIndex].map((h: any, colIdx: number) => {
              const str = String(h || "").trim();
              return str || `col_${colIdx + 1}`;
            });

            for (let r = headerRowIndex + 1; r < sheet2d.length; r++) {
              const rowData = sheet2d[r] || [];
              const isAllBlank = rowData.every((c: any) => c === undefined || c === null || String(c).trim() === "");
              if (isAllBlank) continue;

              const rowObj: Record<string, any> = {};
              headerRow.forEach((colName: string, cIdx: number) => {
                rowObj[colName] = rowData[cIdx] !== undefined ? rowData[cIdx] : "";
              });
              rawRows.push(rowObj);
            }
          } else {
            rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          }

          if (Array.isArray(rawRows) && rawRows.length > 0) {
            for (let i = 0; i < rawRows.length; i++) {
              const mapped = mapRowToExtractedLead(rawRows[i], i, file.originalname, dbAttributes);
              if (mapped) {
                leadItems.push(mapped);
              }
            }
          }

          // If no tabular rows were extracted, fallback to converting entire sheet to CSV text
          if (leadItems.length === 0) {
            const sheetCsv = XLSX.utils.sheet_to_csv(worksheet);
            const parsed = parseLeadDocumentText(sheetCsv, file.originalname);
            if (parsed && (parsed.title || parsed.contactPerson || parsed.email || parsed.phone || parsed.organization)) {
              leadItems.push(parsed);
            }
          }
        }
      } catch (excelErr: any) {
        logger.warn(`[createLeadByAI] Excel parsing warning: ${excelErr.message}`);
      }
    }

    // 2. Process PDF, Word, Image, or fallback documents
    if (leadItems.length === 0 && fileBuffer) {
      const extractedText = extractTextFromBuffer(fileBuffer, file.originalname);
      const parsed = parseLeadDocumentText(extractedText, file.originalname);
      leadItems.push(parsed);
    }

    if (leadItems.length === 0) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No lead details could be extracted from the file. Please ensure it contains data such as contact person, email, phone, or company name.",
      });
      return;
    }

    // 3. Create leads in database
    const createdResults: any[] = [];
    for (const item of leadItems) {
      try {
        const result = await saveExtractedLeadRecord(connection, item, file, fileUrl, currentUserId);
        if (result.lead) {
          createdResults.push(result);
        }
      } catch (leadSaveErr: any) {
        logger.error({ leadSaveErr, item }, "[createLeadByAI] Failed to save lead item");
      }
    }

    if (createdResults.length === 0) {
      res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create lead from file data.",
      });
      return;
    }

    const firstResult = createdResults[0];
    const msg = createdResults.length > 1
      ? `${createdResults.length} leads successfully created from ${file.originalname}`
      : `Lead "${firstResult.leadTitle}" created successfully`;

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: msg,
      data: {
        ...firstResult.lead,
        person_id: firstResult.personId,
        organization_id: firstResult.organizationId,
        productsCount: firstResult.attachedProductsCount,
        createdCount: createdResults.length,
        leads: createdResults.map((r) => r.lead),
        extracted: leadItems[0],
      },
    });
  } catch (error: any) {
    logger.error(error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process lead file upload",
    });
  } finally {
    connection?.release();
  }
};

const uploadLeadFile = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
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
      try {
        fs.renameSync(file.path, destPath);
      } catch {
        fs.copyFileSync(file.path, destPath);
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
    } else if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    }

    const fileUrl = `/uploads/leads/${uniqueName}`;

    const safeTitle = (file.originalname || "Attached File").substring(0, 200);

    let validUserId = (req as any).user?.id ? Number((req as any).user.id) : null;
    if (validUserId) {
      try {
        const uCheck = await connection.query("SELECT id FROM users WHERE id = $1", [validUserId]);
        if (uCheck.rows.length === 0) validUserId = null;
      } catch {
        validUserId = null;
      }
    }

    let actData: any = null;
    try {
      const actRes = await connection.query(
        "SELECT * FROM public.fn_create_activity($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          safeTitle,
          "file",
          fileUrl,
          null,
          null,
          true,
          validUserId,
          null,
          leadId,
          null,
        ]
      );
      actData = actRes.rows[0];
    } catch (fnErr: any) {
      logger.warn(`fn_create_activity fallback for file: ${fnErr.message}`);
      const insRes = await connection.query(
        `INSERT INTO activities (title, type, comment, is_done, user_id, created_at, updated_at)
         VALUES ($1, 'file', $2, true, $3, NOW(), NOW()) RETURNING *`,
        [safeTitle, fileUrl, validUserId]
      );
      actData = insRes.rows[0];
      if (actData && leadId) {
        await connection.query(
          "INSERT INTO lead_activities (activity_id, lead_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [actData.id, leadId]
        );
      }
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "File attached successfully to lead.",
      data: actData,
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

const parseVoiceLead = async (req: Request, res: Response): Promise<void> => {
  try {
    let transcript = req.body?.transcript || "";
    const audioFile = (req as any).file;

    if (!transcript && audioFile && audioFile.path) {
      try {
        const configMap = await configService.getAllConfigs();
        const apiKey =
          (configMap["general.magic_ai.settings.api_key"] ? String(configMap["general.magic_ai.settings.api_key"]) : "") ||
          process.env.OPENAI_API_KEY;
        if (apiKey) {
          const transcribed = await transcribeAudioWithWhisper(audioFile.path, apiKey);
          if (transcribed) {
            transcript = transcribed;
          }
        }
      } catch (e: any) {
        logger.warn(`Audio transcription failed: ${e.message}`);
      }
    }

    if (!transcript || !transcript.trim()) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No voice transcript or audio provided. Please speak or provide a transcript.",
      });
      return;
    }

    const language = req.body?.language || "auto";
    const extracted = await parseVoiceTranscript(transcript, language);

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Voice transcript processed successfully",
      data: extracted,
    });
  } catch (error: any) {
    logger.error(`Error parsing voice lead: ${error.message}`);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process voice transcript",
    });
  }
};

const createLeadByVoice = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const tenantId = (req as any).user?.tenant_id;
    if (tenantId) {
      await connection.query("SELECT set_config('app.current_tenant_id', $1, true)", [String(tenantId)]);
    }
    const currentUserId = (req as any).user?.id || null;

    let transcript = req.body?.transcript || "";
    const language = req.body?.language || "auto";
    const audioFile = (req as any).file;

    if (!transcript && audioFile && audioFile.path) {
      try {
        const configMap = await configService.getAllConfigs();
        const apiKey =
          (configMap["general.magic_ai.settings.api_key"] ? String(configMap["general.magic_ai.settings.api_key"]) : "") ||
          process.env.OPENAI_API_KEY;
        if (apiKey) {
          const transcribed = await transcribeAudioWithWhisper(audioFile.path, apiKey);
          if (transcribed) {
            transcript = transcribed;
          }
        }
      } catch (e: any) {
        logger.warn(`Audio transcription failed: ${e.message}`);
      }
    }

    // Extract default values from transcript if fields are not explicitly provided
    let extracted: Partial<IVoiceLeadExtractedData> = {};
    if (transcript && transcript.trim()) {
      extracted = await parseVoiceTranscript(transcript, language);
    }

    let title = (req.body?.title || extracted.title || "New Voice Lead").trim();
    let personName = (req.body?.personName || req.body?.person_name || extracted.personName || "").trim();
    const contactEmail = (req.body?.contactEmail || req.body?.email || extracted.contactEmail || "").trim();
    const contactPhone = (req.body?.contactPhone || req.body?.phone || extracted.contactPhone || "").trim();
    let organizationName = (req.body?.organizationName || req.body?.organization_name || extracted.organizationName || "").trim();
    const leadValue = req.body?.leadValue !== undefined && req.body?.leadValue !== ""
      ? Number(req.body.leadValue)
      : (extracted.leadValue !== undefined && extracted.leadValue !== null ? Number(extracted.leadValue) : null);
    let description = (req.body?.description || extracted.description || transcript || "Created via Voice Assistant").trim();
    const expectedCloseDate = req.body?.expectedCloseDate || req.body?.expected_close_date || extracted.expectedCloseDate || null;
    const reqPipelineId = req.body?.lead_pipeline_id || req.body?.pipeline_id || null;
    const reqStageId = req.body?.lead_pipeline_stage_id || req.body?.stage_id || null;

    // Ensure all saved fields are translated to English
    if (title && /[^\u0000-\u007F]/.test(title)) {
      try {
        title = await translateToEnglish(title, language);
      } catch (e) {}
    }
    if (personName && /[^\u0000-\u007F]/.test(personName)) {
      try {
        personName = await translateToEnglish(personName, language);
      } catch (e) {}
    }
    if (organizationName && /[^\u0000-\u007F]/.test(organizationName)) {
      try {
        organizationName = await translateToEnglish(organizationName, language);
      } catch (e) {}
    }
    if (description && /[^\u0000-\u007F]/.test(description)) {
      try {
        description = await translateToEnglish(description, language);
      } catch (e) {}
    }

    // 1. Resolve or Create Organization
    let organizationId: number | null = null;
    if (organizationName) {
      const existingOrgRes = await connection.query(
        "SELECT * FROM public.fn_find_organization_by_name($1)",
        [organizationName]
      );
      if (existingOrgRes.rows.length > 0) {
        organizationId = existingOrgRes.rows[0].id;
      } else {
        const newOrgRes = await connection.query(
          "SELECT save_organization($1, $2::jsonb, $3, $4::jsonb) as result",
          [organizationName, null, currentUserId, "{}"]
        );
        const newOrg = newOrgRes.rows[0]?.result;
        if (newOrg && newOrg.id) {
          organizationId = newOrg.id;
          WorkflowService.triggerWorkflows("organizations", "create", newOrg).catch((e) => logger.error(e));
        }
      }
    }

    // 2. Resolve or Create Person (Contact)
    let personId: number | null = null;
    let resolvedPersonName = personName || null;

    if (contactEmail || contactPhone || personName) {
      const pFindRes = await connection.query(
        "SELECT * FROM public.fn_find_person_by_contact($1, $2, $3, $4)",
        [contactEmail || null, contactPhone || null, personName || null, organizationId || null]
      );
      if (pFindRes.rows.length > 0) {
        personId = pFindRes.rows[0].id;
        resolvedPersonName = pFindRes.rows[0].name;
        if (organizationId && !pFindRes.rows[0].organization_id) {
          await connection.query(
            "SELECT save_person(null, null, null, $1, null, null, null, $2) as result",
            [organizationId, personId]
          );
        }
      } else {
        const newPersonName = personName || (contactEmail ? contactEmail.split("@")[0] : "Voice Contact");
        const emailArr = contactEmail ? [{ label: "work", value: contactEmail }] : [];
        const phoneArr = contactPhone ? [{ label: "work", value: contactPhone }] : [];

        const newPersonRes = await connection.query(
          "SELECT save_person($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7::jsonb) as result",
          [
            newPersonName,
            JSON.stringify(emailArr),
            JSON.stringify(phoneArr),
            organizationId || null,
            null,
            currentUserId,
            "{}",
          ]
        );
        const newPerson = newPersonRes.rows[0]?.result;
        if (newPerson && newPerson.id) {
          personId = newPerson.id;
          resolvedPersonName = newPerson.name;
          WorkflowService.triggerWorkflows("persons", "create", newPerson).catch((e) => logger.error(e));
        }
      }
    } else if (personId && organizationId) {
      await connection.query(
        "SELECT save_person(null, null, null, $1, null, null, null, $2) as result",
        [organizationId, personId]
      );
    }

    // 3. Resolve Lead Source (Find "Voice" or default)
    let sourceId: number | null = null;
    const sRes = await connection.query(
      "SELECT * FROM public.fn_find_lead_source_by_name($1)",
      ["Voice"]
    );
    if (sRes.rows.length > 0) {
      sourceId = sRes.rows[0].id;
    }

    // 4. Resolve default pipeline and first stage
    let pipelineId: number | null = reqPipelineId ? Number(reqPipelineId) : null;
    let stageId: number | null = reqStageId ? Number(reqStageId) : null;

    if (!pipelineId) {
      const pipelineRes = await connection.query("SELECT * FROM public.fn_get_lead_pipelines()");
      const defaultPipeline = pipelineRes.rows.find((p: any) => p.is_default) || pipelineRes.rows[0];
      if (defaultPipeline) {
        pipelineId = defaultPipeline.id;
      }
    }

    if (pipelineId && !stageId) {
      const stageRes = await connection.query("SELECT * FROM public.fn_get_pipeline_stages($1)", [pipelineId]);
      if (stageRes.rows.length > 0) {
        stageId = stageRes.rows[0].id;
      }
    }

    let validExpectedCloseDate: string | null = null;
    if (expectedCloseDate) {
      const parsedDate = new Date(expectedCloseDate);
      if (!isNaN(parsedDate.getTime())) {
        validExpectedCloseDate = parsedDate.toISOString().split("T")[0];
      }
    }

    // 5. Create Lead in PostgreSQL
    const leadResult = await connection.query(
      "SELECT * FROM public.fn_create_lead($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        title,
        description,
        leadValue || null,
        currentUserId,
        personId,
        sourceId,
        null, // type_id
        pipelineId,
        validExpectedCloseDate,
        organizationId,
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

      WorkflowService.triggerWorkflows("leads", "create", lead).catch((e) => logger.error(e));
      notifyCRMActivity({
        title: "New Lead Created via Voice",
        message: `Lead "${title}" was created via Voice Assistant.`,
        module: "lead",
        entityId: lead.id,
      }).catch((e) => logger.error(e));
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Lead successfully saved",
      data: lead,
    });
  } catch (error: any) {
    logger.error(`Error creating voice lead: ${error.message}`);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to create lead via voice",
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
  deleteBulkLeads,
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
  parseVoiceLead,
  createLeadByVoice,
};
