import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role_id: z.coerce.number().optional().default(1),
});

export const loginSchema = z
  .object({
    email: z.string().email('Invalid email address').optional(),
    username: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((data) => Boolean(data.email || data.username), {
    message: 'Email or username is required',
    path: ['username'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
