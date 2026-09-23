import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
});

export const leadSchemaResolver = zodResolver(leadSchema);

export type LeadFormData = z.infer<typeof leadSchema>;
