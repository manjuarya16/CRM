import { z } from "zod";
export const requestSchema = z
  .object({
    kind: z.enum(["demo", "trial", "contact", "newsletter"]),
    submission_id: z.string().uuid().optional(),
    consent: z.boolean().optional(),
    first_name: z.string().trim().max(100).default(""),
    last_name: z.string().trim().max(100).default(""),
    organization: z.string().trim().max(191).default(""),
    email: z
      .string()
      .trim()
      .min(1, "Work email is required.")
      .email("Enter a valid email address.")
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: z.string().trim().max(40).default(""),
    company: z.string().trim().max(150).default(""),
    company_size: z.string().trim().max(50).default(""),
    job_role: z.string().trim().max(100).default(""),
    city: z.string().trim().max(100).default(""),
    state: z.string().trim().max(100).default(""),
    preferred_demo_date: z
      .string()
      .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Enter a valid demo date.")
      .default(""),
    preferred_demo_time: z
      .string()
      .regex(/^$|^\d{2}:\d{2}$/, "Enter a valid demo time.")
      .default(""),
    message: z.string().trim().max(3000).default(""),
    website: z.string().max(0).default(""),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "newsletter") {
      if (!v.first_name) {
        ctx.addIssue({
          code: "custom",
          path: ["first_name"],
          message: "First name is required.",
        });
      }

      if (v.consent !== true) {
        ctx.addIssue({
          code: "custom",
          path: ["consent"],
          message: "Please agree to the Privacy Policy before submitting.",
        });
      }
    }

    if (v.kind === "demo" && !v.organization) {
      ctx.addIssue({
        code: "custom",
        path: ["organization"],
        message: "Organization name is required.",
      });
    }

    if (v.kind === "contact" && !v.message) {
      ctx.addIssue({
        code: "custom",
        path: ["message"],
        message: "Please enter a message.",
      });
    }
  });
