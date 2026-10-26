import { z } from 'zod';

export const pipelineStageSchema = z.object({
  id: z.coerce.number().optional(),
  code: z.string().optional().nullable(),
  name: z
    .string()
    .trim()
    .min(1, 'Stage name is required')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Stage name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Stage name must contain at least one letter',
    }),
  probability: z.coerce.number().min(0).max(100).optional().default(100),
  sort_order: z.coerce.number().optional().default(1),
});

export const pipelineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Pipeline name is required')
    .max(191, 'Pipeline name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Pipeline name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Pipeline name must contain at least one letter',
    }),
  is_default: z.boolean().optional().default(false),
  rotten_days: z.coerce.number().min(0, 'Rotting days cannot be negative').optional().default(30),
  stages: z.array(pipelineStageSchema).optional().default([]),
});

export type PipelineInput = z.infer<typeof pipelineSchema>;
export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;
