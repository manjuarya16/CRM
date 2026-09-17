import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse } from "@/utils/swalAlert";

import { BranchState } from "@/interface/branchInterface";

let _branchesFlight: Promise<void> | null = null;

const useBranchStore = create<BranchState>((set, get) => ({
  branch: null,
  branches: [],
  mainBranch: null,
  loading: false,
  error: null,

  getMainBranch: async () => {
    if (get().branches.length > 0) { set({ mainBranch: get().branches.find((b: any) => b.is_main == true || b.is_main === "true") ?? null }); return; }
    try {
      const response = await API.get("/branch/");
      const all = response.data.data || [];
      const main = all.find((b: any) => b.is_main == true || b.is_main === "true") ?? null;
      set({ branches: all, mainBranch: main });
    } catch (error) {
      set({ mainBranch: null });
    }
  },

  getBranch: async () => {
    if (get().branch) return;
    try {
      set({ loading: true, error: null });
      const response = await API.get("/branch/");
      set({ branch: response.data.data[0], loading: false });
    } catch (error) {
      set({ error, loading: false });
      handleErrorResponse("Branch", "fetch", error);
    }
  },

  getBranches: async () => {
    if (get().branches.length > 0) return;
    if (_branchesFlight) return _branchesFlight;
    set({ loading: true, error: null });
    _branchesFlight = (async () => {
      try {
        const response = await API.get("/branch/");
        const all = response.data.data || [];
        set({ branches: all, mainBranch: all.find((b: any) => b.is_main == true || b.is_main === "true") ?? null, loading: false });
      } catch (error) {
        set({ error, loading: false });
        handleErrorResponse("Branch", "fetch", error);
      } finally {
        _branchesFlight = null;
      }
    })();
    return _branchesFlight;
  },

  // CREATE BRANCH
  createBranch: async (data: any) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await API.post("/branch/add", data);

      set((state) => ({
        branches: [...state.branches, response.data.data],
        loading: false,
      }));

      return response;
    } catch (error) {
      set({
        error,
        loading: false,
      });

      throw error;
    }
  },

  // UPDATE BRANCH
  updateBranch: async (id: string, data: any) => {
    try {
      const payload = { id, ...data };
      const response = await API.put(`/branch/update/`, payload);

      if (response.data?.success) {
        set((state) => {
          const updated = state.branches.map((item) => {
            if (String(item.id) === String(id)) {
              return response.data.data ?? { ...item, ...data };
            }
            if (data.is_main === true) {
              return { ...item, is_main: false };
            }
            return item;
          });
          return {
            branches: updated,
            mainBranch:
              updated.find((b) => b.is_main == true || b.is_main === "true") ??
              state.mainBranch,
          };
        });
        return response;
      } else {
        throw new Error(response.data?.message || "Failed to update branch");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update branch";
      set({ error: message });
      throw error;
    }
  },

  // DELETE BRANCH
  deleteBranch: async (id: string) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const response = await API.delete(`/branch/delete/${id}`);

      set((state) => ({
        branches: state.branches.filter((item) => item.id !== id),
        loading: false,
      }));

      return response;
    } catch (error) {
      set({
        error,
        loading: false,
      });

      throw error;
    }
  },
}));

export { useBranchStore };

export default useBranchStore;
