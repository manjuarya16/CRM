export interface ITenant {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan?: string;
  logo_url?: string | null;
  settings?: any;
  created_at?: string;
  updated_at?: string;
}

export interface ISuperAdmin {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at?: string;
}
