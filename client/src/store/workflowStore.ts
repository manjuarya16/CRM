import { create } from "zustand";
import { API } from "@/config";

export interface IWorkflow {
  id: number;
  name: string;
  [key: string]: any;
}

export interface WorkflowStore {
  workflows: IWorkflow[];
  loading: boolean;
  error: string | null;
  fetchWorkflows: () => Promise<IWorkflow[]>;
  fetchWorkflowById: (id: number | string) => Promise<IWorkflow | null>;
  saveWorkflow: (data: any, id?: number | string) => Promise<IWorkflow>;
  deleteWorkflow: (id: number | string) => Promise<boolean>;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  loading: false,
  error: null,

  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/workflows").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ workflows: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch workflows" });
      return [];
    }
  },

  fetchWorkflowById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/workflows/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch workflow" });
      return null;
    }
  },

  saveWorkflow: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/workflows/${id}`, data);
      } else {
        res = await API.post("/workflows", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save workflow" });
      throw err;
    }
  },

  deleteWorkflow: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/workflows/${id}`);
      set((state) => ({
        workflows: state.workflows.filter((w) => String(w.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete workflow" });
      throw err;
    }
  },
}));

export default useWorkflowStore;
