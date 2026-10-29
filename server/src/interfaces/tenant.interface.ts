export interface ITenantAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface ITenantSettings {
  email?: string;
  phone?: string;
  website?: string;
  registration_no?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  address?: ITenantAddress;
  logo_url?: string | null;
  description?: string;
  registered_under_act?: string;
  social_media_links?: string;
  ceo_name?: string;
  ceo_contact?: string;
  chairperson_name?: string;
  chairperson_contact?: string;
  [key: string]: unknown;
}

export interface ITenant {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  plan?: string;
  logo_url?: string | null;
  settings?: ITenantSettings | null;
  created_at?: string;
  updated_at?: string;
}

export interface ITenantWithStats extends ITenant {
  user_count: number;
  lead_count: number;
}

export interface IProvisionedTenantAdmin {
  id: number;
  name: string;
  email: string;
  role_id: number;
  tenant_id: number;
}

export interface ISuperAdminLoginRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  status: string;
}

export interface ISuperAdminMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalLeads: number;
}

export interface ISuperAdmin {
  id: number;
  name: string;
  email: string;
  status: string;
  platform_role_id?: number | null;
  role_name?: string | null;
  permissions?: string[];
  created_at?: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  trial_subscription?: {
    pricing_tier_id: number | null;
    ends_at: string;
  };
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  logo_url?: string;
  description?: string;
  registered_under_act?: string;
  social_media_links?: string;
  ceo_name?: string;
  ceo_contact?: string;
  chairperson_name?: string;
  chairperson_contact?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: ITenantAddress;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  plan?: string;
  status?: 'active' | 'suspended';
  logo_url?: string | null;
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  description?: string;
  registered_under_act?: string;
  social_media_links?: string;
  ceo_name?: string;
  ceo_contact?: string;
  chairperson_name?: string;
  chairperson_contact?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: ITenantAddress;
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
}
