export interface IUser {
  id: number | string;
  name: string;
  email: string;
  password?: string;
  password_hash?: string;
  status?: boolean;
  view_permission?: string;
  role_id?: number;
  role?: string;
  role_name?: string;
  created_by?: number | null;
  remember_token?: string | null;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type User = IUser;

export type PublicUser = Omit<IUser, 'password' | 'password_hash' | 'role'> & {
  role: string;
};

export type IPublicUser = PublicUser;

export function toPublicUser(user: IUser): PublicUser {
  const { password: _password, password_hash: _passwordHash, role: _role, ...rest } = user;
  return {
    ...rest,
    role: user.role_name || user.role || 'user',
  };
}

export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  permission_type: string;
  permissions?: any;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ICreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  roleId?: number;
  status?: boolean;
}
