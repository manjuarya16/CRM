import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(191, "Role name is too long"),
  description: z.string().trim().max(500, "Description must not exceed 500 characters").optional().or(z.literal("")),
  permission_type: z.enum(["all", "custom"]).default("all"),
  permissions: z.any().optional(),
});

export const roleSchemaResolver = zodResolver(roleSchema);

export type RoleFormData = z.infer<typeof roleSchema>;
