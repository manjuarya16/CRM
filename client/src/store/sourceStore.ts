import { create } from "zustand";
import { API } from "@/config";

export interface ISource {
  id: number;
  name: string;
  code?: string;
  [key: string]: any;
}

export interface SourceStore {
  sources: ISource[];
  loading: boolean;
  error: string | null;
  fetchSources: () => Promise<ISource[]>;
  saveSource: (data: any, id?: number | string) => Promise<ISource>;
  deleteSource: (id: number | string) => Promise<boolean>;
}

export const useSourceStore = create<SourceStore>((set) => ({
  sources: [],
  loading: false,
  error: null,

  fetchSources: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/sources").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ sources: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch sources" });
      return [];
    }
  },

  saveSource: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/sources/${id}`, data);
      } else {
        res = await API.post("/sources", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save source" });
      throw err;
    }
  },

  deleteSource: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/sources/${id}`);
      set((state) => ({
        sources: state.sources.filter((s) => String(s.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete source" });
      throw err;
    }
  },
}));

export default useSourceStore;
