import { z } from 'zod';
export const saveEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255),
  description: z.string().min(1, 'Description is required').max(255),
  date: z.string().min(1, 'Event date is required'),
});
export const updateEventSchema = saveEventSchema.partial();
export type SaveEventInput = z.infer<typeof saveEventSchema>;
