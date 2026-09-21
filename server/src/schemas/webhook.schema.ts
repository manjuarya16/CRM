import { z } from 'zod';
export const saveWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  entity_type: z.string().min(1, 'Entity type is required'),
  description: z.string().nullable().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
  end_point: z.string().url('Invalid URL endpoint'),
  query_params: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
  payload_type: z.enum(['default', 'x-www-form-urlencoded', 'raw']).default('default'),
  raw_payload_type: z.enum(['json', 'text']).default('json'),
  payload: z.any().optional(),
});
export const updateWebhookSchema = saveWebhookSchema.partial();
export type SaveWebhookInput = z.infer<typeof saveWebhookSchema>;
