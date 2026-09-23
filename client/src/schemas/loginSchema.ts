import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const loginSchemaResolver = zodResolver(loginSchema);

export type LoginFormData = z.infer<typeof loginSchema>;


