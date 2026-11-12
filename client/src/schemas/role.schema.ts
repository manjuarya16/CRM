import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(191, "Role name is too long")
    .refine((val) => /^[a-zA-Z\s]+$/.test(val) && /[a-zA-Z]/.test(val), {
      message: "Role name can only contain letters and spaces (no digits or special characters)",
    }),
  description: z.string().trim().max(500, "Description must not exceed 500 characters").nullable().optional().or(z.literal("")),
  permission_type: z.enum(["all", "custom"]).default("all"),
  permissions: z.any().optional().nullable(),
  parent_role_id: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().int().positive().nullable().optional()
  ),
});

export const roleSchemaResolver = zodResolver(roleSchema);

export type RoleFormData = z.infer<typeof roleSchema>;
