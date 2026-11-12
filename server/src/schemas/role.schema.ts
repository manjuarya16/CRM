import { z } from 'zod';

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Role name is required')
    .max(191, 'Role name is too long')
    .refine((val) => /^[a-zA-Z\s]+$/.test(val) && /[a-zA-Z]/.test(val), {
      message: 'Role name can only contain letters and spaces (no digits or special characters)',
    }),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
  permission_type: z.enum(['all', 'custom']).optional().default('all'),
  permissions: z.any().optional().nullable(),
  parent_role_id: z.preprocess((v) => (v === '' || v === undefined || v === null ? null : Number(v)), z.number().int().positive().nullable().optional()),
  created_by: z.coerce.number().optional().nullable(),
});

export type RoleInput = z.infer<typeof roleSchema>;
