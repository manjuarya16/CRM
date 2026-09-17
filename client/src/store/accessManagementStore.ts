import { create } from "zustand";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";

import { API } from "@/config";
import {
  AccessManagementStore,
  ModuleAccess,
} from "@/interface/accessManagementInterface";

// Per-role access cache
const _accessCache: Record<number, ModuleAccess[]> = {};
const _accessFlight: Record<number, Promise<void> | undefined> = {};

export const useAccessManagementStore = create<AccessManagementStore>(
  (set) => ({
    access: [],
    userAccess: [],
    loading: false,
    saving: false,
    error: null,

    fetchRoleAccess: async (roleId: number) => {
      if (_accessCache[roleId]) {
        set({ access: _accessCache[roleId], loading: false });
        return;
      }
      if (_accessFlight[roleId]) return _accessFlight[roleId];
      set({ loading: true });
      _accessFlight[roleId] = (async () => {
        try {
          const response = await API.get(`/access-management/role/${roleId}`);
          if (response.data?.success) {
            const data = response.data.data || [];
            _accessCache[roleId] = data;
            set({ access: data, error: null });
          } else {
            throw new Error(response.data?.message || "Failed to fetch access");
          }
        } catch (error: any) {
          set({ access: [], error: error.response?.data?.message || error.message || "Error fetching access" });
        } finally {
          set({ loading: false });
          delete _accessFlight[roleId];
        }
      })();
      return _accessFlight[roleId];
    },

    fetchUserAccess: async (roleId: number) => {
      if (_accessCache[roleId]) {
        set({ userAccess: _accessCache[roleId] });
        return;
      }
      try {
        const response = await API.get(`/access-management/role/${roleId}`);
        if (response.data?.success) {
          const data = response.data.data || [];
          _accessCache[roleId] = data;
          set({ userAccess: data });
        }
      } catch {
        set({ userAccess: [] });
      }
    },

    saveRoleAccess: async (roleId: number, access: ModuleAccess[]) => {
      set({ saving: true });
      try {
        const response = await API.put("/access-management/role", {
          role_id: roleId,
          access,
        });
        if (response.data?.success) {
          const data = response.data.data || access;
          _accessCache[roleId] = data;
          set({ access: data, error: null });
          handleSuccessResponse("Access", "updated", null);
        } else {
          throw new Error(response.data?.message || "Failed to update access");
        }
      } catch (error: any) {
        const message = error.response?.data?.message || error.message || "Error updating access";
        set({ error: message });
        handleErrorResponse("Access", "update", error);
      } finally {
        set({ saving: false });
      }
    },

    deleteRoleAccess: async (roleId: number, moduleKey: string) => {
      set({ saving: true });
      try {
        const response = await API.delete(
          `/access-management/role/${roleId}/${moduleKey}`,
        );
        if (response.data?.success) {
          set((state) => ({
            access: state.access.filter(
              (item) => item.module_key !== moduleKey,
            ),
            error: null,
          }));
        } else {
          throw new Error(response.data?.message || "Failed to delete access");
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          error.message ||
          "Error deleting access";
        set({ error: message });
        handleErrorResponse("Access", "delete", error);
      } finally {
        set({ saving: false });
      }
    },

    setAccess: (access: ModuleAccess[]) => {
      set({ access });
    },

    clearError: () => {
      set({ error: null });
    },
  }),
);

export default useAccessManagementStore;
