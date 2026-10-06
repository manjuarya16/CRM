import { create } from "zustand";
import { API } from "@/config";

export interface IEvent {
  id: number;
  name: string;
  [key: string]: any;
}

export interface EventStore {
  events: IEvent[];
  loading: boolean;
  error: string | null;
  fetchEvents: () => Promise<IEvent[]>;
  fetchEventById: (id: number | string) => Promise<IEvent | null>;
  saveEvent: (data: any, id?: number | string) => Promise<IEvent>;
  deleteEvent: (id: number | string) => Promise<boolean>;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/events").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ events: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch events" });
      return [];
    }
  },

  fetchEventById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/events/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch event" });
      return null;
    }
  },

  saveEvent: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/events/${id}`, data);
      } else {
        res = await API.post("/events", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save event" });
      throw err;
    }
  },

  deleteEvent: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/events/${id}`);
      set((state) => ({
        events: state.events.filter((e) => String(e.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete event" });
      throw err;
    }
  },
}));

export default useEventStore;
