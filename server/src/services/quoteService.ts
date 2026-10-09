import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IQuoteCreateInput, IQuoteUpdateInput } from "@/interfaces/quoteInterface";
import { notifyCRMActivity } from "@/utils/notificationHelper";
import { processWorkflowsForEvent } from "@/services/workflowEngine";
import { WorkflowService } from "@/services/workflow.service";

const logger = pino();

const getQuotes = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const search = String(req.query.search || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 10);
    const leadId = req.query.lead_id ? Number(req.query.lead_id) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_quotes($1, $2, $3, $4)",
      [search || null, page, limit, leadId]
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

const getQuoteById = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_quote_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Quote not found",
      });
      return;
    }

    const quoteData = result.rows[0];

    // Fetch quote line items using DB function
    const itemsRes = await connection.query(
      "SELECT * FROM public.fn_get_quote_items($1)",
      [id]
    );
    quoteData.items = itemsRes.rows || [];

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: quoteData,
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

const createQuote = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const {
      subject,
      description,
      person_id,
      user_id,
      lead_id,
      billing_address,
      shipping_address,
      discount_percent,
      discount_amount,
      tax_amount,
      adjustment_amount,
      sub_total,
      grand_total,
      expired_at,
      items,
      custom_attributes,
    }: IQuoteCreateInput & { custom_attributes?: any } = req.body;

    const currentUserId = user_id || (req as any).user?.id || null;
    const billingAddressJson = JSON.stringify(billing_address || {});
    const shippingAddressJson = JSON.stringify(shipping_address || {});
    const customAttributesJson = JSON.stringify(custom_attributes || {});

    let validPersonId = person_id ? Number(person_id) : null;
    if (validPersonId && Number.isFinite(validPersonId)) {
      const personCheckResult = await connection.query("SELECT get_person($1::integer) as result", [validPersonId]);
      if (!personCheckResult.rows[0]?.result?.id) validPersonId = null;
    } else {
      validPersonId = null;
    }

    let validLeadId = lead_id ? Number(lead_id) : null;
    if (validLeadId && Number.isFinite(validLeadId)) {
      const leadCheckResult = await connection.query("SELECT id FROM public.fn_get_lead_by_id($1)", [validLeadId]);
      if (leadCheckResult.rows.length === 0) validLeadId = null;
    } else {
      validLeadId = null;
    }

    const result = await connection.query(
      "SELECT * FROM public.fn_create_quote($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb)",
      [
        subject,
        description || null,
        validPersonId,
        currentUserId,
        discount_percent || 0,
        discount_amount || 0,
        tax_amount || 0,
        adjustment_amount || 0,
        sub_total || 0,
        grand_total || 0,
        expired_at || null,
        validLeadId,
        billingAddressJson,
        shippingAddressJson,
        customAttributesJson,
      ]
    );

    const createdQuote = result.rows[0];
    if (createdQuote?.id) {
      if (Array.isArray(items) && items.length > 0) {
        await connection.query("SELECT public.fn_save_quote_items($1, $2::jsonb)", [
          createdQuote.id,
          JSON.stringify(items),
        ]);
      }

      createdQuote.items = items;

      notifyCRMActivity({
        title: "New Quote Generated",
        message: `Quote "${subject}" for ${grand_total ? `$${grand_total}` : 'customer'} was generated.`,
        module: "quote",
        entityId: createdQuote.id,
        actionType: "created",
        userId: currentUserId || null,
        createdBy: (req as any).user?.id || null,
      });

      processWorkflowsForEvent('quotes', 'created', createdQuote.id, (req as any).user).catch(() => { });
      WorkflowService.triggerWorkflows('quotes', 'create', createdQuote).catch((e) => logger.error(e));
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Quote created successfully",
      data: createdQuote,
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

const updateQuote = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    const {
      subject,
      description,
      person_id,
      user_id,
      lead_id,
      billing_address,
      shipping_address,
      discount_percent,
      discount_amount,
      tax_amount,
      adjustment_amount,
      sub_total,
      grand_total,
      expired_at,
      items,
      custom_attributes,
    }: IQuoteUpdateInput & { custom_attributes?: any } = req.body;

    const billingAddressJson = billing_address ? JSON.stringify(billing_address) : null;
    const shippingAddressJson = shipping_address ? JSON.stringify(shipping_address) : null;
    const customAttributesJson = custom_attributes ? JSON.stringify(custom_attributes) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_update_quote($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16::jsonb)",
      [
        id,
        subject ?? null,
        description ?? null,
        person_id ?? null,
        user_id ?? null,
        discount_percent ?? null,
        discount_amount ?? null,
        tax_amount ?? null,
        adjustment_amount ?? null,
        sub_total ?? null,
        grand_total ?? null,
        expired_at ?? null,
        lead_id ? Number(lead_id) : null,
        billingAddressJson,
        shippingAddressJson,
        customAttributesJson,
      ]
    );

    const updatedQuote = result.rows[0];
    if (id) {
      if (Array.isArray(items)) {
        await connection.query("SELECT public.fn_save_quote_items($1, $2::jsonb)", [
          id,
          JSON.stringify(items),
        ]);
      }

      if (updatedQuote) {
        updatedQuote.items = items;
      }
      WorkflowService.triggerWorkflows('quotes', 'update', updatedQuote || { id }).catch((e) => logger.error(e));
      processWorkflowsForEvent('quotes', 'updated', id, (req as any).user).catch(() => { });
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Quote updated successfully",
      data: updatedQuote,
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

const deleteQuote = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    await connection.query(
      "SELECT public.fn_delete_quote($1) AS deleted",
      [id]
    );

    WorkflowService.triggerWorkflows('quotes', 'delete', { id }).catch((e) => logger.error(e));

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Quote deleted successfully",
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

const getQuoteItems = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const quoteId = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_quote_items($1)",
      [quoteId]
    );

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: result.rows,
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

const addQuoteItem = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const quoteId = Number(req.params.id);
    const { product_id, sku, name, quantity, price, discount_percent, tax_percent } = req.body;

    const result = await connection.query(
      "SELECT * FROM public.fn_add_quote_item($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        quoteId,
        product_id,
        sku || null,
        name || null,
        quantity || 1,
        price || 0,
        discount_percent || 0,
        tax_percent || 0,
      ]
    );

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Quote item added successfully",
      data: result.rows[0],
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

const deleteQuoteItem = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const itemId = Number(req.params.itemId);
    await connection.query(
      "SELECT public.fn_delete_quote_item($1) AS deleted",
      [itemId]
    );

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Quote item deleted successfully",
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
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  getQuoteItems,
  addQuoteItem,
  deleteQuoteItem,
};
