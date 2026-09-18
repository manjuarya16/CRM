export interface IOrganization {
  id: number;
  name: string;
  address?: any;
  user_id?: number | null;
  person_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IPerson {
  id: number;
  name: string;
  emails: any;
  contact_numbers?: any;
  organization_id?: number | null;
  job_title?: string | null;
  user_id?: number | null;
  unique_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IProduct {
  id: number;
  sku: string;
  name?: string | null;
  description?: string | null;
  quantity: number;
  price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface IQuote {
  id: number;
  subject: string;
  description?: string | null;
  billing_address?: any;
  shipping_address?: any;
  discount_percent?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  adjustment_amount?: number | null;
  sub_total?: number | null;
  grand_total?: number | null;
  expired_at?: string | null;
  person_id: number;
  user_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface IActivity {
  id: number;
  title?: string | null;
  type: string;
  comment?: string | null;
  additional?: any;
  schedule_from?: string | null;
  schedule_to?: string | null;
  is_done: boolean;
  user_id?: number | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IWarehouse {
  id: number;
  name: string;
  description?: string | null;
  contact_name: string;
  contact_emails: any;
  contact_numbers: any;
  contact_address: any;
  created_at?: string;
  updated_at?: string;
}
