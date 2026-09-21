import { z } from 'zod';

export const typeSchema = z.object({
  name: z.string().min(1, 'Type name is required').max(191, 'Type name is too long'),
});

export type TypeInput = z.infer<typeof typeSchema>;
