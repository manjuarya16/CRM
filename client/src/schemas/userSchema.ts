import { z } from "zod";

/**
 * Base user fields shared between create and update schemas
 */
const baseUserFields = {
  id: z.coerce.number().nullable().optional(),

  user_id: z
    .string()
    .min(1, "User ID is required")
    .max(50, "User ID must not exceed 50 characters")
    .regex(/^(?:USR-)?\d+$/i, "User ID must be numeric or start with 'USR-'")
    .optional(),

  name: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return val;
      if (typeof val === "string") return val.trim();
      return val;
    },
    z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      .regex(/^[A-Za-z\s'\-\.]+$/, "Name contains invalid characters"),
  ),

  email: z.string().trim().email("Invalid email address"),

  phone: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return "";
      if (typeof val === "string" && val.trim() === "") return "";
      return String(val);
    },
    z
      .string()
      .min(7, "Phone number is required")
      .superRefine((val, ctx) => {
        if (!val) return;
        // prefer length error first
        if (val.length > 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phone must not exceed 10 characters",
          });
          return;
        }
        const phoneRe = /^(?!0{7,10})\d{7,10}$/;
        if (!phoneRe.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phone must contain only digits (7-10 characters)",
          });
        }
      }),
  ),

  profile_img: z.string().optional().nullable(),

  // IDs
  role_id: z.coerce.number().optional(),
  branch_id: z.coerce.number().optional(),
  department_id: z.coerce.number().optional(),
  organization_id: z.coerce.number().optional().nullable(),
  address_id: z.coerce.number().optional().nullable(),

  // Address fields
  street: z.preprocess((val) => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === "string") return val.trim();
    return val;
  }, z.string().max(250, "Street must not exceed 250 characters").optional()),

  city: z.string().optional().or(z.literal("")),

  state: z.string().optional().or(z.literal("")),

  state_id: z.coerce.number().optional(),
  city_id: z.coerce.number().optional(),

  postal_code: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return undefined;
      if (typeof val === "string") {
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      }
      return val;
    },
    z
      .string()
      .max(20, "Postal code must not exceed 20 characters")
      .regex(/^[0-9]+$/, "Postal code must contain only digits")
      .optional(),
  ),

  country: z.string().optional().or(z.literal("")),

  address_type: z.string().optional().default("home"),
};

/**
 * Schema for creating a new user — password is required
 */
export const createUserSchema = z
  .object({
    ...baseUserFields,

    role_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Role is required" })
        .int()
        .positive({ message: "Role is required" }),
    ),

    branch_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Branch is required" })
        .int()
        .positive({ message: "Branch is required" }),
    ),

    department_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Department is required" })
        .int()
        .positive({ message: "Department is required" }),
    ),

    state_id: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return Number(val);
    }, z.number().int().optional()),

    city_id: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return Number(val);
    }, z.number().int().optional()),

    password: z
      .string({ error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),

    password_confirm: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.password &&
        data.password_confirm !== undefined &&
        data.password_confirm !== "" &&
        data.password !== data.password_confirm
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["password_confirm"],
    },
  );

/**
 * Schema for updating an existing user — password is optional
 */
export const updateUserSchema = z
  .object({
    ...baseUserFields,

    role_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Role is required" })
        .int()
        .positive({ message: "Role is required" }),
    ),

    branch_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Branch is required" })
        .int()
        .positive({ message: "Branch is required" }),
    ),

    department_id: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        return Number(val);
      },
      z
        .number({ error: "Department is required" })
        .int()
        .positive({ message: "Department is required" }),
    ),

    state_id: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return Number(val);
    }, z.number().int().optional()),

    city_id: z.preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      return Number(val);
    }, z.number().int().optional()),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional()
      .or(z.literal("")),

    password_confirm: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        data.password &&
        data.password_confirm !== undefined &&
        data.password_confirm !== "" &&
        data.password !== data.password_confirm
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["password_confirm"],
    },
  );

/**
 * Backward-compatible alias — use createUserSchema or updateUserSchema directly
 */
export const userSchema = createUserSchema;

/**
 * Schema for forgot password flow
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

/**
 * Schema for reset password with confirmation
 */
export const resetPasswordSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    new_password: z
      .string({ error: "New password is required" })
      .min(6, "Password must be at least 6 characters"),
    confirm_password: z
      .string({ error: "Please confirm your password" })
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
