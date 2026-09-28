import { create } from "zustand";
import { API } from "@/config";
import { INotificationStore } from "@/interface/notificationInterface";

const DEFAULT_POLL_INTERVAL_MS = 5000;

export const useNotificationStore = create<INotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  isPolling: false,
  activeModule: "all",
  activeIsRead: undefined,
  activePage: 1,
  activeLimit: 20,

  fetchNotifications: async (
    page = 1,
    limit = 20,
    module?: string,
    isRead?: boolean,
    isBackground = false
  ) => {
    // Save active filter state so background polls retain user's current view/tab
    set({
      activePage: page,
      activeLimit: limit,
      activeModule: module || "all",
      activeIsRead: isRead,
    });

    // Only set loading spinner if user explicitly switched tab/page (not background poll)
    if (!isBackground) {
      set({ loading: true });
    }

    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      if (module && module !== "all") params.append("module", module);
      if (typeof isRead === "boolean") params.append("is_read", String(isRead));

      const response = await API.get(`/notifications?${params.toString()}`);
      if (response.data?.success) {
        set({
          notifications: response.data.data || [],
          unreadCount: response.data.unreadCount ?? get().unreadCount,
          total: response.data.total ?? (response.data.data?.length || 0),
        });
      }
    } catch (error) {
      if (!isBackground) {
        console.error("Failed to fetch notifications:", error);
      }
    } finally {
      if (!isBackground) {
        set({ loading: false });
      }
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await API.get("/notifications/count");
      if (response.data?.success) {
        const count =
          response.data.unreadCount ??
          response.data.data?.unreadCount ??
          response.data.data?.count ??
          0;
        set({ unreadCount: Number(count) || 0 });
      }
    } catch (error) {
      // Silently swallow background poll errors
    }
  },

  markAsRead: async (id: number) => {
    try {
      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));

      await API.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      get().fetchUnreadCount();
    }
  },

  markAllAsRead: async () => {
    try {
      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));

      await API.patch("/notifications/read-all");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      get().fetchUnreadCount();
    }
  },

  deleteNotification: async (id: number) => {
    try {
      const target = get().notifications.find((n) => n.id === id);
      const wasUnread = target ? !target.is_read : false;

      // Optimistic delete
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        total: Math.max(0, state.total - 1),
      }));

      await API.delete(`/notifications/${id}`);
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  },

  clearAll: async () => {
    try {
      set({ notifications: [], unreadCount: 0, total: 0 });
      await API.delete("/notifications/clear-all");
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
    }
  },

  startPolling: (intervalMs = DEFAULT_POLL_INTERVAL_MS) => {
    // Initial fetch immediately
    get().fetchUnreadCount();
    get().fetchNotifications(get().activePage, get().activeLimit, get().activeModule, get().activeIsRead, true);

    // Poll every 5 seconds for count & list, preserving current active filters silently in background
    const interval = setInterval(() => {
      get().fetchUnreadCount();
      get().fetchNotifications(get().activePage, get().activeLimit, get().activeModule, get().activeIsRead, true);
    }, intervalMs);

    return () => clearInterval(interval);
  },
}));
