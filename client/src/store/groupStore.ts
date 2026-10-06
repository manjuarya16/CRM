import { create } from "zustand";
import { API } from "@/config";

export interface IGroup {
  id: number;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface GroupStore {
  groups: IGroup[];
  loading: boolean;
  error: string | null;
  fetchGroups: () => Promise<IGroup[]>;
  saveGroup: (data: any, id?: number | string) => Promise<IGroup>;
  deleteGroup: (id: number | string) => Promise<boolean>;
}

export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],
  loading: false,
  error: null,

  fetchGroups: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/groups").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ groups: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch groups" });
      return [];
    }
  },

  saveGroup: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/groups/${id}`, data);
      } else {
        res = await API.post("/groups", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save group" });
      throw err;
    }
  },

  deleteGroup: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/groups/${id}`);
      set((state) => ({
        groups: state.groups.filter((g) => String(g.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete group" });
      throw err;
    }
  },
}));

export default useGroupStore;
