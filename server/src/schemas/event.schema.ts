import { z } from 'zod';
export const saveEventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Event name is required')
    .max(255)
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: 'Event name cannot consist of only special characters or numbers',
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Event name must contain at least one letter',
    }),
  description: z.string().trim().min(1, 'Description is required').max(255),
  date: z
    .string()
    .trim()
    .min(1, 'Event date is required')
    .refine(
      (val) => {
        const selected = new Date(val);
        if (isNaN(selected.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected >= today;
      },
      {
        message: 'Event date cannot be in the past',
      }
    ),
});
export const updateEventSchema = saveEventSchema.partial();
export type SaveEventInput = z.infer<typeof saveEventSchema>;
