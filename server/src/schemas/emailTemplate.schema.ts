import { z } from 'zod';
export const saveEmailTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Name must contain at least one letter',
    }),
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Subject cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Subject must contain at least one letter',
    }),
  content: z.string().min(1, 'Content is required'),
});
export const updateEmailTemplateSchema = saveEmailTemplateSchema.partial();
export type SaveEmailTemplateInput = z.infer<typeof saveEmailTemplateSchema>;
