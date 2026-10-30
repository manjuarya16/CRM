import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { API } from "@/config";
import { getSuperAdminToken } from "@/lib/auth-utils";

interface PlatformNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationResponse {
  success: boolean;
  data: PlatformNotification[];
  unread_count: number;
}

interface NotificationDropdownProps {
  canEdit: boolean;
  canDelete: boolean;
}

const NotificationDropdown = ({ canEdit, canDelete }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    const token = getSuperAdminToken();
    if (!token) return;
    try {
      const { data } = await API.get<NotificationResponse>(
        "/super-admin/modules/notifications",
        {
          params: { limit: 30, unread_only: !showAll },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load notifications.");
    }
  }, [showAll]);

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(() => void fetchNotifications(), 25000);
    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (notification: PlatformNotification) => {
    if (!canEdit || notification.is_read) return;
    const token = getSuperAdminToken();
    if (!token) return;
    try {
      await API.patch(
        `/super-admin/modules/notifications/${notification.id}/read`,
        { is_read: true },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update notification.");
    }
  };

  const markAllRead = async () => {
    const token = getSuperAdminToken();
    if (!token) return;
    try {
      await API.patch(
        "/super-admin/modules/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update notifications.");
    }
  };

  const clearAll = async () => {
    const token = getSuperAdminToken();
    if (!token) return;
    try {
      await API.delete("/super-admin/modules/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not clear notifications.");
    }
  };

  const openNotification = async (notification: PlatformNotification) => {
    await markRead(notification);
    setOpen(false);
    if (notification.type === "demo_request") navigate("/demos");
  };

  const relativeTime = (date: string) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-800 p-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Notifications</h2>
              <p className="text-xs text-slate-400">{unreadCount} unread</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setShowAll((current) => !current)} className="text-indigo-300 hover:text-indigo-200">
                {showAll ? "Unread" : "All"}
              </button>
              {canEdit && unreadCount > 0 && (
                <button type="button" onClick={() => void markAllRead()} className="text-indigo-300 hover:text-indigo-200">
                  Mark all read
                </button>
              )}
              {canDelete && notifications.length > 0 && (
                <button type="button" onClick={() => void clearAll()} className="text-rose-300 hover:text-rose-200">
                  Clear
                </button>
              )}
            </div>
          </header>
          {error && <p role="alert" className="border-b border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                {showAll ? "No notifications yet." : "You’re all caught up."}
              </p>
            ) : notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => void openNotification(notification)}
                className={`block w-full border-b border-slate-800 p-3 text-left hover:bg-slate-800/70 ${notification.is_read ? "opacity-75" : "bg-indigo-500/5"}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-100">{notification.title}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{relativeTime(notification.created_at)}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-400">{notification.message}</span>
                <span className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-indigo-300">
                  {notification.type.replace(/_/g, " ")}
                  {!notification.is_read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
                </span>
              </button>
            ))}
          </div>
          <footer className="border-t border-slate-800 p-2 text-center">
            <button type="button" onClick={() => { setOpen(false); navigate("/notifications"); }} className="text-xs font-medium text-indigo-300 hover:text-indigo-200">
              See all notifications
            </button>
          </footer>
        </section>
      )}
    </div>
  );
};

export default NotificationDropdown;
