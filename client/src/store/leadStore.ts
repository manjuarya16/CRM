import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { ILead, LeadStore } from "@/interface/leadInterface";

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  total: 0,
  page: 1,
  limit: 10,
  loading: false,
  error: null,
  selectedLead: null,
  sources: [],
  types: [],
  pipelines: [],
  stages: [],
  leadProducts: [],
  kanbanLeads: [],

  fetchLeads: async (page = 1, limit = 10, search = "", filters: Record<string, any> = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (search) params.append("search", search);
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });

      const response = await API.get(`/leads?${params.toString()}`);
      if (response.data?.success) {
        set({
          leads: response.data.data || [],
          total: response.data.total || 0,
          error: null,
        });
      } else {
        set({ error: "Failed to fetch leads" });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching leads" });
    } finally {
      set({ loading: false });
    }
  },

  fetchKanbanLeads: async (pipelineId?: number, search = "", filters: Record<string, any> = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (pipelineId) params.append("pipeline_id", String(pipelineId));
      if (search) params.append("search", search);
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          params.append(key, String(val));
        }
      });

      const response = await API.get(`/leads/kanban?${params.toString()}`);
      if (response.data?.success) {
        set({
          kanbanLeads: response.data.data || [],
          error: null,
        });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching kanban leads" });
    } finally {
      set({ loading: false });
    }
  },


  fetchLeadById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/leads/${id}`);
      if (response.data?.success) {
        set({ selectedLead: response.data.data, error: null });
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || "Error fetching lead" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  addLead: async (leadData: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/leads/create", leadData);
      if (response.data?.success) {
        set((state) => ({
          leads: [response.data.data, ...state.leads],
          total: state.total + 1,
          error: null,
        }));
        handleSuccessResponse("Lead", "created", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to create lead");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Lead", "create", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateLead: async (id: number, leadData: any) => {
    set({ loading: true });
    try {
      const response = await API.put(`/leads/update/${id}`, leadData);
      if (response.data?.success) {
        set((state) => ({
          leads: state.leads.map((l) =>
            l.id === id ? { ...l, ...leadData, ...response.data.data } : l
          ),
          error: null,
        }));
        handleSuccessResponse("Lead", "updated", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to update lead");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Lead", "update", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteLead: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.delete(`/leads/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          leads: state.leads.filter((l) => l.id !== id),
          total: Math.max(0, state.total - 1),
          error: null,
        }));
        handleSuccessResponse("Lead", "deleted", null);
      } else {
        throw new Error(response.data?.message || "Failed to delete lead");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Lead", "delete", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateLeadStage: async (id: number, stageId: number, status = true, lostReason?: string) => {
    try {
      const res = await API.put(`/leads/${id}/stage`, { stage_id: stageId, status, lost_reason: lostReason });
      if (res.data?.success) {
        set((state) => ({
          selectedLead: state.selectedLead?.id === id ? { ...state.selectedLead, ...res.data.data } : state.selectedLead,
          leads: state.leads.map((l) => (l.id === id ? { ...l, ...res.data.data } : l)),
        }));
        handleSuccessResponse("Lead stage", "updated", null);
        return res.data.data;
      }
    } catch (error: any) {
      handleErrorResponse("Lead stage", "update", error);
    }
  },

  fetchLeadProducts: async (leadId: number) => {
    try {
      const res = await API.get(`/leads/${leadId}/products`);
      if (res.data?.success) {
        set({ leadProducts: res.data.data || [] });
      }
    } catch (err) {}
  },

  addLeadProduct: async (leadId: number, productId: number, quantity = 1, price?: number) => {
    try {
      const res = await API.post(`/leads/${leadId}/products`, { product_id: productId, quantity, price });
      if (res.data?.success) {
        set((state) => ({ leadProducts: [...state.leadProducts, res.data.data] }));
        handleSuccessResponse("Product", "added to lead", null);
        return res.data.data;
      }
    } catch (error: any) {
      handleErrorResponse("Product", "add", error);
    }
  },

  deleteLeadProduct: async (itemId: number, leadId: number) => {
    try {
      const res = await API.delete(`/leads/products/${itemId}`);
      if (res.data?.success) {
        set((state) => ({ leadProducts: state.leadProducts.filter((p) => p.id !== itemId) }));
        handleSuccessResponse("Product", "removed from lead", null);
      }
    } catch (error: any) {
      handleErrorResponse("Product", "remove", error);
    }
  },

  fetchSources: async () => {
    try {
      const res = await API.get("/leads/sources");
      if (res.data?.success) set({ sources: res.data.data || [] });
    } catch (err) {}
  },

  fetchTypes: async () => {
    try {
      const res = await API.get("/leads/types");
      if (res.data?.success) set({ types: res.data.data || [] });
    } catch (err) {}
  },

  fetchPipelines: async () => {
    try {
      const res = await API.get("/leads/pipelines");
      if (res.data?.success) set({ pipelines: res.data.data || [] });
    } catch (err) {}
  },

  fetchStages: async (pipelineId) => {
    try {
      const url = pipelineId ? `/leads/stages?pipeline_id=${pipelineId}` : "/leads/stages";
      const res = await API.get(url);
      if (res.data?.success) set({ stages: res.data.data || [] });
    } catch (err) {}
  },

  setSelectedLead: (lead: ILead | null) => set({ selectedLead: lead }),
  clearError: () => set({ error: null }),
}));

export default useLeadStore;
