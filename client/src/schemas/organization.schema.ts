import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(191, "Organization name is too long"),
  address: z.string().trim().optional().or(z.literal("")).nullable(),
  country: z.string().trim().optional().or(z.literal("")).nullable(),
  state: z.string().trim().optional().or(z.literal("")).nullable(),
  city: z.string().trim().optional().or(z.literal("")).nullable(),
  postcode: z.string().trim().optional().or(z.literal("")).nullable(),
  user_id: z.coerce.number().optional().nullable(),
});

export const organizationSchemaResolver = zodResolver(organizationSchema);

export type OrganizationFormData = z.infer<typeof organizationSchema>;
