export interface IOrganizationAddress {
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
}

export interface IOrganization {
  id: number;
  name: string;
  address?: IOrganizationAddress | string | null;
  user_id?: number | null;
  person_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationFormData {
  name: string;
  address: string;
  country: string;
  state: string;
  city: string;
  postcode: string;
  user_id: string;
}

export interface OrganizationState {
  organization: any;
  loading: boolean;
  error: any;

  getOrganization: () => Promise<void>;
  updateOrganization: (id: string, data: any) => Promise<any>;
}
