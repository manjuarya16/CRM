import { create } from "zustand";
import { API } from "@/config";

export interface IDataTransferImport {
  id: number;
  [key: string]: any;
}

export interface DataTransferStore {
  imports: IDataTransferImport[];
  loading: boolean;
  error: string | null;
  fetchImports: () => Promise<IDataTransferImport[]>;
  deleteImport: (id: number | string) => Promise<boolean>;
  getSample: (key: string) => Promise<any>;
  validateImport: (payload: any) => Promise<any>;
  executeImport: (payload: any) => Promise<any>;
}

export const useDataTransferStore = create<DataTransferStore>((set) => ({
  imports: [],
  loading: false,
  error: null,

  fetchImports: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/data-transfer/imports", { params: { limit: 50 } }).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ imports: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch data transfer imports" });
      return [];
    }
  },

  deleteImport: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/data-transfer/imports/${id}`).catch(() => {});
      set((state) => ({
        imports: state.imports.filter((i) => String(i.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete import" });
      throw err;
    }
  },

  getSample: async (key: string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/data-transfer/sample/${key}`);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch sample" });
      throw err;
    }
  },

  validateImport: async (payload: any) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post("/data-transfer/validate", payload);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Validation failed" });
      throw err;
    }
  },

  executeImport: async (payload: any) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post("/data-transfer/import", payload);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Import failed" });
      throw err;
    }
  },
}));

export default useDataTransferStore;
