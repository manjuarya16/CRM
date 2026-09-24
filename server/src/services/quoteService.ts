import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IQuoteCreateInput, IQuoteUpdateInput } from "@/interfaces/quoteInterface";
import { notifyCRMActivity } from "@/utils/notificationHelper";

const logger = pino();

const getQuotes = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const search = String(req.query.search || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 10);

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_quotes($1, $2, $3)",
      [search, page, limit]
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
    if (quoteData && (quoteData.custom_attributes === undefined || quoteData.custom_attributes === null)) {
      const qRes = await connection.query("SELECT custom_attributes FROM quotes WHERE id = $1", [id]);
      quoteData.custom_attributes = qRes.rows[0]?.custom_attributes || {};
    }

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
      discount_percent,
      discount_amount,
      tax_amount,
      adjustment_amount,
      sub_total,
      grand_total,
      expired_at,
      custom_attributes,
    }: IQuoteCreateInput & { custom_attributes?: any } = req.body;

    const currentUserId = (req as any).user?.id || user_id || null;

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
    if (createdQuote?.id && custom_attributes) {
      const customAttrsJson = JSON.stringify(custom_attributes);
      await connection.query(
        "UPDATE quotes SET custom_attributes = $1::jsonb WHERE id = $2",
        [customAttrsJson, createdQuote.id]
      );
      createdQuote.custom_attributes = custom_attributes;
    }

    if (createdQuote) {
      notifyCRMActivity({
        title: "New Quote Generated",
        message: `Quote "${subject}" for ${grand_total ? `$${grand_total}` : 'customer'} was generated.`,
        module: "quote",
        entityId: createdQuote.id,
        actionType: "created",
        userId: user_id || null,
        createdBy: (req as any).user?.id || null,
      });
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
      discount_percent,
      discount_amount,
      tax_amount,
      adjustment_amount,
      sub_total,
      grand_total,
      expired_at,
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
    if (id && custom_attributes !== undefined) {
      const customAttrsJson = JSON.stringify(custom_attributes || {});
      await connection.query(
        "UPDATE quotes SET custom_attributes = $1::jsonb WHERE id = $2",
        [customAttrsJson, id]
      );
      if (updatedQuote) updatedQuote.custom_attributes = custom_attributes;
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
