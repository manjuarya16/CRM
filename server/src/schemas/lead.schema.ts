import { z } from 'zod';

export const leadProductItemSchema = z.object({
  product_id: z.coerce.number().min(1, 'Product is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').default(1),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional().nullable(),
  warehouse_id: z.coerce.number().optional().nullable(),
  warehouse_location_id: z.coerce.number().optional().nullable(),
  is_recurring: z.boolean().optional(),
  billing_cycle: z.string().optional().nullable(),
  contract_duration: z.coerce.number().optional().nullable(),
  contract_start_date: z.string().optional().nullable(),
  contract_end_date: z.string().optional().nullable(),
});

export const leadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(191, 'Title is too long'),
  description: z.string().optional().nullable(),
  lead_value: z.coerce.number().optional().nullable(),
  status: z.union([z.boolean(), z.number()]).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
  organization_id: z.coerce.number().optional().nullable(),
  lead_source_id: z.coerce.number().optional().nullable(),
  lead_type_id: z.coerce.number().optional().nullable(),
  lead_pipeline_id: z.coerce.number().optional().nullable(),
  lead_pipeline_stage_id: z.coerce.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
  products: z.array(leadProductItemSchema).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type LeadProductItemInput = z.infer<typeof leadProductItemSchema>;
