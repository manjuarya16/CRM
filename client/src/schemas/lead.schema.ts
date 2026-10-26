import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const leadProductItemSchema = z.object({
  product_id: z.coerce.number().min(1, "Please select a product"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  warehouse_id: z.coerce.number().optional().nullable(),
  warehouse_location_id: z.coerce.number().optional().nullable(),
  is_recurring: z.boolean().optional(),
  billing_cycle: z.string().optional(),
  contract_duration: z.coerce.number().optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
});

export const leadSchema = z.object({
  title: z.string().trim().min(1, "Lead title is required").max(191, "Title is too long"),
  description: z.string().trim().optional().or(z.literal("")).nullable(),
  lead_value: z.coerce.number().min(0, "Lead value cannot be negative").optional().nullable(),
  status: z.union([z.boolean(), z.number()]).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
  organization_id: z.coerce.number().optional().nullable(),
  lead_source_id: z.coerce.number().optional().nullable(),
  lead_type_id: z.coerce.number().optional().nullable(),
  lead_pipeline_id: z.coerce.number().optional().nullable(),
  lead_pipeline_stage_id: z.coerce.number().optional().nullable(),
  products: z.array(leadProductItemSchema).min(1, "At least one product is required").optional(),
});

export const leadSchemaResolver = zodResolver(leadSchema);

export type LeadFormData = z.infer<typeof leadSchema>;
export type LeadProductItemData = z.infer<typeof leadProductItemSchema>;
