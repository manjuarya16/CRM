import { z } from 'zod';

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Role name is required')
    .max(191, 'Role name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Role name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Role name must contain at least one letter',
    }),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  permission_type: z.enum(['all', 'custom']).optional().default('all'),
  permissions: z.any().optional().nullable(),
  parent_role_id: z.coerce.number().optional().nullable(),
  created_by: z.coerce.number().optional().nullable(),
});

export type RoleInput = z.infer<typeof roleSchema>;
