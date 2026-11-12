import { z } from 'zod';

export const quoteSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(191, 'Subject is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Quote subject cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Quote subject must contain at least one letter',
    }),
  description: z.string().optional().nullable(),
  billing_address: z.any().optional().nullable(),
  shipping_address: z.any().optional().nullable(),
  discount_percent: z.coerce.number().min(0).max(100, 'Discount cannot exceed 100%').optional().nullable(),
  discount_amount: z.coerce.number().min(0).optional().nullable(),
  tax_amount: z.coerce.number().min(0).optional().nullable(),
  adjustment_amount: z.coerce.number().optional().nullable(),
  sub_total: z.coerce.number().min(0).optional().nullable(),
  grand_total: z.coerce.number().min(0).optional().nullable(),
  person_id: z.coerce.number('Customer is required').int().positive('Customer is required'),
  user_id: z.coerce.number().optional().nullable(),
  expired_at: z.string().optional().nullable(),
  items: z
    .array(
      z
        .object({
          quantity: z.coerce.number().min(1, 'Product quantity must be at least 1'),
          discount_percent: z.coerce.number().min(0).max(100, 'Item discount cannot exceed 100%').optional().nullable(),
        })
        .passthrough(),
    )
    .optional(),
  custom_attributes: z.any().optional().default({}),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
