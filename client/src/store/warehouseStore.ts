import { create } from "zustand";
import { API } from "@/config";

export interface IWarehouse {
  id: number;
  name: string;
  code?: string;
  description?: string;
  contact_name?: string;
  contact_emails?: any;
  contact_numbers?: any;
  address?: any;
  locations?: any[];
  [key: string]: any;
}

export interface WarehouseStore {
  warehouses: IWarehouse[];
  loading: boolean;
  error: string | null;
  fetchWarehouses: () => Promise<IWarehouse[]>;
  fetchWarehouseById: (id: number | string) => Promise<IWarehouse | null>;
  fetchWarehouseProducts: (id: number | string) => Promise<any[]>;
  saveWarehouse: (data: any, id?: number | string) => Promise<any>;
  deleteWarehouse: (id: number | string) => Promise<boolean>;
}

export const useWarehouseStore = create<WarehouseStore>((set) => ({
  warehouses: [],
  loading: false,
  error: null,

  fetchWarehouses: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/warehouses/").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ warehouses: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch warehouses" });
      return [];
    }
  },

  fetchWarehouseById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/warehouses/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch warehouse" });
      return null;
    }
  },

  fetchWarehouseProducts: async (id: number | string) => {
    try {
      const res = await API.get(`/warehouses/${id}/products`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  saveWarehouse: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/warehouses/${id}`, data);
      } else {
        res = await API.post("/warehouses/", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save warehouse" });
      throw err;
    }
  },

  deleteWarehouse: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/warehouses/${id}`);
      set((state) => ({
        warehouses: state.warehouses.filter((w) => String(w.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete warehouse" });
      throw err;
    }
  },
}));

export default useWarehouseStore;
