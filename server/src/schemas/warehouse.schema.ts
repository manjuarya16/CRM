import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Warehouse name is required')
    .max(255, 'Warehouse name is too long')
    .refine((val) => /^[a-zA-Z0-9\s\-_.,&()/]+$/.test(val) && /[a-zA-Z0-9]/.test(val), {
      message: 'Warehouse name can only contain letters, numbers, spaces, and standard punctuation (- _ . , & ( ) /)',
    }),
  description: z
    .string()
    .trim()
    .max(1000, 'Description is too long')
    .refine((val) => !val || /[a-zA-Z0-9]/.test(val), {
      message: 'Description must contain at least one letter or number',
    })
    .optional()
    .nullable(),
  contact_name: z
    .string()
    .trim()
    .min(1, 'Contact person name is required')
    .max(255, 'Contact person name is too long')
    .refine((val) => !/\d/.test(val), {
      message: 'Contact person name cannot contain numbers',
    })
    .refine((val) => /^[a-zA-Z\s.'-]+$/.test(val) && /[a-zA-Z]/.test(val), {
      message: 'Contact person name must contain only letters and valid punctuation',
    }),
  contact_emails: z
    .any()
    .optional()
    .default([])
    .superRefine((val, ctx) => {
      if (!val) return;
      const list = Array.isArray(val) ? val : [val];
      for (const item of list) {
        const email = typeof item === "object" && item !== null ? item.value : String(item);
        if (!email || !String(email).trim()) continue;
        const cleaned = String(email).trim();
        if (cleaned.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(cleaned)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter a valid email address (e.g. warehouse@example.com).",
          });
          return;
        }
      }
    }),
  contact_numbers: z
    .any()
    .optional()
    .default([])
    .superRefine((val, ctx) => {
      if (!val) return;
      const list = Array.isArray(val) ? val : [val];
      for (const item of list) {
        const phone = typeof item === 'object' && item !== null ? item.value : String(item);
        if (!phone || !String(phone).trim()) continue;
        const cleaned = String(phone).trim();
        let coreDigits = cleaned;
        if (cleaned.startsWith('+')) {
          const match = cleaned.match(/^\+\d{1,3}(\d{10})$/);
          if (!match) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Please enter a valid 10-digit mobile number (e.g. 9876543210 or +919876543210).',
            });
            return;
          }
          coreDigits = match[1];
        } else {
          if (!/^\d+$/.test(cleaned)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Mobile number must contain only digits.',
            });
            return;
          }
          if (cleaned.length !== 10) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Mobile number must be exactly 10 digits.',
            });
            return;
          }
          coreDigits = cleaned;
        }
        if (/^(\d)\1{9}$/.test(coreDigits)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Mobile number cannot consist of all identical digits (e.g. 0000000000).',
          });
          return;
        }
        if (coreDigits.startsWith('0')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Mobile number cannot start with 0.',
          });
          return;
        }
      }
    }),
  contact_address: z
    .any()
    .optional()
    .default({})
    .superRefine((val, ctx) => {
      if (!val || typeof val !== "object") return;
      const placeRegex = /^[a-zA-Z\s.'-]+$/;
      for (const [field, label] of [
        ["city", "City"],
        ["state", "State / Province"],
        ["country", "Country"],
      ]) {
        const v = typeof val[field] === "string" ? val[field].trim() : "";
        if (v && (!placeRegex.test(v) || !/[a-zA-Z]/.test(v))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${label} must contain only letters and valid punctuation.`,
          });
        }
      }
      const street = typeof val.street_address === "string" ? val.street_address.trim() : "";
      if (street && (street.length > 500 || !/^[a-zA-Z0-9\s.,#'\-/()&]+$/.test(street) || !/[a-zA-Z0-9]/.test(street))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["street_address"],
          message: "Street address must contain valid characters and at least one letter or number.",
        });
      }
      const postcode = typeof val.postcode === "string" ? val.postcode.trim() : "";
      if (postcode && !/^\d{6}$/.test(postcode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postcode"],
          message: "Postcode / ZIP must be exactly 6 digits.",
        });
      }
    }),
  locations: z
    .array(z.any())
    .optional()
    .default([])
    .superRefine((val, ctx) => {
      if (!Array.isArray(val)) return;
      for (const item of val) {
        const locName = typeof item === "object" && item !== null ? String(item.name || "").trim() : String(item || "").trim();
        if (!locName) continue;
        if (!/^[a-zA-Z0-9\s\-_.,/()]+$/.test(locName) || !/[a-zA-Z0-9]/.test(locName)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Storage location names can only contain letters, numbers, spaces, and standard punctuation (- _ . , / ( ))",
          });
          return;
        }
      }
    }),
  custom_attributes: z.any().optional().default({}),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
