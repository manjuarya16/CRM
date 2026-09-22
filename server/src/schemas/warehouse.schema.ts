import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required').max(255, 'Warehouse name is too long'),
  description: z.string().optional().nullable(),
  contact_name: z.string().min(1, 'Contact person name is required').max(255, 'Contact name is too long'),
  contact_emails: z.any().optional().default([]),
  contact_numbers: z.any().optional().default([]),
  contact_address: z.any().optional().default({}),
  locations: z.array(z.any()).optional().default([]),
  custom_attributes: z.any().optional().default({}),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
