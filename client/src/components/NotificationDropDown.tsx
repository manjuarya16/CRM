import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { PopoverLayout } from "./HeadlessUI";
import { useNotificationStore } from "@/store/notificationStore";
import { INotificationItem } from "@/interface/notificationInterface";
import { timeAgo } from "@/utils/formatters";

const getModuleIcon = (module: string) => {
  const mod = module?.toLowerCase() || "";
  switch (mod) {
    case "lead":
    case "leads":
      return { icon: "mgc_user_star_line", bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" };
    case "quote":
    case "quotes":
      return { icon: "mgc_file_check_line", bg: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" };
    case "activity":
    case "activities":
      return { icon: "mgc_calendar_line", bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" };
    case "mail":
    case "mails":
      return { icon: "mgc_mail_line", bg: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" };
    case "deal":
    case "deals":
      return { icon: "mgc_wallet_line", bg: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" };
    default:
      return { icon: "mgc_notification_line", bg: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
  }
};

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    startPolling,
  } = useNotificationStore();

  useEffect(() => {
    const cleanup = startPolling(5000);
    return cleanup;
  }, [startPolling]);

  const handleNotificationClick = async (item: INotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const PopoverToggler = () => {
    return (
      <div
        onClick={() => fetchNotifications(1, 10)}
        className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
      >
        <span className="sr-only">View notifications</span>
        <i className="mgc_notification_line text-xl text-gray-500 dark:text-gray-400"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full animate-pulse shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <PopoverLayout
        placement="bottom-end"
        menuClass=""
        toggler={<PopoverToggler />}
        togglerClass="nav-link p-1"
      >
        <div className="w-80 md:w-96 z-50 mt-2 transition-[margin,opacity] duration-300 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h6 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Notifications</h6>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
                className="text-xs text-[#0088cc] hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <SimpleBar className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                <i className="mgc_notification_line text-3xl mb-2 block opacity-40"></i>
                <p className="text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((item) => {
                const { icon, bg } = getModuleIcon(item.module);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !item.is_read ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
                      <i className={`${icon} text-base`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs truncate ${!item.is_read ? "font-semibold text-gray-900 dark:text-gray-100" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </SimpleBar>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/80">
            <Link
              to="/notifications"
              className="block text-center py-1 text-xs font-semibold text-[#0088cc] hover:underline"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      </PopoverLayout>
    </div>
  );
};

export default NotificationDropdown;
