import { z } from 'zod';

export const pipelineStageSchema = z.object({
  id: z.coerce.number().optional(),
  code: z.string().optional().nullable(),
  name: z.string().min(1, 'Stage name is required'),
  probability: z.coerce.number().min(0).max(100).optional().default(100),
  sort_order: z.coerce.number().optional().default(1),
});

export const pipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(191, 'Pipeline name is too long'),
  is_default: z.boolean().optional().default(false),
  rotten_days: z.coerce.number().min(0, 'Rotting days cannot be negative').optional().default(30),
  stages: z.array(pipelineStageSchema).optional().default([]),
});

export type PipelineInput = z.infer<typeof pipelineSchema>;
export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;
