import { RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { UserModel, toPublicUser } from '@/models/user.model';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
}).refine(data => data.email || data.username, {
  message: 'Email or username is required',
});

function signToken(userId: number | string): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export const register: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await UserModel.findByEmail(email);
    if (existing) throw new ApiError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, passwordHash });
    const token = signToken(user.id);

    res.status(201).json({ success: true, user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const identifier = (body.email || body.username) as string;

    const user = await UserModel.findByEmail(identifier);
    if (!user) throw new ApiError(401, 'Invalid email or password');

    if (user.status === false) {
      throw new ApiError(403, 'Your account has been deactivated. Please contact administrator.');
    }

    const hash = user.password_hash || user.password;
    if (!hash) throw new ApiError(401, 'Invalid email or password');

    const isMatch = await bcrypt.compare(body.password, hash);
    if (!isMatch) throw new ApiError(401, 'Invalid email or password');

    const token = signToken(user.id);
    res.json({ success: true, user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

export const me: RequestHandler = (req, res) => {
  res.json({ success: true, user: req.user });
};

