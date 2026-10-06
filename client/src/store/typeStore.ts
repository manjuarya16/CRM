import { create } from "zustand";
import { API } from "@/config";

export interface IType {
  id: number;
  name: string;
  code?: string;
  [key: string]: any;
}

export interface TypeStore {
  types: IType[];
  loading: boolean;
  error: string | null;
  fetchTypes: () => Promise<IType[]>;
  saveType: (data: any, id?: number | string) => Promise<IType>;
  deleteType: (id: number | string) => Promise<boolean>;
}

export const useTypeStore = create<TypeStore>((set) => ({
  types: [],
  loading: false,
  error: null,

  fetchTypes: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/types").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ types: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch types" });
      return [];
    }
  },

  saveType: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/types/${id}`, data);
      } else {
        res = await API.post("/types", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save type" });
      throw err;
    }
  },

  deleteType: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/types/${id}`);
      set((state) => ({
        types: state.types.filter((t) => String(t.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete type" });
      throw err;
    }
  },
}));

export default useTypeStore;
