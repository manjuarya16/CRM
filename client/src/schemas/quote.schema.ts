import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const quoteSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(191, "Subject is too long"),
  description: z.string().trim().optional().or(z.literal("")),
  billing_address: z.any().optional(),
  shipping_address: z.any().optional(),
  discount_percent: z.coerce.number().min(0).max(100).optional().nullable(),
  discount_amount: z.coerce.number().min(0).optional().nullable(),
  tax_amount: z.coerce.number().min(0).optional().nullable(),
  adjustment_amount: z.coerce.number().optional().nullable(),
  sub_total: z.coerce.number().min(0).optional().nullable(),
  grand_total: z.coerce.number().min(0).optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
});

export const quoteSchemaResolver = zodResolver(quoteSchema);

export type QuoteFormData = z.infer<typeof quoteSchema>;
