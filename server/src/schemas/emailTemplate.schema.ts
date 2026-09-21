import { z } from 'zod';
export const saveEmailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subject: z.string().min(1, 'Subject is required').max(255),
  content: z.string().min(1, 'Content is required'),
});
export const updateEmailTemplateSchema = saveEmailTemplateSchema.partial();
export type SaveEmailTemplateInput = z.infer<typeof saveEmailTemplateSchema>;
