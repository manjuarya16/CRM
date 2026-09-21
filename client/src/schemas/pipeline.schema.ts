import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const pipelineStageSchema = z.object({
  id: z.coerce.number().optional(),
  code: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Stage name is required"),
  probability: z.coerce.number().min(0, "Min 0%").max(100, "Max 100%").default(100),
  sort_order: z.coerce.number().default(1),
});

export const pipelineSchema = z.object({
  name: z.string().trim().min(1, "Pipeline name is required").max(191, "Pipeline name is too long"),
  rotten_days: z.coerce.number().min(0, "Rotting days cannot be negative").default(30),
  is_default: z.boolean().default(false),
  stages: z.array(pipelineStageSchema).min(1, "Pipeline must have at least one stage"),
});

export const pipelineSchemaResolver = zodResolver(pipelineSchema);

export type PipelineFormData = z.infer<typeof pipelineSchema>;
export type PipelineStageFormData = z.infer<typeof pipelineStageSchema>;
