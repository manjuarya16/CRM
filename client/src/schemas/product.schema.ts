import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const productInventorySchema = z.object({
  warehouse_id: z.number(),
  warehouse_location_id: z.number().nullable().optional(),
  in_stock: z.coerce.number().min(0, "In stock cannot be negative").default(0),
  allocated: z.coerce.number().min(0, "Allocated cannot be negative").default(0),
});

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(191, "Product name is too long"),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(100, "SKU is too long"),
  description: z.string().trim().optional().or(z.literal("")),
  price: z
    .union([z.string(), z.number()])
    .refine((val) => val !== "" && val !== null && val !== undefined, {
      message: "Price is required",
    })
    .transform((val) => (typeof val === "number" ? val : Number(val)))
    .refine((val) => !isNaN(val), { message: "Price must be a valid number" })
    .refine((val) => val >= 0, { message: "Price cannot be negative" }),
  quantity: z
    .union([z.string(), z.number()])
    .refine((val) => val !== "" && val !== null && val !== undefined, {
      message: "Quantity is required",
    })
    .transform((val) => (typeof val === "number" ? val : Number(val)))
    .refine((val) => !isNaN(val), { message: "Quantity must be a valid number" })
    .refine((val) => val >= 0, { message: "Quantity cannot be negative" }),
  inventories: z.array(productInventorySchema).optional(),
});

export const productSchemaResolver = zodResolver(productSchema);

export type ProductFormData = z.infer<typeof productSchema>;


