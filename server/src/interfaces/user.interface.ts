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
  permission_type?: string;
  permissions?: string[] | any;
  created_by?: number | null;
  remember_token?: string | null;
  image?: string | null;
  tenant_id?: number | null;
  organization_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type User = IUser;

export type PublicUser = Omit<IUser, 'password' | 'password_hash' | 'role'> & {
  role: string;
  permission_type?: string;
  permissions?: string[] | any;
  tenant_id?: number | null;
  organization_id?: number | null;
};

export type IPublicUser = PublicUser;

export function toPublicUser(user: IUser): PublicUser {
  const { password: _password, password_hash: _passwordHash, role: _role, ...rest } = user;
  const tenantId = user.tenant_id ? Number(user.tenant_id) : 1;
  const organizationId = user.organization_id ? Number(user.organization_id) : tenantId;
  return {
    ...rest,
    tenant_id: tenantId,
    organization_id: organizationId,
    role: user.role_name || user.role || 'user',
    permission_type: user.permission_type || 'all',
    permissions: user.permissions || [],
  };
}

export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  permission_type: string;
  permissions?: any;
  parent_role_id?: number | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  user_count?: number;
}

export interface ICreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  roleId?: number;
  status?: boolean;
}
