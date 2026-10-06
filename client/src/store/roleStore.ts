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

  fetchRoles: async (force = false) => {
    if (!force && get().roles.length > 0) return get().roles;
    if (_rolesFlight && !force) return _rolesFlight;
    set({ loading: true });
    _rolesFlight = (async () => {
      try {
        const response = await API.get("/roles/");
        const list = response.data?.data || response.data || [];
        set({ roles: list, error: null });
        return list;
      } catch (error: any) {
        set({ error: error.message || "Error fetching roles" });
        return [];
      } finally {
        set({ loading: false });
        _rolesFlight = null;
      }
    })();
    return _rolesFlight;
  },

  saveRole: async (data: any, id?: number | string) => {
    set({ loading: true });
    try {
      let response;
      if (id) {
        response = await API.put(`/roles/${id}`, data);
      } else {
        response = await API.post("/roles/", data);
      }
      set({ loading: false });
      return response.data?.data || response.data;
    } catch (error: any) {
      set({ loading: false, error: error.message });
      throw error;
    }
  },

  fetchRoleById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/roles/${id}`);
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
      const response = await API.post("/roles/create", roleData);
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
      const response = await API.put("/roles/update", { id, ...roleData });
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
      const response = await API.delete(`/roles/delete/${id}`);
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
