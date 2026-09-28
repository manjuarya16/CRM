export interface User {
  id: number;
  user_id?: number | string;
  name: string;
  email: string;
  phone?: string;
  profile_img?: string | null;
  role_id?: number;
  organization_id?: number;
  branch_id?: number;
  department_id?: number;
  status?: boolean;
  // Address fields
  street?: string;
  city?: string;
  state?: string;
  state_id?: number;
  city_id?: number;
  postal_code?: string;
  country?: string;
  address_type?: string;
  address_line1?: string;
}

export interface IUserData {
  id: number;
  name: string;
  email: string;
  status: boolean;
  view_permission: "global" | "group" | "individual" | string;
  role_id: number;
  role_name?: string;
  image?: string | null;
  created_at?: string;
  updated_at?: string;
  groups?: Array<{ id: number; name: string }>;
  group_ids?: number[];
}

export interface UserFormDataAdd {
  user_id?: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  phone?: string;
  phone_number?: string;
  role_id?: number;
  organization_id?: number;
  branch_id?: number;
  department_id?: number;
  password?: string;
  password_confirmation?: string;
  // Address fields
  street?: string;
  city?: string;
  city_id?: number;
  state?: string;
  state_id?: number;
  postal_code?: string;
  country?: string;
  address_type?: string;
  [key: string]: any;
}

export interface UserFormDataEdit {
  user_id?: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  role_id?: number;
  organization_id?: number;
  branch_id?: number;
  department_id?: number;
  status?: boolean;
  // Address fields
  street?: string;
  city?: string;
  city_id?: number;
  state?: string;
  state_id?: number;
  postal_code?: string;
  country?: string;
  address_type?: string;
  [key: string]: any;
}

export type UserFormDataEit = UserFormDataEdit;

export interface UsersResponse {
  rows: any[];
  total: number;
  page: number;
  per_page: number;
}

export interface UserStore {
  users: User[];
  loading: boolean;
  error: string | null;
  selectedUser: User | null;

  // Actions
  fetchUsers: (
    page?: number,
    per_page?: number,
    force?: boolean,
    excludeRole?: number | string | null,
  ) => Promise<UsersResponse | void>;
  fetchUserById: (id: number, force?: boolean) => Promise<void>;
  addUser: (userData: any) => Promise<any>;
  updateUser: (id: number, userData: any) => Promise<any>;
  deleteUser: (id: number) => Promise<boolean>;

  setSelectedUser: (user: User | null) => void;
  clearError: () => void;
}

export interface RecoverPasswordData {
  email: string;
}

export interface LocationOption {
  id: number;
  name: string;
}

export interface UserProfileInfoRowProps {
  icon: string;
  label: string;
  value?: string | number;
  editKey?: string;
  editing?: boolean;
  form?: Record<string, any>;
  patch?: (key: string, val: string) => void;
  type?: string;
  readonly?: boolean;
}
