import { z } from 'zod';

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Group name is required')
    .max(191, 'Group name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Group name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Group name must contain at least one letter',
    }),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  user_ids: z.array(z.coerce.number()).optional().nullable(),
});

export type GroupInput = z.infer<typeof groupSchema>;
