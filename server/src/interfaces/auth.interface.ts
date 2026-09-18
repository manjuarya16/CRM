import { PublicUser } from './user.interface';

export interface IJwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface IAuthResponse {
  success: boolean;
  token: string;
  user: PublicUser;
}

export interface ILogoutResponse {
  success: boolean;
  message: string;
}
