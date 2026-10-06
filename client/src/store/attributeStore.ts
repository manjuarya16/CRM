import { create } from "zustand";
import { API } from "@/config";

export interface IAttribute {
  id: number;
  code: string;
  name: string;
  type: string;
  entity_type?: string;
  options?: any[];
  [key: string]: any;
}

export interface AttributeStore {
  attributes: IAttribute[];
  loading: boolean;
  error: string | null;
  fetchAttributes: (entityType?: string) => Promise<IAttribute[]>;
  fetchAttributeById: (id: number | string) => Promise<IAttribute | null>;
  saveAttribute: (data: any, id?: number | string) => Promise<IAttribute>;
  deleteAttribute: (id: number | string) => Promise<boolean>;
}

export const useAttributeStore = create<AttributeStore>((set) => ({
  attributes: [],
  loading: false,
  error: null,

  fetchAttributes: async (entityType?: string) => {
    set({ loading: true, error: null });
    try {
      const url = entityType ? `/attributes?entity_type=${entityType}` : "/attributes";
      const res = await API.get(url).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ attributes: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch attributes" });
      return [];
    }
  },

  fetchAttributeById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/attributes/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch attribute" });
      return null;
    }
  },

  saveAttribute: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/attributes/${id}`, data);
      } else {
        res = await API.post("/attributes", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save attribute" });
      throw err;
    }
  },

  deleteAttribute: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/attributes/${id}`);
      set((state) => ({
        attributes: state.attributes.filter((a) => String(a.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete attribute" });
      throw err;
    }
  },
}));

export default useAttributeStore;
