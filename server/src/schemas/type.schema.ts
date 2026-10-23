import { z } from 'zod';

export const typeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Type name is required')
    .max(191, 'Type name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Type name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Type name must contain at least one letter',
    }),
});

export type TypeInput = z.infer<typeof typeSchema>;
