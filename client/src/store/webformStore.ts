import { create } from "zustand";
import { API } from "@/config";

export interface IWebForm {
  id: number;
  title: string;
  form_id?: string;
  [key: string]: any;
}

export interface WebFormStore {
  webforms: IWebForm[];
  loading: boolean;
  error: string | null;
  fetchWebforms: (url?: string) => Promise<IWebForm[]>;
  fetchWebformById: (id: number | string) => Promise<IWebForm | null>;
  saveWebform: (data: any, id?: number | string) => Promise<IWebForm>;
  deleteWebform: (id: number | string) => Promise<boolean>;
  submitWebform: (formId: string, formData: any) => Promise<any>;
}

export const useWebFormStore = create<WebFormStore>((set) => ({
  webforms: [],
  loading: false,
  error: null,

  fetchWebforms: async (url = "/web-forms") => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(url).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ webforms: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch web forms" });
      return [];
    }
  },

  fetchWebformById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/web-forms/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch web form" });
      return null;
    }
  },

  saveWebform: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/web-forms/${id}`, data);
      } else {
        res = await API.post("/web-forms", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save web form" });
      throw err;
    }
  },

  deleteWebform: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/web-forms/${id}`);
      set((state) => ({
        webforms: state.webforms.filter((w) => String(w.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete web form" });
      throw err;
    }
  },

  submitWebform: async (formId: string, formData: any) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post(`/web-forms/submit/${formId}`, formData);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to submit web form" });
      throw err;
    }
  },
}));

export default useWebFormStore;
