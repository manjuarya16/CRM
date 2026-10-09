import pino from "pino";
import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import { pool } from "@/config/db";
import HttpStatusCodes from "@/common/constants/HttpStatusCodes";
import type { IProductCreateInput, IProductUpdateInput } from "@/interfaces/productInterface";
import { productSchema } from "@/schemas/product.schema";

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

    let products = result.rows;

    if (req.query.sellable_only === "true" || req.query.in_stock_only === "true") {
      products = products.filter((product: any) => Number(product.quantity) > 0);
    }

    const total = products.length > 0 ? Number(products[0].total_count || products.length) : 0;

    res.status(HttpStatusCodes.OK).json({
      success: true,
      data: products,
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
    const productId = Number(req.params.id);
    const result = await connection.query(
      "SELECT * FROM public.fn_get_product_by_id($1)",
      [productId]
    );

    if (result.rows.length === 0) {
      res.status(HttpStatusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const productData = result.rows[0];

    // DB Procedural Function call: fn_get_product_inventories(p_product_id)
    try {
      const inventoryResult = await connection.query(
        "SELECT * FROM public.fn_get_product_inventories($1)",
        [productId]
      );
      productData.inventories = inventoryResult.rows || [];
    } catch {
      productData.inventories = [];
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
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.format(),
      });
      return;
    }

    connection = await pool.connect();
    const {
      sku,
      name,
      description,
      quantity,
      price,
      type,
      custom_attributes,
      inventories,
    } = validation.data;

    // Calculate total quantity from warehouse inventories if provided and > 0
    let effectiveQuantity = Number(quantity) || 0;
    if (Array.isArray(inventories) && inventories.length > 0) {
      const totalInventoryStock = inventories.reduce((sum, inventory) => sum + (Number(inventory.in_stock) || 0), 0);
      if (totalInventoryStock > 0 || (quantity === undefined || quantity === null || quantity === 0)) {
        effectiveQuantity = totalInventoryStock;
      }
    }

    const customAttributesJson = JSON.stringify(custom_attributes || {});
    const productType = type || "Product";

    const result = await connection.query(
      "SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5, $6, $7::jsonb)",
      [
        sku,
        name || null,
        description || null,
        effectiveQuantity,
        price !== undefined && price !== null ? Number(price) : null,
        productType,
        customAttributesJson,
      ]
    );

    const createdProduct = result.rows[0];
    if (createdProduct?.id) {
      // Save inventories via procedural function
      if (Array.isArray(inventories) && inventories.length > 0) {
        await connection.query(
          "SELECT public.fn_save_product_inventories($1, $2::jsonb)",
          [createdProduct.id, JSON.stringify(inventories)]
        );
        createdProduct.inventories = inventories;
      }
    }

    res.status(HttpStatusCodes.CREATED).json({
      success: true,
      message: "Product created successfully",
      data: createdProduct,
    });
  } catch (error: any) {
    logger.error(error);
    if (error.code === '23505') {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "A product with this SKU already exists. Please choose a different SKU.",
      });
      return;
    }
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  } finally {
    connection?.release();
  }
};

const updateProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    const productId = Number(req.params.id || req.body.id);
    if (!productId || isNaN(productId)) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const validation = productSchema.partial().safeParse(req.body);
    if (!validation.success) {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.format(),
      });
      return;
    }

    connection = await pool.connect();
    const {
      sku,
      name,
      description,
      quantity,
      price,
      type,
      custom_attributes,
      inventories,
    } = validation.data;

    // Calculate total quantity from warehouse inventories if provided
    let effectiveQuantity = quantity !== undefined && quantity !== null ? Number(quantity) : undefined;
    if (Array.isArray(inventories) && inventories.length > 0) {
      const totalInventoryStock = inventories.reduce((sum, inventory) => sum + (Number(inventory.in_stock) || 0), 0);
      if (totalInventoryStock > 0 || quantity === undefined) {
        effectiveQuantity = totalInventoryStock;
      }
    }

    const customAttributesJson = custom_attributes !== undefined ? JSON.stringify(custom_attributes) : null;

    const result = await connection.query(
      "SELECT * FROM public.fn_update_product($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
      [
        productId,
        sku ?? null,
        name ?? null,
        description ?? null,
        effectiveQuantity ?? null,
        price !== undefined && price !== null ? Number(price) : null,
        type ?? null,
        customAttributesJson,
      ]
    );

    const updatedProduct = result.rows[0];
    if (productId) {
      // Sync inventories if passed via DB procedural function
      if (Array.isArray(inventories)) {
        await connection.query(
          "SELECT public.fn_save_product_inventories($1, $2::jsonb)",
          [productId, JSON.stringify(inventories)]
        );
        if (updatedProduct) updatedProduct.inventories = inventories;
      }
    }

    res.status(HttpStatusCodes.OK).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    logger.error(error);
    if (error.code === '23505') {
      res.status(HttpStatusCodes.BAD_REQUEST).json({
        success: false,
        message: "A product with this SKU already exists. Please choose a different SKU.",
      });
      return;
    }
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  } finally {
    connection?.release();
  }
};

const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  let connection: PoolClient | undefined;
  try {
    connection = await pool.connect();
    const productId = Number(req.params.id || req.body.id);
    await connection.query(
      "SELECT public.fn_delete_product($1) AS deleted",
      [productId]
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
