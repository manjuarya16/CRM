import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { IActivity, ActivityStore } from "@/interface/activityInterface";

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  total: 0,
  loading: false,
  error: null,
  selectedActivity: null,

  fetchActivities: async (page = 1, limit = 100, search = "", leadId?: number) => {
    set({ loading: true });
    try {
      const url = leadId
        ? `/activities?page=${page}&limit=${limit}&lead_id=${leadId}&search=${encodeURIComponent(search)}`
        : `/activities?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const response = await API.get(url);
      if (response.data?.success) {
        set({
          activities: response.data.data || [],
          total: response.data.total || 0,
          error: null,
        });
      } else {
        set({ error: "Failed to fetch activities" });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching activities" });
    } finally {
      set({ loading: false });
    }
  },


  fetchActivityById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/activities/${id}`);
      if (response.data?.success) {
        set({ selectedActivity: response.data.data, error: null });
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || "Error fetching activity" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  addActivity: async (data: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/activities/create", data);
      if (response.data?.success) {
        set((state) => ({
          activities: [response.data.data, ...state.activities],
          total: state.total + 1,
          error: null,
        }));
        handleSuccessResponse("Activity", "created", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to create activity");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Activity", "create", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateActivity: async (id: number, data: any) => {
    set({ loading: true });
    try {
      const response = await API.put(`/activities/update/${id}`, data);
      if (response.data?.success) {
        set((state) => ({
          activities: state.activities.map((a) =>
            a.id === id ? { ...a, ...data, ...response.data.data } : a
          ),
          error: null,
        }));
        handleSuccessResponse("Activity", "updated", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to update activity");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Activity", "update", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteActivity: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.delete(`/activities/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
          total: Math.max(0, state.total - 1),
          error: null,
        }));
        handleSuccessResponse("Activity", "deleted", null);
      } else {
        throw new Error(response.data?.message || "Failed to delete activity");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Activity", "delete", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  setSelectedActivity: (activity: IActivity | null) => set({ selectedActivity: activity }),
  clearError: () => set({ error: null }),
}));

export default useActivityStore;
