import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100, 'SKU is too long'),
  name: z.string().min(1, 'Product name is required').max(191, 'Product name is too long'),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative').optional().default(0),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
