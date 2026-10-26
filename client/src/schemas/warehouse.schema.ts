import { z } from "zod";
import { zodResolver } from "@/utils/zodResolver";

export const warehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(255, "Warehouse name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Warehouse name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Warehouse name must contain at least one letter",
    }),
  description: z.string().trim().optional().or(z.literal("")).nullable(),
  contact_name: z
    .string()
    .trim()
    .min(1, "Contact name is required")
    .max(255, "Contact name is too long")
    .refine((val) => !/^[0-9\W_]+$/.test(val), {
      message: "Contact name cannot consist of only special characters or numbers",
    })
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: "Contact name must contain at least one letter",
    }),
  contact_emails: z.any().optional().default([]),
  contact_numbers: z
    .any()
    .optional()
    .default([])
    .superRefine((val, ctx) => {
      if (!val) return;
      const list = Array.isArray(val) ? val : [val];
      for (const item of list) {
        const phone = typeof item === "object" && item !== null ? item.value : String(item);
        if (!phone || !String(phone).trim()) continue;
        const cleaned = String(phone).trim();
        let coreDigits = cleaned;
        if (cleaned.startsWith("+")) {
          const match = cleaned.match(/^\+\d{1,3}(\d{10})$/);
          if (!match) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please enter a valid 10-digit mobile number (e.g. 9876543210 or +919876543210).",
            });
            return;
          }
          coreDigits = match[1];
        } else {
          if (!/^\d+$/.test(cleaned)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Mobile number must contain only digits.",
            });
            return;
          }
          if (cleaned.length !== 10) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Mobile number must be exactly 10 digits.",
            });
            return;
          }
          coreDigits = cleaned;
        }
        if (/^(\d)\1{9}$/.test(coreDigits)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Mobile number cannot consist of all identical digits (e.g. 0000000000).",
          });
          return;
        }
        if (coreDigits.startsWith("0")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Mobile number cannot start with 0.",
          });
          return;
        }
      }
    }),
  contact_address: z.any().optional().default({}),
  locations: z.array(z.any()).optional().default([]),
  custom_attributes: z.record(z.string(), z.any()).optional().default({}),
});

export const warehouseSchemaResolver = zodResolver(warehouseSchema);

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
