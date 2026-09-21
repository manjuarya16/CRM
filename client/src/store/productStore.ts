import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { IProduct, ProductStore } from "@/interface/productInterface";

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  total: 0,
  loading: false,
  error: null,
  selectedProduct: null,

  fetchProducts: async (page = 1, limit = 10, search = "") => {
    set({ loading: true });
    try {
      const response = await API.get(`/products?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      if (response.data?.success) {
        set({
          products: response.data.data || [],
          total: response.data.total || 0,
          error: null,
        });
      } else {
        set({ error: "Failed to fetch products" });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching products" });
    } finally {
      set({ loading: false });
    }
  },

  fetchProductById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/products/${id}`);
      if (response.data?.success) {
        set({ selectedProduct: response.data.data, error: null });
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || "Error fetching product" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  addProduct: async (productData: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/products/create", productData);
      if (response.data?.success) {
        set((state) => ({
          products: [response.data.data, ...state.products],
          total: state.total + 1,
          error: null,
        }));
        handleSuccessResponse("Product", "created", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to create product");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Product", "create", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProduct: async (id: number, productData: any) => {
    set({ loading: true });
    try {
      const response = await API.put(`/products/update/${id}`, productData);
      if (response.data?.success) {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...productData, ...response.data.data } : p
          ),
          error: null,
        }));
        handleSuccessResponse("Product", "updated", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to update product");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Product", "update", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteProduct: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.delete(`/products/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
          total: Math.max(0, state.total - 1),
          error: null,
        }));
        handleSuccessResponse("Product", "deleted", null);
      } else {
        throw new Error(response.data?.message || "Failed to delete product");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Product", "delete", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedProduct: (product: IProduct | null) => set({ selectedProduct: product }),
  clearError: () => set({ error: null }),
}));

export default useProductStore;
