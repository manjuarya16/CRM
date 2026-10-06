import { create } from "zustand";
import { API } from "@/config";

export interface ITag {
  id: number;
  name: string;
  color?: string;
  [key: string]: any;
}

export interface TagStore {
  tags: ITag[];
  loading: boolean;
  error: string | null;
  fetchTags: (search?: string) => Promise<ITag[]>;
  fetchEntityTags: (entityType: string, entityId: number | string) => Promise<ITag[]>;
  saveEntityTags: (entityType: string, entityId: number | string, tagIds: number[]) => Promise<any>;
  saveTag: (data: { name: string; color?: string }, id?: number | string) => Promise<ITag>;
  deleteTag: (id: number | string) => Promise<boolean>;
}

export const useTagStore = create<TagStore>((set) => ({
  tags: [],
  loading: false,
  error: null,

  fetchTags: async (search?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/tags", { params: { search: search || undefined } }).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ tags: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch tags" });
      return [];
    }
  },

  fetchEntityTags: async (entityType: string, entityId: number | string) => {
    try {
      const res = await API.get(`/tags/entity/${entityType}/${entityId}`).catch(() => ({ data: { data: [] } }));
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  saveEntityTags: async (entityType: string, entityId: number | string, tagIds: number[]) => {
    try {
      const res = await API.post("/tags/entity", {
        entity_type: entityType,
        entity_id: entityId,
        tag_ids: tagIds,
      }).catch(() => {});
      return res?.data;
    } catch {
      return null;
    }
  },

  saveTag: async (data: { name: string; color?: string }, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/tags/${id}`, data);
      } else {
        res = await API.post("/tags", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save tag" });
      throw err;
    }
  },

  deleteTag: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/tags/${id}`);
      set((state) => ({
        tags: state.tags.filter((t) => String(t.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete tag" });
      throw err;
    }
  },
}));

export default useTagStore;
