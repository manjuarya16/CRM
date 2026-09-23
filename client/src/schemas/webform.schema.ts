import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const webformSchema = z.object({
  form_id: z.string().optional(),
  title: z.string().trim().min(1, "Webform title is required").max(191, "Title is too long"),
  description: z.string().trim().optional().or(z.literal("")).nullable(),
  submit_button_label: z.string().trim().optional().or(z.literal("")).nullable(),
  submit_success_action: z.enum(["message", "redirect"]).default("message"),
  submit_success_content: z.string().optional(),
  create_lead: z.coerce.boolean().optional().default(false),
  lead_pipeline_id: z.coerce.number().nullable().optional(),
  background_color: z.string().optional().default("#ffffff"),
  form_background_color: z.string().optional().default("#ffffff"),
  form_title_color: z.string().optional().default("#1e293b"),
  form_submit_button_color: z.string().optional().default("#0088cc"),
  attribute_label_color: z.string().optional().default("#475569"),
  status: z.boolean().default(true),
  attributes: z.array(z.any()).optional().default([]),
});

export const webFormSchema = webformSchema;
export const webformSchemaResolver = zodResolver(webformSchema);

export type WebformFormData = z.infer<typeof webformSchema>;
export type WebFormInput = WebformFormData;
