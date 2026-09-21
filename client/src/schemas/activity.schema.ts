import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const activitySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(191, "Title is too long"),
  type: z.string().trim().min(1, "Type is required").default("call"),
  comment: z.string().trim().optional().or(z.literal("")),
  schedule_from: z.string().optional().or(z.literal("")),
  schedule_to: z.string().optional().or(z.literal("")),
  is_done: z.boolean().default(false),
  user_id: z.coerce.number().optional().nullable(),
  location: z.string().trim().optional().or(z.literal("")),
});

export const activitySchemaResolver = zodResolver(activitySchema);

export type ActivityFormData = z.infer<typeof activitySchema>;
