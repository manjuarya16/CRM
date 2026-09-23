import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const emailItemSchema = z.object({
  label: z.string().optional().default("work"),
  value: z.string().trim().email("Invalid email format").or(z.literal("")),
});

export const contactItemSchema = z.object({
  label: z.string().optional().default("work"),
  value: z.string().trim().or(z.literal("")),
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
