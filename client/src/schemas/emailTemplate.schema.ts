import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(255),
  content: z.string().trim().min(1, "Content is required"),
});

export const emailTemplateSchemaResolver = zodResolver(emailTemplateSchema);

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
export type EmailTemplateInput = EmailTemplateFormData;
