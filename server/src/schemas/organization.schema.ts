import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  address: z.any().optional(),
  user_id: z.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
}).passthrough();

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.any().optional(),
  user_id: z.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
}).passthrough();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
