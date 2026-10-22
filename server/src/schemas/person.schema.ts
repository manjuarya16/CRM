import { z } from 'zod';

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Person name is required')
    .max(191, 'Person name is too long')
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Person name must contain at least one letter',
    }),
  emails: z.any().optional().nullable(),
  contact_numbers: z
    .any()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const items = Array.isArray(val) ? val : [val];
      for (const it of items) {
        const numStr = typeof it === 'object' && it !== null ? it.value : String(it);
        if (typeof numStr === 'string' && numStr.trim()) {
          const digits = numStr.replace(/[^0-9]/g, '');
          if (/^0+$/.test(digits)) return false;
        }
      }
      return true;
    }, { message: 'Contact number cannot consist of only zeros' }),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().max(191).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
});

export type PersonInput = z.infer<typeof personSchema>;
