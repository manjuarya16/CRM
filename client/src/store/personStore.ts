import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse } from "@/utils/swalAlert";
import { PersonState, IPerson, PersonFormData } from "@/interface/personInterface";

export const usePersonStore = create<PersonState>((set) => ({
  persons: [],
  loading: false,
  total: 0,
  error: null,

  fetchPersons: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await API.get("/persons", { params });
      const rows = response.data?.rows || response.data?.data || [];
      const total = Number(response.data?.total) || rows.length;
      set({ persons: rows, total });
    } catch (error: any) {
      set({ error });
      handleErrorResponse("Persons", "fetch", error);
    } finally {
      set({ loading: false });
    }
  },

  getPersonById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const response = await API.get(`/persons/${id}`);
      return response.data?.data || null;
    } catch (error: any) {
      set({ error });
      handleErrorResponse("Person", "fetch details", error);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  savePerson: async (data: PersonFormData, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let response;
      if (id) {
        response = await API.put(`/persons/${id}`, data);
      } else {
        response = await API.post("/persons", data);
      }
      return response.data?.data;
    } catch (error: any) {
      set({ error });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deletePerson: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const response = await API.delete(`/persons/${id}`);
      return Boolean(response.data?.success);
    } catch (error: any) {
      set({ error });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  clearAllPersons: async () => {
    set({ loading: true, error: null });
    try {
      const response = await API.delete("/persons/all");
      set({ persons: [], total: 0 });
      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || "All persons cleared successfully",
      };
    } catch (error: any) {
      set({ error });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));

export default usePersonStore;
