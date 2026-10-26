import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const emailTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Template name is required")
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Template name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Template name must contain at least one letter",
    }),
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Subject line cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Subject line must contain at least one letter",
    }),
  content: z.string().trim().min(1, "Content is required"),
});

export const emailTemplateSchemaResolver = zodResolver(emailTemplateSchema);

export type EmailTemplateFormData = z.infer<typeof emailTemplateSchema>;
export type EmailTemplateInput = EmailTemplateFormData;
