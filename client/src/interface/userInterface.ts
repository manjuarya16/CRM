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

export interface UserFormDataAdd {
  name: string;
  email: string;
  phone?: string;
  user_id?: string;
  password?: string;
  role_id?: number;
  branch_id?: number;
  department_id?: number;
  organization_id?: number;
  // Address fields
  street?: string;
  city?: string;
  state?: string;
  // store ids for dependent selects
  state_id?: number;
  city_id?: number;
  postal_code?: string;
  country?: string;
  address_type?: string;
}

export interface UserFormDataEit {
  id?: number;
  user_id?: string | number;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role_id?: number;
  branch_id?: number;
  department_id?: number;
  organization_id?: number;
  // Address fields
  street?: string;
  city?: string;
  state?: string;
  state_id?: number;
  city_id?: number;
  postal_code?: string;
  country?: string;
  address_type?: string;
}

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
