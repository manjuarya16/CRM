export interface PersonEmailItem {
  label: "work" | "home" | "other";
  value: string;
}

export interface ContactItem {
  label: "work" | "mobile" | "home" | "other";
  value: string;
}

export interface IPerson {
  id: number;
  name: string;
  emails: PersonEmailItem[] | string;
  contact_numbers: ContactItem[] | string;
  organization_id?: number | null;
  organization_name?: string | null;
  job_title?: string | null;
  user_id?: number | null;
  sales_owner_name?: string | null;
  address?: any;
  billing_address?: any;
  created_at?: string;
  updated_at?: string;
  custom_attributes?: any;
  activities?: any[];
  leads?: any[];
}

export interface PersonFormData {
  name: string;
  emails: PersonEmailItem[];
  contact_numbers: ContactItem[];
  organization_id: string;
  job_title: string;
  user_id: string;
}

export interface PersonState {
  persons: IPerson[];
  loading: boolean;
  total: number;
  error: any;
  fetchPersons: (params?: { page?: number; perPage?: number; limit?: number; per_page?: number; search?: string }) => Promise<void>;
  getPersonById: (id: number | string) => Promise<IPerson | null>;
  savePerson: (data: PersonFormData | any, id?: number | string) => Promise<IPerson>;
  deletePerson: (id: number | string) => Promise<boolean>;
  clearAllPersons: () => Promise<{ success: boolean; message: string }>;
  checkDuplicate: (email?: string, phone?: string, excludeId?: number | string) => Promise<any>;
}
