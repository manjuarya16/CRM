import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { IQuote, IQuoteItem, QuoteStore } from "@/interface/quoteInterface";

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: [],
  total: 0,
  loading: false,
  error: null,
  selectedQuote: null,
  quoteItems: [],

  fetchQuotes: async (page = 1, limit = 10, search = "") => {
    set({ loading: true });
    try {
      const response = await API.get(`/quotes?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      if (response.data?.success) {
        set({
          quotes: response.data.data || [],
          total: response.data.total || 0,
          error: null,
        });
      } else {
        set({ error: "Failed to fetch quotes" });
      }
    } catch (error: any) {
      set({ error: error.message || "Error fetching quotes" });
    } finally {
      set({ loading: false });
    }
  },

  fetchQuoteById: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/quotes/${id}`);
      if (response.data?.success) {
        set({ selectedQuote: response.data.data, error: null });
        return response.data.data;
      }
      return null;
    } catch (error: any) {
      set({ error: error.message || "Error fetching quote" });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  addQuote: async (data: any) => {
    set({ loading: true });
    try {
      const response = await API.post("/quotes/create", data);
      if (response.data?.success) {
        set((state) => ({
          quotes: [response.data.data, ...state.quotes],
          total: state.total + 1,
          error: null,
        }));
        handleSuccessResponse("Quote", "created", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to create quote");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Quote", "create", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateQuote: async (id: number, data: any) => {
    set({ loading: true });
    try {
      const response = await API.put(`/quotes/update/${id}`, data);
      if (response.data?.success) {
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...data, ...response.data.data } : q
          ),
          error: null,
        }));
        handleSuccessResponse("Quote", "updated", null);
        return response.data.data;
      } else {
        throw new Error(response.data?.message || "Failed to update quote");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Quote", "update", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteQuote: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.delete(`/quotes/delete/${id}`);
      if (response.data?.success) {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
          total: Math.max(0, state.total - 1),
          error: null,
        }));
        handleSuccessResponse("Quote", "deleted", null);
      } else {
        throw new Error(response.data?.message || "Failed to delete quote");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      handleErrorResponse("Quote", "delete", error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchQuoteItems: async (quoteId: number) => {
    try {
      const res = await API.get(`/quotes/${quoteId}/items`);
      if (res.data?.success) {
        set({ quoteItems: res.data.data || [] });
      }
    } catch (err) {}
  },

  addQuoteItem: async (quoteId: number, data: any) => {
    try {
      const res = await API.post(`/quotes/${quoteId}/items`, data);
      if (res.data?.success) {
        set((state) => ({ quoteItems: [...state.quoteItems, res.data.data] }));
        return res.data.data;
      }
    } catch (err) {}
  },

  deleteQuoteItem: async (itemId: number, quoteId: number) => {
    try {
      const res = await API.delete(`/quotes/items/${itemId}`);
      if (res.data?.success) {
        set((state) => ({ quoteItems: state.quoteItems.filter((i) => i.id !== itemId) }));
      }
    } catch (err) {}
  },

  setSelectedQuote: (quote: IQuote | null) => set({ selectedQuote: quote }),
  clearError: () => set({ error: null }),
}));

export default useQuoteStore;
