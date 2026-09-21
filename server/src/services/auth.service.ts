import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { ApiError } from '@/middleware/errorHandler';
import { PublicUser, toPublicUser } from '@/interfaces';
import { UserService } from '@/services/user.service';
import { logger } from '@/utils/logger';
import { RegisterInput, LoginInput, ResetPasswordInput } from '@/schemas/auth.schema';

export class AuthService {
  /**
   * Signs a JWT token for the authenticated user
   */
  public static signToken(userId: number | string): string {
    return jwt.sign(
      { sub: String(userId) },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
    );
  }

  /**
   * Business logic for user registration
   */
  public static async register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
    try {
      const existing = await UserService.findByEmail(input.email);
      if (existing) {
        throw new ApiError(409, 'Email is already registered');
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await UserService.create({
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: input.role_id,
        status: true,
      });

      const token = this.signToken(user.id);
      return { user: toPublicUser(user), token };
    } catch (error: any) {
      logger.error({ error, email: input.email }, 'AuthService.register failed');
      throw error;
    }
  }

  /**
   * Business logic for user login
   */
  public static async login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
    try {
      const identifier = (input.email || input.username) as string;

      const user = await UserService.findByEmail(identifier);
      if (!user) {
        logger.warn({ identifier }, 'AuthService.login failed: user not found');
        throw new ApiError(401, 'Invalid email or password');
      }

      if (user.status === false) {
        throw new ApiError(403, 'Your account has been deactivated. Please contact administrator.');
      }

      const rawHash = user.password_hash || user.password;
      if (!rawHash) {
        logger.warn({ identifier }, 'AuthService.login failed: no password stored');
        throw new ApiError(401, 'Invalid email or password');
      }

      // Convert PHP/Laravel $2y$ prefix to $2a$ for Node bcrypt compatibility
      const hash = rawHash.replace(/^\$2y\$/, '$2a$');

      const isMatch = await bcrypt.compare(input.password, hash);
      if (!isMatch) {
        logger.warn({ identifier }, 'AuthService.login failed: password mismatch');
        throw new ApiError(401, 'Invalid email or password');
      }

      const token = this.signToken(user.id);
      return { user: toPublicUser(user), token };
    } catch (error: any) {
      if (!(error instanceof ApiError)) {
        logger.error({ error }, 'AuthService.login failed unexpectedly');
      }
      throw error;
    }
  }

  /**
   * Forgot password flow
   */
  public static async forgotPassword(email: string): Promise<boolean> {
    try {
      const user = await UserService.findByEmail(email);
      if (!user) {
        throw new ApiError(404, 'Email not found. Please check and try again.');
      }
      return true;
    } catch (error: any) {
      logger.error({ error, email }, 'AuthService.forgotPassword failed');
      throw error;
    }
  }

  /**
   * Reset password flow
   */
  public static async resetPassword(input: ResetPasswordInput): Promise<boolean> {
    try {
      const user = await UserService.findByEmail(input.email);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }
      const hashedPassword = await bcrypt.hash(input.new_password, 10);
      await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, user.id]);
      return true;
    } catch (error: any) {
      logger.error({ error, email: input.email }, 'AuthService.resetPassword failed');
      throw error;
    }
  }
}
