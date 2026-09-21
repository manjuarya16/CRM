import { z } from 'zod';

export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(191, 'Group name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  user_ids: z.array(z.coerce.number()).optional().nullable(),
});

export type GroupInput = z.infer<typeof groupSchema>;
