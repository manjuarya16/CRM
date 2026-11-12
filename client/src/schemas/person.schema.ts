import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)*\.[a-zA-Z]{2,}$/;
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const emailItemSchema = z.object({
  label: z.string().optional().default("work"),
  value: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (!val) return;
      if (!STRICT_EMAIL_REGEX.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid email address without trailing dots (e.g. name@domain.com).",
        });
      }
    }),
});

export const contactItemSchema = z.object({
  label: z.string().optional().default("work"),
  value: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (!val) return;
      if (/[^0-9]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number must contain digits only.",
        });
        return;
      }
      if (/^0+$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact number cannot consist of only zeros.",
        });
        return;
      }
      if (!/^[6-9]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number must start with 6, 7, 8, or 9.",
        });
        return;
      }
      if (val.length !== 10 || /^(\d)\1{9}$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid 10-digit mobile number.",
        });
        return;
      }
    }),
});

export const personSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Person name is required")
    .max(191, "Name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Person name cannot consist of only numbers or special characters.",
    })
    .refine((val) => /^[a-zA-Z\s.'-]+$/.test(val), {
      message: "Person name can only contain letters, spaces, hyphens, and apostrophes.",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Person name must contain at least one letter.",
    }),
  emails: z.array(emailItemSchema).optional().default([]),
  contact_numbers: z.array(contactItemSchema).optional().default([]),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().trim().max(191, "Job title is too long").optional().or(z.literal("")).nullable(),
  user_id: z.coerce.number().optional().nullable(),
}).superRefine((data, ctx) => {
  if (Array.isArray(data.emails)) {
    const seenEmails = new Set<string>();
    for (let i = 0; i < data.emails.length; i++) {
      const email = data.emails[i]?.value?.trim().toLowerCase();
      if (!email) continue;
      if (seenEmails.has(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["emails"],
          message: `Duplicate email address "${email}" is not allowed. Each email must be unique.`,
        });
        break;
      }
      seenEmails.add(email);
    }
  }

  if (Array.isArray(data.contact_numbers)) {
    const seenPhones = new Set<string>();
    for (let i = 0; i < data.contact_numbers.length; i++) {
      const raw = data.contact_numbers[i]?.value?.trim();
      if (!raw) continue;
      const digits = raw.replace(/[^0-9]/g, "");
      if (!digits) continue;
      if (seenPhones.has(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contact_numbers"],
          message: `Duplicate mobile number "${raw}" is not allowed. Each mobile number must be unique.`,
        });
        break;
      }
      seenPhones.add(digits);
    }
  }
});

export const personSchemaResolver = zodResolver(personSchema);

export type PersonFormData = z.infer<typeof personSchema>;
