import { create } from "zustand";
import { API } from "@/config";

export interface IWebhook {
  id: number;
  name: string;
  [key: string]: any;
}

export interface WebhookStore {
  webhooks: IWebhook[];
  loading: boolean;
  error: string | null;
  fetchWebhooks: () => Promise<IWebhook[]>;
  fetchWebhookById: (id: number | string) => Promise<IWebhook | null>;
  saveWebhook: (data: any, id?: number | string) => Promise<IWebhook>;
  deleteWebhook: (id: number | string) => Promise<boolean>;
  testWebhook: (id: number | string) => Promise<any>;
}

export const useWebhookStore = create<WebhookStore>((set) => ({
  webhooks: [],
  loading: false,
  error: null,

  fetchWebhooks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/webhooks").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ webhooks: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch webhooks" });
      return [];
    }
  },

  fetchWebhookById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/webhooks/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch webhook" });
      return null;
    }
  },

  saveWebhook: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/webhooks/${id}`, data);
      } else {
        res = await API.post("/webhooks", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save webhook" });
      throw err;
    }
  },

  deleteWebhook: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/webhooks/${id}`);
      set((state) => ({
        webhooks: state.webhooks.filter((w) => String(w.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete webhook" });
      throw err;
    }
  },

  testWebhook: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post(`/webhooks/${id}/test`);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to test webhook" });
      throw err;
    }
  },
}));

export default useWebhookStore;
