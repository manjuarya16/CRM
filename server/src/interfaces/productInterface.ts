export interface IProduct {
  id: number;
  sku: string;
  name?: string;
  description?: string;
  quantity: number;
  price?: number;
  created_at?: Date;
  updated_at?: Date;
  total_count?: number;
}

export interface IProductCreateInput {
  sku: string;
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
}

export interface IProductUpdateInput extends Partial<IProductCreateInput> {}
