export interface IProductInventory {
  id?: number;
  warehouse_id: number;
  warehouse_name?: string;
  warehouse_location_id?: number | null;
  warehouse_location_name?: string | null;
  in_stock: number;
  allocated: number;
}

export interface IProduct {
  id: number;
  sku: string;
  name?: string;
  description?: string;
  quantity: number;
  price?: number;
  type?: string;
  created_at?: Date;
  updated_at?: Date;
  total_count?: number;
  custom_attributes?: Record<string, any>;
  inventories?: IProductInventory[];
}

export interface IProductCreateInput {
  sku: string;
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  type?: string;
  custom_attributes?: Record<string, any>;
  inventories?: IProductInventory[];
}

export interface IProductUpdateInput extends Partial<IProductCreateInput> {}
