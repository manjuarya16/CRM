export interface INotificationItem {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | string;
  module: string;
  link?: string | null;
  entity_id?: number | null;
  user_id?: number | null;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

export interface INotificationListResponse {
  success: boolean;
  data: INotificationItem[];
  unreadCount?: number;
  total?: number;
  page?: number;
  limit?: number;
}

export interface INotificationCountResponse {
  success: boolean;
  unreadCount: number;
}

export interface INotificationStore {
  notifications: INotificationItem[];
  unreadCount: number;
  total: number;
  loading: boolean;
  isPolling: boolean;
  activeModule: string;
  activeIsRead: boolean | undefined;
  activePage: number;
  activeLimit: number;
  fetchNotifications: (page?: number, limit?: number, module?: string, isRead?: boolean, isBackground?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
}
