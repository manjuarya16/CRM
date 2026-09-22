import { create } from "zustand";
import {
  EmailItem,
  FolderCounts,
  getEmails,
  getFolderCounts,
  getEmailById,
  deleteEmail,
  toggleReadStatus,
  massUpdateEmails,
  massDeleteEmails,
} from "@/services/mailService";

interface MailState {
  activeFolder: string;
  emails: EmailItem[];
  selectedEmailIds: number[];
  currentEmail: EmailItem | null;
  counts: FolderCounts;
  search: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  actionLoading: boolean;

  // Actions
  setActiveFolder: (folder: string) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  toggleSelectEmail: (id: number) => void;
  selectAllEmails: () => void;
  clearSelection: () => void;
  fetchEmails: (folder?: string, page?: number, search?: string) => Promise<void>;
  fetchCounts: () => Promise<void>;
  fetchEmailDetails: (id: number) => Promise<EmailItem | null>;
  markAsRead: (id: number, isRead: boolean) => Promise<void>;
  removeEmail: (id: number, type?: "trash" | "delete") => Promise<void>;
  bulkMoveToFolder: (folder: string) => Promise<void>;
  bulkDelete: (type?: "trash" | "delete") => Promise<void>;
}

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
  limit: 20,
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
    const { emails, selectedEmailIds } = get();
    if (selectedEmailIds.length === emails.length) {
      set({ selectedEmailIds: [] });
    } else {
      set({ selectedEmailIds: emails.map((e) => e.id) });
    }
  },

  clearSelection: () => {
    set({ selectedEmailIds: [] });
  },

  fetchEmails: async (folderParam?: string, pageParam?: number, searchParam?: string) => {
    const folder = folderParam ?? get().activeFolder;
    const page = pageParam ?? get().page;
    const search = searchParam ?? get().search;
    const limit = get().limit;

    set({ loading: true });
    try {
      const res = await getEmails({ folder, search, page, limit });
      if (res.success) {
        set({
          emails: res.data || [],
          total: res.pagination?.total || 0,
          totalPages: res.pagination?.totalPages || 1,
          loading: false,
        });
      }
    } catch (err) {
      console.error("Failed to fetch emails", err);
      set({ loading: false });
    }
    get().fetchCounts();
  },

  fetchCounts: async () => {
    try {
      const res = await getFolderCounts();
      if (res.success && res.data) {
        set({ counts: res.data });
      }
    } catch (err) {
      console.error("Failed to fetch folder counts", err);
    }
  },

  fetchEmailDetails: async (id: number) => {
    set({ loading: true, currentEmail: null });
    try {
      const res = await getEmailById(id);
      if (res.success && res.data) {
        set({ currentEmail: res.data, loading: false });
        get().fetchCounts();
        return res.data;
      }
    } catch (err) {
      console.error("Failed to load email thread", err);
    }
    set({ loading: false });
    return null;
  },

  markAsRead: async (id: number, isRead: boolean) => {
    try {
      await toggleReadStatus(id, isRead);
      set((state) => ({
        emails: state.emails.map((e) => (e.id === id ? { ...e, is_read: isRead } : e)),
      }));
      get().fetchCounts();
    } catch (err) {
      console.error("Failed to toggle read status", err);
    }
  },

  removeEmail: async (id: number, type = "trash") => {
    try {
      await deleteEmail(id, type);
      set((state) => ({
        emails: state.emails.filter((e) => e.id !== id),
        selectedEmailIds: state.selectedEmailIds.filter((item) => item !== id),
      }));
      get().fetchCounts();
    } catch (err) {
      console.error("Failed to delete email", err);
    }
  },

  bulkMoveToFolder: async (folder: string) => {
    const { selectedEmailIds } = get();
    if (selectedEmailIds.length === 0) return;

    set({ actionLoading: true });
    try {
      await massUpdateEmails(selectedEmailIds, [folder]);
      set({ selectedEmailIds: [] });
      await get().fetchEmails();
    } catch (err) {
      console.error("Failed to bulk update emails", err);
    } finally {
      set({ actionLoading: false });
    }
  },

  bulkDelete: async (type = "trash") => {
    const { selectedEmailIds } = get();
    if (selectedEmailIds.length === 0) return;

    set({ actionLoading: true });
    try {
      await massDeleteEmails(selectedEmailIds, type);
      set({ selectedEmailIds: [] });
      await get().fetchEmails();
    } catch (err) {
      console.error("Failed to bulk delete emails", err);
    } finally {
      set({ actionLoading: false });
    }
  },
}));
