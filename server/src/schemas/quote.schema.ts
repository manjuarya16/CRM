import { z } from 'zod';

export const quoteSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(191, 'Subject is too long'),
  description: z.string().optional().nullable(),
  billing_address: z.any().optional().nullable(),
  shipping_address: z.any().optional().nullable(),
  discount_percent: z.coerce.number().optional().nullable(),
  discount_amount: z.coerce.number().optional().nullable(),
  tax_amount: z.coerce.number().optional().nullable(),
  adjustment_amount: z.coerce.number().optional().nullable(),
  sub_total: z.coerce.number().optional().nullable(),
  grand_total: z.coerce.number().optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
