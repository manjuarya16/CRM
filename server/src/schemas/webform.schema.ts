import { z } from 'zod';
export const webFormAttributeSchema = z.object({
  attribute_id: z.coerce.number(),
  name: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  is_required: z.coerce.boolean().optional().default(false),
  is_hidden: z.coerce.boolean().optional().default(false),
  sort_order: z.coerce.number().optional().default(0),
});
export const saveWebFormSchema = z.object({
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
  attributes: z.array(webFormAttributeSchema).optional().default([]),
});
export const updateWebFormSchema = saveWebFormSchema.partial();
export type SaveWebFormInput = z.infer<typeof saveWebFormSchema>;
