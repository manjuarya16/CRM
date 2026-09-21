import { z } from 'zod';
export const saveCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subject: z.string().min(1, 'Subject is required').max(255),
  status: z.coerce.boolean().optional().default(false),
  type: z.string().min(1, 'Type is required').default('general'),
  mail_to: z.string().min(1, 'Audience is required').default('leads'),
  spooling: z.string().nullable().optional(),
  marketing_template_id: z.coerce.number().nullable().optional(),
  marketing_event_id: z.coerce.number().nullable().optional(),
});
export const updateCampaignSchema = saveCampaignSchema.partial();
export type SaveCampaignInput = z.infer<typeof saveCampaignSchema>;
