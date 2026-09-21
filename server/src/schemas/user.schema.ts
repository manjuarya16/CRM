import { z } from 'zod';

export const userSaveSchema = z.object({
  name: z.string().min(1, 'Name is required').max(191, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable().or(z.literal('')),
  status: z.boolean().optional().default(true),
  view_permission: z.enum(['global', 'group', 'individual']).optional().default('global'),
  role_id: z.coerce.number().optional().default(1),
  group_ids: z.array(z.coerce.number()).optional().nullable(),
  image: z.string().optional().nullable(),
});

export type UserSaveInput = z.infer<typeof userSaveSchema>;
