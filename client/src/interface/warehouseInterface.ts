export interface IWarehouseLocation {
  id?: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface IWarehouseAddress {
  country?: string;
  state?: string;
  city?: string;
  postcode?: string;
  street_address?: string;
}

export interface IWarehouse {
  id: number;
  name: string;
  description?: string | null;
  contact_name: string;
  contact_emails: string[] | { value: string }[] | string;
  contact_numbers: string[] | { value: string }[] | string;
  contact_address: IWarehouseAddress | string;
  location_count?: number;
  locations?: IWarehouseLocation[];
  created_at?: string;
  updated_at?: string;
}

export interface WarehouseFormProps {
  mode: "create" | "edit";
}
