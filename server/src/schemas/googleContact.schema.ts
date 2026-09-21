import { z } from 'zod';
export const saveGoogleAccountSchema = z.object({
  google_email: z.string().email('Invalid email address'),
  access_token: z.string().min(1, 'Access token is required'),
  refresh_token: z.string().nullable().optional(),
});
export const createGoogleExportBatchSchema = z.object({
  person_ids: z.array(z.number()).optional(),
});
