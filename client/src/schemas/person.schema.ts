import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

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
      if (/[a-zA-Z]/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Text characters are not allowed. Mobile number must contain digits only.",
        });
        return;
      }
      if (val.includes("+") && !val.startsWith("+")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country code '+' is only allowed at the beginning of the mobile number.",
        });
        return;
      }
      if ((val.match(/\+/g) || []).length > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only one '+' is allowed at the beginning of the mobile number.",
        });
        return;
      }
      if (!/^\+?[0-9\-\s()]+$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number can only contain numbers and standard phone symbols (+, -, ()).",
        });
        return;
      }
      const digitsOnly = val.replace(/[^0-9]/g, "");
      if (digitsOnly.length > 0 && /^0+$/.test(digitsOnly)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact number cannot consist of only zeros.",
        });
        return;
      }
      if (digitsOnly.length < 7) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid mobile number (at least 7 digits).",
        });
        return;
      }
      if (digitsOnly.length > 15) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mobile number cannot exceed 15 digits.",
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
