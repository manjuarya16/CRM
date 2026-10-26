import { z } from 'zod';
export const saveCampaignSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Campaign name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Campaign name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Campaign name must contain at least one letter',
    }),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject line is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Subject line cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Subject line must contain at least one letter',
    }),
  status: z.coerce.boolean().optional().default(false),
  type: z.string().min(1, 'Type is required').default('general'),
  mail_to: z.string().min(1, 'Audience is required').default('leads'),
  spooling: z.string().nullable().optional(),
  marketing_template_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number(v) <= 0 ? null : Number(v)),
    z.number().nullable().optional()
  ),
  marketing_event_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined || Number(v) <= 0 ? null : Number(v)),
    z.number().nullable().optional()
  ),
});
export const updateCampaignSchema = saveCampaignSchema.partial();
export type SaveCampaignInput = z.infer<typeof saveCampaignSchema>;
