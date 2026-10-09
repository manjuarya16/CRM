import { create } from "zustand";
import { API } from "@/config";

export interface IPipeline {
  id: number;
  name: string;
  code?: string;
  is_default?: boolean;
  stages?: any[];
  [key: string]: any;
}

export interface PipelineStore {
  pipelines: IPipeline[];
  loading: boolean;
  error: string | null;
  fetchPipelines: () => Promise<IPipeline[]>;
  fetchPipelineById: (id: number | string) => Promise<IPipeline | null>;
  savePipeline: (data: any, id?: number | string) => Promise<IPipeline>;
  deletePipeline: (id: number | string) => Promise<boolean>;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  pipelines: [],
  loading: false,
  error: null,

  fetchPipelines: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/pipelines").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ pipelines: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch pipelines" });
      return [];
    }
  },

  fetchPipelineById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/pipelines/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch pipeline" });
      return null;
    }
  },

  savePipeline: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/pipelines/${id}`, data);
      } else {
        res = await API.post("/pipelines", data);
      }
      const saved = res.data?.data || res.data;
      set((state) => ({
        pipelines: id
          ? state.pipelines.map((p) => (String(p.id) === String(id) ? saved : p))
          : [saved, ...state.pipelines],
        loading: false,
      }));
      return saved;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save pipeline" });
      throw err;
    }
  },

  deletePipeline: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/pipelines/${id}`);
      set((state) => ({
        pipelines: state.pipelines.filter((p) => String(p.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete pipeline" });
      throw err;
    }
  },
}));

export default usePipelineStore;
