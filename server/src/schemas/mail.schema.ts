import { z } from 'zod';

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const createMailSchema = z.object({
  subject: z.string().optional().default(''),
  to: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  reply_to: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  cc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  bcc: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : [])),
  reply: z.string().optional().default(''),
  body: z.string().optional(),
  message: z.string().optional(),
  is_draft: z.union([z.boolean(), z.string()]).optional().transform((v) => v === true || v === 'true' || v === '1'),
  lead_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  person_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  quote_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  organization_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  parent_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
}).superRefine((data, ctx) => {
  const isDraft = data.is_draft;
  if (!isDraft) {
    const recipients = (data.reply_to && data.reply_to.length > 0) ? data.reply_to : data.to;
    if (!recipients || recipients.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one recipient email address is required',
        path: ['reply_to'],
      });
    }
  }
  const checkList = (list: string[] | undefined, field: string) => {
    if (!list) return;
    for (const em of list) {
      if (em && !emailRegex.test(em.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid email address format: "${em}"`,
          path: [field],
        });
      }
    }
  };
  checkList(data.to, 'to');
  checkList(data.reply_to, 'reply_to');
  checkList(data.cc, 'cc');
  checkList(data.bcc, 'bcc');
});

export const updateMailSchema = z.object({
  subject: z.string().optional(),
  to: z.union([
    z.string(),
    z.array(z.string()),
  ]).optional().transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
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
  body: z.string().optional(),
  message: z.string().optional(),
  is_draft: z.union([z.boolean(), z.string()]).optional().transform((v) => (v !== undefined ? v === true || v === 'true' || v === '1' : undefined)),
  folders: z.array(z.string()).optional(),
  lead_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  person_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  quote_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
  organization_id: z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v ? Number(v) : null)),
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
