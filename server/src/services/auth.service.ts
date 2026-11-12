import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { pool } from '@/config/db';
import { ApiError } from '@/middleware/errorHandler';
import { PublicUser, toPublicUser } from '@/interfaces';
import { UserService } from '@/services/user.service';
import { logger } from '@/utils/logger';
import { RegisterInput, LoginInput, ResetPasswordInput, UpdateProfileInput, ChangePasswordInput } from '@/schemas/auth.schema';

export class AuthService {
  /**
   * Signs a JWT token for the authenticated user
   */
  public static signToken(userId: number | string, tenantId?: number | null): string {
    return jwt.sign(
      { sub: String(userId), tenant_id: tenantId },
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

      const token = this.signToken(user.id, user.tenant_id);
      return { user: toPublicUser(user), token };
    } catch (error: any) {
      logger.error({ error, email: input.email }, 'AuthService.register failed');
      throw error;
    }
  }

  /**
   * Business logic for user login
   */
  public static async login(input: LoginInput, tenantId?: number): Promise<{ user: PublicUser; token: string }> {
    try {
      const identifier = (input.email || input.username) as string;

      const user = await UserService.findByEmail(identifier, tenantId);
      if (!user) {
        logger.warn({ identifier, tenantId }, 'AuthService.login failed: user not found');
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

      const token = this.signToken(user.id, user.tenant_id);
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
        throw new ApiError(404, 'Email address is not registered in our system. Please check your email address.');
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
      await pool.query('SELECT save_user(null, null, $1, null, null, null, null, null, $2) as result', [hashedPassword, user.id]);
      return true;
    } catch (error: any) {
      logger.error({ error, email: input.email }, 'AuthService.resetPassword failed');
      throw error;
    }
  }

  /**
   * Update authenticated user's own profile (name & email)
   */
  public static async updateProfile(
    userId: number | string,
    input: UpdateProfileInput,
    tenantId?: number
  ): Promise<PublicUser> {
    try {
      const normalizedEmail = input.email.trim().toLowerCase();
      const trimmedName = input.name.trim();
      const numericId = Number(userId);
      if (!Number.isSafeInteger(numericId) || numericId <= 0) {
        throw new ApiError(400, 'Invalid user account');
      }

      const duplicateParams: any[] = [normalizedEmail, numericId];
      let duplicateQuery = 'SELECT id FROM public.users WHERE LOWER(email) = $1 AND id <> $2';
      if (tenantId !== undefined && tenantId !== null) {
        duplicateParams.push(tenantId);
        duplicateQuery += ' AND tenant_id = $' + duplicateParams.length;
      }
      duplicateQuery += ' LIMIT 1';

      const existing = await pool.query(duplicateQuery, duplicateParams);
      if (existing.rowCount && existing.rowCount > 0) {
        throw new ApiError(409, 'A user with this email address already exists');
      }

      const updateParams: any[] = [trimmedName, normalizedEmail, numericId];
      let updateQuery = 'UPDATE public.users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3';
      if (tenantId !== undefined && tenantId !== null) {
        updateParams.push(tenantId);
        updateQuery += ' AND tenant_id = $' + updateParams.length;
      }
      updateQuery += ' RETURNING id';

      const updatedRes = await pool.query(updateQuery, updateParams);
      if (!updatedRes.rowCount) {
        throw new ApiError(404, 'User not found');
      }

      const updatedUser = await UserService.findById(numericId, tenantId);
      if (!updatedUser) {
        throw new ApiError(404, 'User not found');
      }

      return toPublicUser(updatedUser);
    } catch (error: any) {
      logger.error({ error, userId }, 'AuthService.updateProfile failed');
      throw error;
    }
  }

  /**
   * Change authenticated user's own password after verifying current password
   */
  public static async changePassword(
    userId: number | string,
    input: ChangePasswordInput,
    tenantId?: number
  ): Promise<boolean> {
    try {
      const numericId = Number(userId);
      if (!Number.isSafeInteger(numericId) || numericId <= 0) {
        throw new ApiError(400, 'Invalid user account');
      }

      const user = await UserService.findById(numericId, tenantId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const rawHash = user.password_hash || user.password;
      if (!rawHash) {
        throw new ApiError(400, 'Password cannot be verified for this account');
      }

      const normalizedHash = rawHash.replace(/^\$2y\$/, '$2a$');
      const isMatch = await bcrypt.compare(input.current_password, normalizedHash);
      if (!isMatch) {
        throw new ApiError(400, 'Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(input.new_password, 10);
      await pool.query('SELECT save_user(null, null, $1, null, null, null, null, null, $2) as result', [
        hashedPassword,
        user.id,
      ]);
      return true;
    } catch (error: any) {
      logger.error({ error, userId }, 'AuthService.changePassword failed');
      throw error;
    }
  }
}
