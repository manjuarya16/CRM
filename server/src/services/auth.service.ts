import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { ApiError } from '@/middleware/errorHandler';
import { PublicUser, toPublicUser } from '@/interfaces';
import { UserService } from '@/services/user.service';
import { logger } from '@/utils/logger';
import { RegisterInput, LoginInput } from '@/schemas/auth.schema';

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
  }

  /**
   * Business logic for user login
   */
  public static async login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
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
  }
}
