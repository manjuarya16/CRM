import { z } from 'zod';

export const campaignSchema = z.object({
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
  type: z.string().trim().min(1, 'Type is required').default('general'),
  mail_to: z.string().trim().min(1, 'Audience is required').default('leads'),
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
export type CampaignInput = z.infer<typeof campaignSchema>;

export const eventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Event name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Event name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Event name must contain at least one letter',
    }),
  description: z.string().trim().min(1, 'Description is required').max(255),
  date: z
    .string()
    .trim()
    .min(1, 'Event date is required')
    .refine(
      (val) => {
        const selected = new Date(val);
        if (isNaN(selected.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected >= today;
      },
      {
        message: 'Event date cannot be in the past',
      }
    ),
});
export type EventInput = z.infer<typeof eventSchema>;

export const workflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Workflow name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Workflow name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Workflow name must contain at least one letter',
    }),
  description: z.string().nullable().optional(),
  entity_type: z.string().trim().min(1, 'Entity type is required').default('leads'),
  event: z.string().trim().min(1, 'Event trigger is required').default('create'),
  condition_type: z.enum(['and', 'or']).default('and'),
  conditions: z.array(z.any()).optional().default([]),
  actions: z.array(z.any()).optional().default([]),
});
export type WorkflowInput = z.infer<typeof workflowSchema>;
