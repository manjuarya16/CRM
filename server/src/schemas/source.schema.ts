import { z } from 'zod';

export const sourceSchema = z.object({
  name: z.string().min(1, 'Source name is required').max(191, 'Source name is too long'),
});

export type SourceInput = z.infer<typeof sourceSchema>;
