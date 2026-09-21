import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const personSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(191, "Name is too long"),
  emails: z.any().optional(),
  contact_numbers: z.any().optional(),
  organization_id: z.coerce.number().optional().nullable(),
  job_title: z.string().trim().max(191).optional().or(z.literal("")),
  user_id: z.coerce.number().optional().nullable(),
});

export const personSchemaResolver = zodResolver(personSchema);

export type PersonFormData = z.infer<typeof personSchema>;
