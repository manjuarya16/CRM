export interface IProduct {
  id: number;
  sku: string;
  name?: string;
  description?: string;
  quantity: number;
  price?: number;
  created_at?: string;
  updated_at?: string;
  total_count?: number;
  custom_attributes?: Record<string, any>;
}

export interface ProductStore {
  products: IProduct[];
  total: number;
  loading: boolean;
  error: string | null;
  selectedProduct: IProduct | null;
  fetchProducts: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchProductById: (id: number) => Promise<IProduct | null>;
  addProduct: (productData: any) => Promise<any>;
  updateProduct: (id: number, productData: any) => Promise<any>;
  deleteProduct: (id: number) => Promise<void>;
  setSelectedProduct: (product: IProduct | null) => void;
  clearError: () => void;
}
