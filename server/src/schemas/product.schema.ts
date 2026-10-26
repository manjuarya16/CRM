import { z } from 'zod';

export const productSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, 'SKU / Item code is required')
    .max(100, 'SKU is too long')
    .refine((val) => /[a-zA-Z0-9]/.test(val), {
      message: 'Item code must contain at least one letter or number',
    })
    .refine((val) => !/^[\W_]+$/.test(val), {
      message: 'Item code cannot consist of only special characters',
    })
    .refine((val) => /^[a-zA-Z0-9_\-\.\/]+$/.test(val), {
      message: 'Item code can only contain alphanumeric characters, hyphens, underscores, dots, and slashes',
    }),
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(191, 'Product name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Product name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Product name must contain at least one letter',
    }),
  description: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative').default(0),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional().nullable(),
  type: z.enum(['Product', 'Service']).optional().default('Product'),
  custom_attributes: z.any().optional().default({}),
  inventories: z.array(z.any()).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;


