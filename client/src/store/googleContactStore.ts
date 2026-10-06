import { create } from "zustand";
import { API } from "@/config";

export interface GoogleContactStore {
  accounts: any[];
  batches: any[];
  loading: boolean;
  error: string | null;
  fetchAccountsAndBatches: () => Promise<{ accounts: any[]; batches: any[] }>;
  createAccount: (data: any) => Promise<any>;
  deleteAccount: (id: number | string) => Promise<boolean>;
  syncAccount: (accountId: number | string) => Promise<any>;
  exportContacts: () => Promise<any>;
}

export const useGoogleContactStore = create<GoogleContactStore>((set) => ({
  accounts: [],
  batches: [],
  loading: false,
  error: null,

  fetchAccountsAndBatches: async () => {
    set({ loading: true, error: null });
    try {
      const [accRes, batchRes] = await Promise.all([
        API.get("/google-contacts/accounts").catch(() => ({ data: { data: [] } })),
        API.get("/google-contacts/batches").catch(() => ({ data: { data: [] } })),
      ]);
      const accounts = accRes.data?.data || [];
      const batches = batchRes.data?.data || [];
      set({ accounts, batches, loading: false });
      return { accounts, batches };
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch google contacts data" });
      return { accounts: [], batches: [] };
    }
  },

  createAccount: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post("/google-contacts/accounts", data);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to create google account" });
      throw err;
    }
  },

  deleteAccount: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/google-contacts/accounts/${id}`);
      set((state) => ({
        accounts: state.accounts.filter((a) => String(a.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete account" });
      throw err;
    }
  },

  syncAccount: async (accountId: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post(`/google-contacts/sync/${accountId}`);
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to sync account" });
      throw err;
    }
  },

  exportContacts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.post("/google-contacts/export", {});
      set({ loading: false });
      return res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to export contacts" });
      throw err;
    }
  },
}));

export default useGoogleContactStore;
