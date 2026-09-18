import { z } from 'zod';

export const personSchema = z.object({
  name: z.string().min(1, 'Person name is required').max(191, 'Person name is too long'),
  emails: z.any().optional().nullable(),
  contact_numbers: z.any().optional().nullable(),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().max(191).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
});

export type PersonInput = z.infer<typeof personSchema>;
