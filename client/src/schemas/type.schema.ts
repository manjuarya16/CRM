import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const typeSchema = z.object({
  name: z.string().trim().min(1, "Type name is required").max(191, "Type name is too long"),
});

export const typeSchemaResolver = zodResolver(typeSchema);

export type TypeFormData = z.infer<typeof typeSchema>;
