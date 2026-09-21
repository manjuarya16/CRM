import { z } from 'zod';

export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subject: z.string().min(1, 'Subject is required').max(255),
  content: z.string().min(1, 'Content is required'),
});
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().min(1, 'Description is required').max(255),
  date: z.string().min(1, 'Event date is required'),
});
export type EventInput = z.infer<typeof eventSchema>;

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

export const webhookSchema = z.object({
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
export type WebhookInput = z.infer<typeof webhookSchema>;

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

export const webFormSchema = z.object({
  form_id: z.string().min(1, 'Form ID is required').max(255),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().nullable().optional(),
  submit_button_label: z.string().default('Submit'),
  submit_success_action: z.enum(['message', 'redirect']).default('message'),
  submit_success_content: z.string().default('Thank you for your submission.'),
  create_lead: z.coerce.boolean().optional().default(false),
  lead_pipeline_id: z.coerce.number().nullable().optional(),
  background_color: z.string().optional().default('#ffffff'),
  form_background_color: z.string().optional().default('#ffffff'),
  form_title_color: z.string().optional().default('#1e293b'),
  form_submit_button_color: z.string().optional().default('#0088cc'),
  attribute_label_color: z.string().optional().default('#475569'),
  attributes: z.array(z.any()).optional().default([]),
});
export type WebFormInput = z.infer<typeof webFormSchema>;
