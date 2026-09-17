import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { Role, RoleStore } from "@/interface/roleInterface";

let _rolesFlight: Promise<void> | null = null;

export const useRoleStore = create<RoleStore>((set, get) => ({
  roles: [],
  loading: false,
  error: null,
  selectedRole: null,

  fetchRoles: async () => {
    if (get().roles.length > 0) return;
    if (_rolesFlight) return _rolesFlight;
    set({ loading: true });
    _rolesFlight = (async () => {
      try {
        const response = await API.get("/role/");
        if (response.data?.success) {
          set({ roles: response.data.data || [], error: null });
        } else {
          set({ error: "Failed to fetch roles" });
        }
      } catch (error: any) {
        set({ error: error.message || "Error fetching roles" });
      } finally {
        set({ loading: false });
        _rolesFlight = null;
      }
    })();
    return _rolesFlight;
  },

  fetchRoleById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/role/${id}`);
      if (response.data?.success) {
        set({ selectedRole: response.data.data, error: null });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching role" });
    } finally {
      set({ loading: false });
    }
  },

  addRole: async (roleData: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/role/create", roleData);
      if (response.data?.success) {
        set((state) => ({
          roles: [...state.roles, response.data.data],
          error: null,
        }));
        handleSuccessResponse("Role", "created", null);
      } else {
        throw new Error(response.data?.message || "Failed to create role");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Role", "create", error);
    } finally {
      set({ loading: false });
    }
  },

  updateRole: async (id: number, roleData: any) => {
    set({ loading: true });
    try {
      const response = await API.put("/role/update", { id, ...roleData });
      if (response.data?.success) {
        set((state) => ({
          roles: state.roles.map((r) =>
            r.id === id ? { ...r, id, ...roleData } : r,
          ),
          error: null,
        }));
        handleSuccessResponse("Role", "updated", null);
      } else {
        throw new Error(response.data?.message || "Failed to update role");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Role", "update", error);
    } finally {
      set({ loading: false });
    }
  },

  deleteRole: async (id: number) => {
    try {
      set({ loading: true });
      const response = await API.delete(`/role/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          roles: state.roles.filter((r) => r.id !== id),
          error: null,
        }));
      } else {
        throw new Error(response.data?.message || "Failed to delete role");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedRole: (role: Role | null) => {
    set({ selectedRole: role });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useRoleStore;
