import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(255, "Name is too long"),
  description: z.string().trim().optional().or(z.literal("")).nullable(),
  contact_name: z.string().trim().min(1, "Contact name is required").max(255, "Contact name is too long"),
  contact_emails: z.any().optional().default([]),
  contact_numbers: z.any().optional().default([]),
  contact_address: z.any().optional().default({}),
  locations: z.array(z.any()).optional().default([]),
});

export const warehouseSchemaResolver = zodResolver(warehouseSchema);

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
