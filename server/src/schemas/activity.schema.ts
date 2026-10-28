import { z } from 'zod';

export const baseActivitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(191, 'Title is too long')
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Title cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Title must contain at least one letter',
    }),
  type: z.string().min(1, 'Type is required').optional().default('call'),
  comment: z.string().optional().nullable(),
  schedule_from: z.string().optional().nullable(),
  schedule_to: z.string().optional().nullable(),
  is_done: z.boolean().optional().default(false),
  user_id: z.coerce.number().optional().nullable(),
  location: z.string().optional().nullable(),
  lead_id: z.coerce.number().optional().nullable(),
  person_id: z.coerce.number().optional().nullable(),
});

export const activitySchema = baseActivitySchema.superRefine((data, ctx) => {
  if (data.type === 'note' && (!data.comment || !data.comment.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Note content cannot be empty',
      path: ['comment'],
    });
  }
  if (data.schedule_to && typeof data.schedule_to === 'string' && data.schedule_to.trim()) {
    const toDate = new Date(data.schedule_to);
    if (!isNaN(toDate.getTime()) && toDate.getTime() < Date.now() - 60000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Schedule To date/time cannot be in the past',
        path: ['schedule_to'],
      });
    }
    if (data.schedule_from && typeof data.schedule_from === 'string' && data.schedule_from.trim()) {
      const fromDate = new Date(data.schedule_from);
      if (
        !isNaN(toDate.getTime()) &&
        !isNaN(fromDate.getTime()) &&
        toDate.getTime() < fromDate.getTime()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Schedule To date/time must be after Schedule From',
          path: ['schedule_to'],
        });
      }
    }
  }
});

export const activityUpdateSchema = baseActivitySchema.partial().superRefine((data, ctx) => {
  if (data.type === 'note' && data.comment !== undefined && (!data.comment || !data.comment.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Note content cannot be empty',
      path: ['comment'],
    });
  }
  if (
    data.schedule_to &&
    typeof data.schedule_to === 'string' &&
    data.schedule_to.trim() &&
    data.schedule_from &&
    typeof data.schedule_from === 'string' &&
    data.schedule_from.trim()
  ) {
    const toDate = new Date(data.schedule_to);
    const fromDate = new Date(data.schedule_from);
    if (
      !isNaN(toDate.getTime()) &&
      !isNaN(fromDate.getTime()) &&
      toDate.getTime() < fromDate.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Schedule To date/time must be after Schedule From',
        path: ['schedule_to'],
      });
    }
  }
});

export type ActivityInput = z.infer<typeof activitySchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;
