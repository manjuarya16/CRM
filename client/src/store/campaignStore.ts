import { create } from "zustand";
import { API } from "@/config";

export interface ICampaign {
  id: number;
  name: string;
  [key: string]: any;
}

export interface CampaignStore {
  campaigns: ICampaign[];
  loading: boolean;
  error: string | null;
  fetchCampaigns: () => Promise<ICampaign[]>;
  fetchCampaignById: (id: number | string) => Promise<ICampaign | null>;
  saveCampaign: (data: any, id?: number | string) => Promise<ICampaign>;
  deleteCampaign: (id: number | string) => Promise<boolean>;
  sendCampaign: (id: number | string) => Promise<any>;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  campaigns: [],
  loading: false,
  error: null,

  fetchCampaigns: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/campaigns").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ campaigns: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch campaigns" });
      return [];
    }
  },

  fetchCampaignById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/campaigns/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch campaign" });
      return null;
    }
  },

  saveCampaign: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/campaigns/${id}`, data);
      } else {
        res = await API.post("/campaigns", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save campaign" });
      throw err;
    }
  },

  deleteCampaign: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/campaigns/${id}`);
      set((state) => ({
        campaigns: state.campaigns.filter((c) => String(c.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete campaign" });
      throw err;
    }
  },

  sendCampaign: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post(`/campaigns/${id}/send`);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to send campaign" });
      throw err;
    }
  },
}));

export default useCampaignStore;
