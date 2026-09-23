import { z } from 'zod';

export const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subject: z.string().min(1, 'Subject is required').max(255),
  status: z.coerce.boolean().optional().default(false),
  type: z.string().min(1, 'Type is required').default('general'),
  mail_to: z.string().min(1, 'Audience is required').default('leads'),
  spooling: z.string().nullable().optional(),
  marketing_template_id: z.coerce.number().nullable().optional(),
  marketing_event_id: z.coerce.number().nullable().optional(),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().min(1, 'Description is required').max(255),
  date: z.string().min(1, 'Event date is required'),
});
export type EventInput = z.infer<typeof eventSchema>;

export const workflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().nullable().optional(),
  entity_type: z.string().min(1, 'Entity type is required').default('leads'),
  event: z.string().min(1, 'Event trigger is required').default('create'),
  condition_type: z.enum(['and', 'or']).default('and'),
  conditions: z.array(z.any()).optional().default([]),
  actions: z.array(z.any()).optional().default([]),
});
export type WorkflowInput = z.infer<typeof workflowSchema>;
