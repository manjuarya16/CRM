import { z } from 'zod';

export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/;

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Person name is required')
    .max(191, 'Person name is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Person name cannot consist of only numbers or special characters',
    })
    .refine((val) => /^[a-zA-Z\s.'-]+$/.test(val), {
      message: 'Person name can only contain letters, spaces, hyphens, and apostrophes',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Person name must contain at least one letter',
    }),
  emails: z
    .any()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const items = Array.isArray(val) ? val : [val];
      for (const it of items) {
        const emailStr = typeof it === 'object' && it !== null ? (it.value || it.email) : String(it);
        if (typeof emailStr === 'string' && emailStr.trim()) {
          if (!STRICT_EMAIL_REGEX.test(emailStr.trim())) return false;
        }
      }
      return true;
    }, { message: 'Please enter a valid email address without trailing dots (e.g. name@domain.com)' }),
  contact_numbers: z
    .any()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true;
      const items = Array.isArray(val) ? val : [val];
      for (const it of items) {
        const numStr = typeof it === 'object' && it !== null ? (it.value || it.phone || it.number) : String(it);
        if (typeof numStr === 'string' && numStr.trim()) {
          const clean = numStr.trim();
          if (/[^0-9]/.test(clean)) return false;
          if (/^0+$/.test(clean) || /^(\d)\1{9}$/.test(clean)) return false;
          if (!/^[6-9]\d{9}$/.test(clean)) return false;
        }
      }
      return true;
    }, { message: 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.' }),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().max(191).optional().nullable(),
  user_id: z.coerce.number().optional().nullable(),
  custom_attributes: z.any().optional().default({}),
});

export type PersonInput = z.infer<typeof personSchema>;
