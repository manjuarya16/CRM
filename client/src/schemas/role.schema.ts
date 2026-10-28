import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(191, "Role name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Role name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Role name must contain at least one letter",
    }),
  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .nullable(),
  permission_type: z.enum(["all", "custom"]).default("all"),
  permissions: z.any().optional(),
  parent_role_id: z.coerce.number().optional().nullable(),
});

export const roleSchemaResolver = zodResolver(roleSchema);

export type RoleFormData = z.infer<typeof roleSchema>;
