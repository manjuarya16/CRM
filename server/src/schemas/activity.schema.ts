import { z } from 'zod';

export const activitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(191, 'Title is too long'),
  type: z.string().min(1, 'Type is required').optional().default('call'),
  comment: z.string().optional().nullable(),
  schedule_from: z.string().optional().nullable(),
  schedule_to: z.string().optional().nullable(),
  is_done: z.boolean().optional().default(false),
  user_id: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
