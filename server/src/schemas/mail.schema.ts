import { z } from 'zod';

export const createMailSchema = z.object({
  subject: z.string().optional().default(''),
  reply_to: z.union([
    z.string(),
    z.array(z.string()),
  ]).transform((val) => (Array.isArray(val) ? val : [val])),
  cc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  bcc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  reply: z.string().min(1, 'Message body is required'),
  is_draft: z.union([z.boolean(), z.string()]).optional().transform((v) => v === true || v === 'true' || v === '1'),
  lead_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  person_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  parent_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
});

export const updateMailSchema = z.object({
  subject: z.string().optional(),
  reply_to: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  cc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  bcc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  reply: z.string().optional(),
  is_draft: z.union([z.boolean(), z.string()]).optional().transform((v) => (v !== undefined ? v === true || v === 'true' || v === '1' : undefined)),
  folders: z.array(z.string()).optional(),
  lead_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  person_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
});

export const massUpdateMailSchema = z.object({
  indices: z.array(z.number()).min(1, 'Please select at least one email'),
  folders: z.array(z.string()).min(1, 'Folders are required'),
  is_read: z.boolean().optional(),
});

export const massDestroyMailSchema = z.object({
  indices: z.array(z.number()).min(1, 'Please select at least one email'),
  type: z.enum(['trash', 'delete']).default('trash'),
});

export type CreateMailInput = z.infer<typeof createMailSchema>;
export type UpdateMailInput = z.infer<typeof updateMailSchema>;
export type MassUpdateMailInput = z.infer<typeof massUpdateMailSchema>;
export type MassDestroyMailInput = z.infer<typeof massDestroyMailSchema>;
