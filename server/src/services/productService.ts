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
    if (products.length > 0) {
      const ids = products.map((p: any) => p.id);
      const attrRes = await connection.query(
        "SELECT id, custom_attributes FROM products WHERE id = ANY($1::int[])",
        [ids]
      );
      const attrMap = new Map(attrRes.rows.map((r: any) => [r.id, r.custom_attributes || {}]));
      products.forEach((p: any) => {
        p.custom_attributes = attrMap.get(p.id) || {};
      });
    }

    if (req.query.sellable_only === "true" || req.query.in_stock_only === "true") {
      products = products.filter((p: any) => Number(p.quantity) > 0);
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

    // DB Function call: get_product_inventories(p_product_id)
    try {
      const invRes = await connection.query(
        "SELECT get_product_inventories($1::integer) as result",
        [id]
      ).catch(async () => {
        return (connection as PoolClient).query(
          `SELECT pi.id, pi.product_id, pi.warehouse_id, pi.warehouse_location_id, pi.in_stock, pi.allocated,
                  w.name as warehouse_name, wl.name as warehouse_location_name
           FROM product_inventories pi
           LEFT JOIN warehouses w ON w.id = pi.warehouse_id
           LEFT JOIN warehouse_locations wl ON wl.id = pi.warehouse_location_id
           WHERE pi.product_id = $1
           ORDER BY pi.id ASC`,
          [id]
        );
      });
      productData.inventories = Array.isArray(invRes.rows[0]?.result)
        ? invRes.rows[0].result
        : invRes.rows || [];
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
      custom_attributes,
      inventories,
    } = validation.data;

    // Calculate total quantity from warehouse inventories if provided and > 0
    let effectiveQuantity = Number(quantity) || 0;
    if (Array.isArray(inventories) && inventories.length > 0) {
      const totalInvStock = inventories.reduce((sum, inv) => sum + (Number(inv.in_stock) || 0), 0);
      if (totalInvStock > 0 || (quantity === undefined || quantity === null || quantity === 0)) {
        effectiveQuantity = totalInvStock;
      }
    }

    const result = await connection.query(
      "SELECT * FROM public.fn_create_product($1, $2, $3, $4, $5)",
      [
        sku,
        name || null,
        description || null,
        effectiveQuantity,
        price !== undefined && price !== null ? Number(price) : null,
      ]
    );

    const createdProduct = result.rows[0];
    if (createdProduct?.id) {
      if (custom_attributes) {
        const customAttrsJson = JSON.stringify(custom_attributes);
        await connection.query(
          "UPDATE products SET custom_attributes = $1::jsonb WHERE id = $2",
          [customAttrsJson, createdProduct.id]
        );
        createdProduct.custom_attributes = custom_attributes;
      }

      // Save inventories
      if (Array.isArray(inventories) && inventories.length > 0) {
        for (const inv of inventories) {
          if (inv.warehouse_id) {
            await connection.query(
              `INSERT INTO product_inventories (product_id, warehouse_id, warehouse_location_id, in_stock, allocated, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                createdProduct.id,
                inv.warehouse_id,
                inv.warehouse_location_id || null,
                Number(inv.in_stock) || 0,
                Number(inv.allocated) || 0,
              ]
            );
          }
        }
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
    const id = Number(req.params.id || req.body.id);
    if (!id || isNaN(id)) {
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
      custom_attributes,
      inventories,
    } = validation.data;

    // Calculate total quantity from warehouse inventories if provided
    let effectiveQuantity = quantity !== undefined && quantity !== null ? Number(quantity) : undefined;
    if (Array.isArray(inventories) && inventories.length > 0) {
      const totalInvStock = inventories.reduce((sum, inv) => sum + (Number(inv.in_stock) || 0), 0);
      if (totalInvStock > 0 || quantity === undefined) {
        effectiveQuantity = totalInvStock;
      }
    }

    const result = await connection.query(
      "SELECT * FROM public.fn_update_product($1, $2, $3, $4, $5, $6)",
      [
        id,
        sku ?? null,
        name ?? null,
        description ?? null,
        effectiveQuantity ?? null,
        price !== undefined && price !== null ? Number(price) : null,
      ]
    );

    const updatedProduct = result.rows[0];
    if (id) {
      if (custom_attributes !== undefined) {
        const customAttrsJson = JSON.stringify(custom_attributes || {});
        await connection.query(
          "UPDATE products SET custom_attributes = $1::jsonb WHERE id = $2",
          [customAttrsJson, id]
        );
        if (updatedProduct) updatedProduct.custom_attributes = custom_attributes;
      }

      // Sync inventories if passed
      if (Array.isArray(inventories)) {
        await connection.query("DELETE FROM product_inventories WHERE product_id = $1", [id]);
        for (const inv of inventories) {
          if (inv.warehouse_id) {
            await connection.query(
              `INSERT INTO product_inventories (product_id, warehouse_id, warehouse_location_id, in_stock, allocated, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
              [
                id,
                inv.warehouse_id,
                inv.warehouse_location_id || null,
                Number(inv.in_stock) || 0,
                Number(inv.allocated) || 0,
              ]
            );
          }
        }
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
