import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IProductCreateInput, IProductUpdateInput } from "@/interfaces/productInterface";

const logger = pino();

const getProducts = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const search = String(req.query.search || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit || req.query.per_page) || 10);

    const result = await connection.query(
      "SELECT * FROM public.fn_get_all_products($1, $2, $3)",
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

const getProductById = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_product_by_id($1)",
      [id]
    );

    if (result.rows.length === 0) {
      res.status(HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const productData = result.rows[0];
    if (productData && (productData.custom_attributes === undefined || productData.custom_attributes === null)) {
      const pRes = await connection.query("SELECT custom_attributes FROM products WHERE id = $1", [id]);
      productData.custom_attributes = pRes.rows[0]?.custom_attributes || {};
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: productData,
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

const createProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const {
      sku,
      name,
      description,
      quantity,
      price,
      custom_attributes,
    }: IProductCreateInput & { custom_attributes?: any } = req.body;

    const result = await connection.query(
      "SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)",
      [
        sku,
        name || null,
        description || null,
        quantity || 0,
        price || null,
      ]
    );

    const createdProduct = result.rows[0];
    if (createdProduct?.id && custom_attributes) {
      const customAttrsJson = JSON.stringify(custom_attributes);
      await connection.query(
        "UPDATE products SET custom_attributes = $1::jsonb WHERE id = $2",
        [customAttrsJson, createdProduct.id]
      );
      createdProduct.custom_attributes = custom_attributes;
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully",
      data: createdProduct,
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

const updateProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    const {
      sku,
      name,
      description,
      quantity,
      price,
      custom_attributes,
    }: IProductUpdateInput & { custom_attributes?: any } = req.body;

    const result = await connection.query(
      "SELECT * FROM public.fn_update_product($1, $2, $3, $4, $5, $6)",
      [
        id,
        sku ?? null,
        name ?? null,
        description ?? null,
        quantity ?? null,
        price ?? null,
      ]
    );

    const updatedProduct = result.rows[0];
    if (id && custom_attributes !== undefined) {
      const customAttrsJson = JSON.stringify(custom_attributes || {});
      await connection.query(
        "UPDATE products SET custom_attributes = $1::jsonb WHERE id = $2",
        [customAttrsJson, id]
      );
      if (updatedProduct) updatedProduct.custom_attributes = custom_attributes;
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
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

const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const id = Number(req.params.id || req.body.id);
    await connection.query(
      "SELECT public.fn_delete_product($1) AS deleted",
      [id]
    );

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Product deleted successfully",
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
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
