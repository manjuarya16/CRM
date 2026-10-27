import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const activitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(191, "Title is too long")
      .refine((val) => !/^[0-9\W_]+$/.test(val), {
        message: "Title cannot consist of only special characters or numbers",
      })
      .refine((val) => /[a-zA-Z]/.test(val), {
        message: "Title must contain at least one letter",
      }),
    type: z.string().trim().min(1, "Type is required").default("call"),
    comment: z.string().trim().optional().or(z.literal("")),
    schedule_from: z.string().optional().or(z.literal("")),
    schedule_to: z.string().optional().or(z.literal("")),
    is_done: z.boolean().default(false),
    user_id: z.coerce.number().optional().nullable(),
    location: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.schedule_to && data.schedule_to.trim()) {
      const toDate = new Date(data.schedule_to);
      if (!isNaN(toDate.getTime()) && toDate.getTime() < Date.now() - 60000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Schedule To date/time cannot be in the past",
          path: ["schedule_to"],
        });
      }
      if (data.schedule_from && data.schedule_from.trim()) {
        const fromDate = new Date(data.schedule_from);
        if (
          !isNaN(toDate.getTime()) &&
          !isNaN(fromDate.getTime()) &&
          toDate.getTime() < fromDate.getTime()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Schedule To date/time must be after Schedule From",
            path: ["schedule_to"],
          });
        }
      }
    }
  });

export const activitySchemaResolver = zodResolver(activitySchema);

export type ActivityFormData = z.infer<typeof activitySchema>;
