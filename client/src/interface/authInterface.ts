export interface UserData {
  id: number;
  name: string;
  email: string;
  profile_img?: string;
  role_id?: number;
  organization_id?: number;
  branch_id?: number;
}

export interface AuthState {
  user: UserData | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  userLoggedIn: boolean;
  userSignUp: boolean;
  userLogout: boolean;
  passwordReset: boolean;
  registerError: string | null;
  resetEmail?: string | null;

  // Actions
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, new_password: string) => Promise<any>;
  setUser: (user: UserData | null) => void;
  setToken: (token: string | null) => void;
  reset: () => void;
  initializeAuth: () => void;
}

export interface loginData {
  username: string;
  password: string;
}
