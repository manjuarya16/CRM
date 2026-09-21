import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(191, 'Role name is too long'),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  permission_type: z.enum(['all', 'custom']).optional().default('all'),
  permissions: z.any().optional().nullable(),
  created_by: z.coerce.number().optional().nullable(),
});

export type RoleInput = z.infer<typeof roleSchema>;
