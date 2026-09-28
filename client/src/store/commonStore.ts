import { create } from "zustand";
import API from "@/config";
import { CommonState, StateItem, CityItem } from "@/interface";

export const useCommonStore = create<CommonState>((set) => ({
  states: [],
  cities: [],
  loading: false,

  fetchStates: async (): Promise<StateItem[]> => {
    set({ loading: true });
    try {
      const response = await API.get("/common/getStates");
      const states = response.data?.data || response.data || [];
      set({ states, loading: false });
      return states;
    } catch (error) {
      console.error("Failed to fetch states:", error);
      set({ loading: false });
      return [];
    }
  },

  fetchCities: async (stateId: number | string): Promise<CityItem[]> => {
    set({ loading: true });
    try {
      const response = await API.get(`/common/getCities?state_id=${stateId}`);
      const cities = response.data?.data || response.data || [];
      set({ cities, loading: false });
      return cities;
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      set({ loading: false });
      return [];
    }
  },

  fetchStateCities: async () => {
    set({ loading: true });
    try {
      const response = await API.get("/common/getStateCities");
      const data = response.data?.data || response.data || { states: [], cities: [] };
      set({ states: data.states || [], cities: data.cities || [], loading: false });
      return data;
    } catch (error) {
      console.error("Failed to fetch state cities:", error);
      set({ loading: false });
      return { states: [], cities: [] };
    }
  },
}));
