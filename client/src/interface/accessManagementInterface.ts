export type AccessAction = "can_view" | "can_add" | "can_update" | "can_delete";

export interface ModuleAccess {
  id?: number;
  role_id?: number;
  module_key: string;
  module_name: string;
  can_view: boolean;
  can_add: boolean;
  can_update: boolean;
  can_delete: boolean;
  status?: boolean;
}

export interface AccessManagementStore {
  access: ModuleAccess[];
  userAccess: ModuleAccess[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchRoleAccess: (roleId: number) => Promise<void>;
  fetchUserAccess: (roleId: number) => Promise<void>;
  saveRoleAccess: (roleId: number, access: ModuleAccess[]) => Promise<void>;
  deleteRoleAccess: (roleId: number, moduleKey: string) => Promise<void>;
  setAccess: (access: ModuleAccess[]) => void;
  clearError: () => void;
}
