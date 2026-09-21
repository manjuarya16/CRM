import { z } from 'zod';

export const importRequestSchema = z.object({
  type: z.enum(['leads', 'persons', 'organizations', 'products']),
  action: z.enum(['append', 'overwrite']).default('append'),
  validation_strategy: z.enum(['stop_on_errors', 'skip_error_entries']).default('skip_error_entries'),
  allowed_errors: z.coerce.number().default(0),
  field_separator: z.string().default(','),
  rows: z.array(z.record(z.string(), z.any())),
});

export type ImportRequestInput = z.infer<typeof importRequestSchema>;
