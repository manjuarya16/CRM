export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  permission_type?: string | null;
  permissions?: any;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  user_count?: number;
}

export interface Role {
  id: number;
  role_id: string;
  organization_id: number;
  branch_id: number;
  name: string;
  is_main?: boolean;
  description?: string;
  permissions?: Record<string, any>;
  parent_role_id?: number | null;
  branch_type?: string;
  status: boolean;
}

export interface RoleFormDataAdd {
  id?: number;
  name: string;
  description?: string;
  organization_id?: number;
  branch_id?: number | null;
  parent_role_id?: number | null;
}

export interface RoleFormDataEdit {
  id?: number;
  name: string;
  description?: string;
  organization_id?: number;
  branch_id?: number | null;
  parent_role_id?: number | null;
}

export interface RoleStore {
  roles: Role[];
  loading: boolean;
  error: string | null;
  selectedRole: Role | null;

  fetchRoles: () => Promise<void>;
  fetchRoleById: (id: number) => Promise<void>;
  addRole: (roleData: any) => Promise<void>;
  updateRole: (id: number, roleData: any) => Promise<void>;
  deleteRole: (id: number) => Promise<void>;

  setSelectedRole: (role: Role | null) => void;
  clearError: () => void;
}

export interface RoleNode extends Role {
  children: RoleNode[];
}

export interface FlatRole extends Role {
  children: RoleNode[];
  __depth: number;
  __isLast: boolean;
  __lastChild: boolean[];
}
