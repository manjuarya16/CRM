import { z } from 'zod';
export const saveWorkflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Name must contain at least one letter',
    }),
  description: z.string().nullable().optional(),
  entity_type: z.string().min(1, 'Entity type is required').default('leads'),
  event: z.string().min(1, 'Event trigger is required').default('create'),
  condition_type: z.enum(['and', 'or']).default('and'),
  conditions: z.array(z.any()).optional().default([]),
  actions: z.array(z.any()).optional().default([]),
});
export const updateWorkflowSchema = saveWorkflowSchema.partial();
export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;
