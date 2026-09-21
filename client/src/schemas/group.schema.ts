import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(191, "Group name is too long"),
  description: z.string().trim().max(500, "Description must not exceed 500 characters").optional().or(z.literal("")),
  user_ids: z.array(z.coerce.number()).optional(),
});

export const groupSchemaResolver = zodResolver(groupSchema);

export type GroupFormData = z.infer<typeof groupSchema>;
