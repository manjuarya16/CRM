import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(100, "SKU is too long"),
  name: z.string().trim().min(1, "Product name is required").max(191, "Product name is too long"),
  description: z.string().trim().optional().or(z.literal("")),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative").default(0),
  price: z.coerce.number().min(0, "Price cannot be negative").optional().nullable(),
});

export const productSchemaResolver = zodResolver(productSchema);

export type ProductFormData = z.infer<typeof productSchema>;
