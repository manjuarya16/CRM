import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(100, "Tag name is too long"),
  color: z.string().trim().optional().or(z.literal("")).nullable(),
});

export const tagSchemaResolver = zodResolver(tagSchema);

export type TagFormData = z.infer<typeof tagSchema>;
