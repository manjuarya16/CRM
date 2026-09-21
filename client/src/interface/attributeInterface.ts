export type AttributeType =
  | 'text'
  | 'textarea'
  | 'price'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'email'
  | 'address'
  | 'phone'
  | 'lookup'
  | 'datetime'
  | 'date'
  | 'image'
  | 'file';

export type EntityType =
  | 'leads'
  | 'persons'
  | 'organizations'
  | 'products'
  | 'quotes'
  | 'warehouses';

export type ValidationType = 'numeric' | 'email' | 'decimal' | 'url' | '';

export interface IAttributeOption {
  id?: number;
  name: string;
  sort_order?: number;
}

export interface IAttribute {
  id?: number;
  code: string;
  name: string;
  type: AttributeType;
  entity_type: EntityType;
  lookup_type?: string | null;
  is_required: boolean;
  is_unique: boolean;
  quick_add?: boolean;
  is_user_defined?: boolean;
  sort_order?: number;
  validation?: ValidationType | null;
  options?: IAttributeOption[] | string[];
  created_at?: string;
  updated_at?: string;
}
