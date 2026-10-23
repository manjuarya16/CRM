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
    .max(191, "Product name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Product name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Product name must contain at least one letter",
    }),
  sku: z
    .string()
    .trim()
    .min(1, "SKU / Item code is required")
    .max(100, "SKU / Item code is too long")
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: "Item code must contain at least one letter or number",
    })
    .refine((val) => !/^[\W_]+$/.test(val), {
      message: "Item code cannot consist of only special characters",
    })
    .refine((val) => /^[a-zA-Z0-9_\-\.\/]+$/.test(val), {
      message: "Item code can only contain alphanumeric characters, hyphens, underscores, dots, and slashes",
    }),
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
    .optional()
    .transform((val) => (val === undefined || val === null || val === "" ? 0 : typeof val === "number" ? val : Number(val)))
    .refine((val) => !isNaN(val), { message: "Quantity must be a valid number" })
    .refine((val) => val >= 0, { message: "Quantity cannot be negative" }),
  type: z.enum(["Product", "Service"]).default("Product"),
  inventories: z.array(productInventorySchema).optional(),
});

export const productSchemaResolver = zodResolver(productSchema);

export type ProductFormData = z.infer<typeof productSchema>;


