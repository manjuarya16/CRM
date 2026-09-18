export interface EmailItem {
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
  emails: EmailItem[] | string;
  contact_numbers: ContactItem[] | string;
  organization_id?: number | null;
  organization_name?: string | null;
  job_title?: string | null;
  user_id?: number | null;
  sales_owner_name?: string | null;
  created_at?: string;
  updated_at?: string;
  activities?: any[];
  leads?: any[];
}

export interface PersonFormData {
  name: string;
  emails: EmailItem[];
  contact_numbers: ContactItem[];
  organization_id: string;
  job_title: string;
  user_id: string;
}
