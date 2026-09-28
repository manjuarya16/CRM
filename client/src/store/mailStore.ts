import { create } from "zustand";
import API from "@/config";
import { EmailItem, MailState } from "@/interface";

export const useMailStore = create<MailState>((set, get) => ({
  activeFolder: "inbox",
  emails: [],
  selectedEmailIds: [],
  currentEmail: null,
  counts: {
    inbox_unread: 0,
    inbox_total: 0,
    important_total: 0,
    starred_total: 0,
    draft_total: 0,
    outbox_total: 0,
    sent_total: 0,
    spam_total: 0,
    trash_total: 0,
  },
  search: "",
  page: 1,
  limit: 15,
  total: 0,
  totalPages: 1,
  loading: false,
  actionLoading: false,

  setActiveFolder: (folder: string) => {
    set({ activeFolder: folder, page: 1, selectedEmailIds: [] });
    get().fetchEmails(folder, 1, get().search);
  },

  setSearch: (search: string) => {
    set({ search, page: 1 });
    get().fetchEmails(get().activeFolder, 1, search);
  },

  setPage: (page: number) => {
    set({ page });
    get().fetchEmails(get().activeFolder, page, get().search);
  },

  toggleSelectEmail: (id: number) => {
    const { selectedEmailIds } = get();
    if (selectedEmailIds.includes(id)) {
      set({ selectedEmailIds: selectedEmailIds.filter((item) => item !== id) });
    } else {
      set({ selectedEmailIds: [...selectedEmailIds, id] });
    }
  },

  selectAllEmails: () => {
    const { emails } = get();
    set({ selectedEmailIds: emails.map((e) => e.id) });
  },

  clearSelection: () => {
    set({ selectedEmailIds: [] });
  },

  fetchEmails: async (folder?: string, pageNum?: number, searchStr?: string) => {
    const activeFolder = folder !== undefined ? folder : get().activeFolder;
    const page = pageNum !== undefined ? pageNum : get().page;
    const search = searchStr !== undefined ? searchStr : get().search;
    const limit = get().limit;

    set({ loading: true });
    try {
      const response = await API.get("/mail", {
        params: { folder: activeFolder, search, page, limit },
      });
      const data = response.data;
      if (data.success) {
        set({
          emails: data.data || [],
          total: data.total || 0,
          totalPages: data.totalPages || Math.ceil((data.total || 0) / limit) || 1,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch emails", error);
      set({ loading: false });
    }
  },

  fetchCounts: async () => {
    try {
      const response = await API.get("/mail/counts");
      const data = response.data;
      if (data.success && data.data) {
        set({ counts: data.data });
      }
    } catch (error) {
      console.error("Failed to fetch folder counts", error);
    }
  },

  fetchEmailDetails: async (id: number) => {
    set({ loading: true });
    try {
      const response = await API.get(`/mail/${id}`);
      const data = response.data;
      if (data.success) {
        set({ currentEmail: data.data, loading: false });
        return data.data;
      }
    } catch (error) {
      console.error("Failed to fetch email details", error);
    }
    set({ loading: false });
    return null;
  },

  markAsRead: async (id: number, isRead: boolean) => {
    try {
      await API.patch(`/mail/${id}/read`, { is_read: isRead });
      const { emails, currentEmail } = get();
      set({
        emails: emails.map((e) => (e.id === id ? { ...e, is_read: isRead } : e)),
        currentEmail: currentEmail && currentEmail.id === id ? { ...currentEmail, is_read: isRead } : currentEmail,
      });
      get().fetchCounts();
    } catch (error) {
      console.error("Failed to toggle read status", error);
    }
  },

  removeEmail: async (id: number, type: "trash" | "delete" = "trash") => {
    set({ actionLoading: true });
    try {
      await API.delete(`/mail/${id}`, { params: { type } });
      const { emails } = get();
      set({
        emails: emails.filter((e) => e.id !== id),
        actionLoading: false,
      });
      get().fetchCounts();
    } catch (error) {
      console.error("Failed to remove email", error);
      set({ actionLoading: false });
    }
  },

  bulkMoveToFolder: async (folder: string) => {
    const { selectedEmailIds } = get();
    if (selectedEmailIds.length === 0) return;

    set({ actionLoading: true });
    try {
      await API.post("/mail/mass-update", { indices: selectedEmailIds, folders: [folder] });
      set({ selectedEmailIds: [], actionLoading: false });
      get().fetchEmails();
      get().fetchCounts();
    } catch (error) {
      console.error("Failed to mass update emails", error);
      set({ actionLoading: false });
    }
  },

  bulkDelete: async (type: "trash" | "delete" = "trash") => {
    const { selectedEmailIds } = get();
    if (selectedEmailIds.length === 0) return;

    set({ actionLoading: true });
    try {
      await API.post("/mail/mass-destroy", { indices: selectedEmailIds, type });
      set({ selectedEmailIds: [], actionLoading: false });
      get().fetchEmails();
      get().fetchCounts();
    } catch (error) {
      console.error("Failed to mass delete emails", error);
      set({ actionLoading: false });
    }
  },

  sendEmail: async (formData: FormData) => {
    const response = await API.post("/mail", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    get().fetchCounts();
    return response.data;
  },

  updateDraft: async (id: number, formData: FormData) => {
    const response = await API.put(`/mail/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  linkEmailEntities: async (
    id: number,
    data: { person_id?: number | null; lead_id?: number | null }
  ) => {
    const response = await API.put(`/mail/${id}/link`, data);
    return response.data;
  },
}));
