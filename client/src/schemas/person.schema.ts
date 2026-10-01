import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const emailItemSchema = z.object({
  label: z.string().optional().default("work"),
  value: z.string().trim().email("Invalid email format").or(z.literal("")),
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
    })
    .or(z.literal("")),
});

export const personSchema = z.object({
  name: z.string().trim().min(1, "Person name is required").max(191, "Name is too long"),
  emails: z.array(emailItemSchema).optional().default([]),
  contact_numbers: z.array(contactItemSchema).optional().default([]),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().trim().max(191, "Job title is too long").optional().or(z.literal("")).nullable(),
  user_id: z.coerce.number().optional().nullable(),
});

export const personSchemaResolver = zodResolver(personSchema);

export type PersonFormData = z.infer<typeof personSchema>;
