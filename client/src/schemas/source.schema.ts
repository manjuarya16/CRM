import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const sourceSchema = z.object({
  name: z.string().trim().min(1, "Source name is required").max(191, "Source name is too long"),
});

export const sourceSchemaResolver = zodResolver(sourceSchema);

export type SourceFormData = z.infer<typeof sourceSchema>;
