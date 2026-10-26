import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const sourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Source name is required")
    .max(191, "Source name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Source name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Source name must contain at least one letter",
    }),
});

export const sourceSchemaResolver = zodResolver(sourceSchema);

export type SourceFormData = z.infer<typeof sourceSchema>;
