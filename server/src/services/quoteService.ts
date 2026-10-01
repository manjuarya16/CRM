import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IQuoteCreateInput, IQuoteUpdateInput } from "@/interfaces/quoteInterface";
import { notifyCRMActivity } from "@/utils/notificationHelper";
import { processWorkflowsForEvent } from "@/utils/workflowEngine";
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

    let result;
    if (leadId) {
      result = await connection.query(
        `SELECT q.id, q.subject, q.description, q.lead_id, q.person_id, q.user_id,
                q.discount_percent, q.discount_amount, q.tax_amount, q.adjustment_amount,
                q.sub_total, q.grand_total, q.expired_at, q.created_at, q.updated_at,
                p.name AS person_name, u.name AS user_name,
                COUNT(*) OVER() AS total_count
         FROM quotes q
         LEFT JOIN persons p ON p.id = q.person_id
         LEFT JOIN users u ON u.id = q.user_id
         WHERE q.lead_id = $1 
            OR q.id IN (SELECT quote_id FROM lead_quotes WHERE lead_id = $1)
         ORDER BY q.id DESC
         LIMIT $2 OFFSET $3`,
        [leadId, limit, (page - 1) * limit]
      );
    } else {
      result = await connection.query(
        `SELECT q.id, q.subject, q.description, q.lead_id, q.person_id, q.user_id,
                q.discount_percent, q.discount_amount, q.tax_amount, q.adjustment_amount,
                q.sub_total, q.grand_total, q.expired_at, q.created_at, q.updated_at,
                p.name AS person_name, u.name AS user_name,
                COUNT(*) OVER() AS total_count
         FROM quotes q
         LEFT JOIN persons p ON p.id = q.person_id
         LEFT JOIN users u ON u.id = q.user_id
         WHERE ($1 = '' OR q.subject ILIKE '%' || $1 || '%' OR p.name ILIKE '%' || $1 || '%')
         ORDER BY q.id DESC
         LIMIT $2 OFFSET $3`,
        [search, limit, (page - 1) * limit]
      );
    }

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

    // Fetch full quote columns (addresses, lead_id, custom attributes)
    const qRes = await connection.query(
      "SELECT billing_address, shipping_address, lead_id, user_id, custom_attributes FROM quotes WHERE id = $1",
      [id]
    );
    if (qRes.rows.length > 0) {
      quoteData.billing_address = qRes.rows[0].billing_address || {};
      quoteData.shipping_address = qRes.rows[0].shipping_address || {};
      quoteData.lead_id = qRes.rows[0].lead_id || quoteData.lead_id || null;
      if (qRes.rows[0].user_id) quoteData.user_id = qRes.rows[0].user_id;
      quoteData.custom_attributes = qRes.rows[0].custom_attributes || quoteData.custom_attributes || {};
    }

    // Fetch quote line items
    const itemsRes = await connection.query(
      `SELECT qi.*, p.name as product_name
       FROM quote_items qi
       LEFT JOIN products p ON p.id = qi.product_id
       WHERE qi.quote_id = $1
       ORDER BY qi.id ASC`,
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

    const result = await connection.query(
      "SELECT * FROM public.fn_create_quote($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        subject,
        description || null,
        person_id || null,
        currentUserId,
        discount_percent || 0,
        discount_amount || 0,
        tax_amount || 0,
        adjustment_amount || 0,
        sub_total || 0,
        grand_total || 0,
        expired_at || null,
      ]
    );

    const createdQuote = result.rows[0];
    if (createdQuote?.id) {
      const bAddrJson = JSON.stringify(billing_address || {});
      const sAddrJson = JSON.stringify(shipping_address || {});
      const customAttrsJson = JSON.stringify(custom_attributes || {});

      await connection.query(
        `UPDATE quotes
         SET billing_address = $1::jsonb,
             shipping_address = $2::jsonb,
             lead_id = $3,
             user_id = COALESCE($4, user_id),
             custom_attributes = $5::jsonb
         WHERE id = $6`,
        [bAddrJson, sAddrJson, lead_id ? Number(lead_id) : null, currentUserId ? Number(currentUserId) : null, customAttrsJson, createdQuote.id]
      );

      if (lead_id) {
        await connection.query(
          "INSERT INTO lead_quotes (quote_id, lead_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [createdQuote.id, Number(lead_id)]
        ).catch(() => { });
      }

      // Insert line items
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (!item.product_id) continue;
          await connection.query(
            `INSERT INTO quote_items (quote_id, product_id, sku, name, quantity, price, discount_percent, discount_amount, tax_percent, tax_amount, total, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              createdQuote.id,
              Number(item.product_id),
              item.sku || null,
              item.name || "Product",
              Number(item.quantity) || 1,
              Number(item.price) || 0,
              Number(item.discount_percent) || 0,
              Number(item.discount_amount) || 0,
              Number(item.tax_percent) || 0,
              Number(item.tax_amount) || 0,
              Number(item.total) || 0,
            ]
          );
        }
      }

      createdQuote.billing_address = billing_address;
      createdQuote.shipping_address = shipping_address;
      createdQuote.lead_id = lead_id;
      createdQuote.user_id = currentUserId;
      createdQuote.custom_attributes = custom_attributes;
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

    const result = await connection.query(
      "SELECT * FROM public.fn_update_quote($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
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
      ]
    );

    const updatedQuote = result.rows[0];
    if (id) {
      const bAddrJson = JSON.stringify(billing_address || {});
      const sAddrJson = JSON.stringify(shipping_address || {});
      const customAttrsJson = JSON.stringify(custom_attributes || {});

      await connection.query(
        `UPDATE quotes
         SET billing_address = $1::jsonb,
             shipping_address = $2::jsonb,
             lead_id = $3,
             user_id = COALESCE($4, user_id),
             custom_attributes = $5::jsonb
         WHERE id = $6`,
        [bAddrJson, sAddrJson, lead_id ? Number(lead_id) : null, user_id ? Number(user_id) : null, customAttrsJson, id]
      );

      // Sync line items
      if (Array.isArray(items)) {
        await connection.query("DELETE FROM quote_items WHERE quote_id = $1", [id]);
        for (const item of items) {
          if (!item.product_id) continue;
          await connection.query(
            `INSERT INTO quote_items (quote_id, product_id, sku, name, quantity, price, discount_percent, discount_amount, tax_percent, tax_amount, total, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              id,
              Number(item.product_id),
              item.sku || null,
              item.name || "Product",
              Number(item.quantity) || 1,
              Number(item.price) || 0,
              Number(item.discount_percent) || 0,
              Number(item.discount_amount) || 0,
              Number(item.tax_percent) || 0,
              Number(item.tax_amount) || 0,
              Number(item.total) || 0,
            ]
          );
        }
      }

      if (updatedQuote) {
        updatedQuote.billing_address = billing_address;
        updatedQuote.shipping_address = shipping_address;
        updatedQuote.lead_id = lead_id;
        updatedQuote.user_id = user_id;
        updatedQuote.custom_attributes = custom_attributes;
        updatedQuote.items = items;
      }
      WorkflowService.triggerWorkflows('quotes', 'update', updatedQuote || { id }).catch((e) => logger.error(e));
    }

    if (id) {
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
