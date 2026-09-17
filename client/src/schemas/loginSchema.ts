import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const loginSchema = z.object({
  username: z
    .string({ error: "Email is required" })
    .trim()
    .email("Please enter a valid email address"),
  password: z
    .string({ error: "Password is required" })
    .trim()
    .min(6, "Password must be at least 6 characters"),
});

export const loginSchemaResolver = zodResolver(loginSchema);

export type LoginFormData = z.infer<typeof loginSchema>;


