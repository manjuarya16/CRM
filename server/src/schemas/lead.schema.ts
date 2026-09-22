import { z } from 'zod';

export const leadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(191, 'Title is too long'),
  description: z.string().optional().nullable(),
  lead_value: z.coerce.number().optional().nullable(),
  status: z.union([z.boolean(), z.number()]).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
  lead_source_id: z.coerce.number().optional().nullable(),
  lead_type_id: z.coerce.number().optional().nullable(),
  lead_pipeline_id: z.coerce.number().optional().nullable(),
  lead_pipeline_stage_id: z.coerce.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
});

export type LeadInput = z.infer<typeof leadSchema>;
