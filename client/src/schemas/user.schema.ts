import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const userFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(191, "Name is too long"),
    email: z.string().trim().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional()
      .or(z.literal("")),
    confirm_password: z.string().optional().or(z.literal("")),
    status: z.boolean().default(true),
    view_permission: z.enum(["global", "group", "individual"]).default("global"),
    role_id: z.coerce.number().min(1, "Role is required"),
    group_ids: z.array(z.coerce.number()).optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.confirm_password !== undefined && data.confirm_password !== "") {
        return data.password === data.confirm_password;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  );

export const userFormSchemaResolver = zodResolver(userFormSchema);

export type UserFormData = z.infer<typeof userFormSchema>;
