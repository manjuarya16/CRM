import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useNotificationStore } from "@/store/notificationStore";
import { INotificationItem } from "@/interface/notificationInterface";
import { timeAgo, formatDateTime } from "@/utils/formatters";

const getModuleBadge = (module: string) => {
  const mod = module?.toLowerCase() || "";
  if (mod === "lead" || mod === "leads") {
    return {
      icon: "mgc_user_star_line",
      label: "Leads",
      bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    };
  }
  if (mod === "quote" || mod === "quotes") {
    return {
      icon: "mgc_file_check_line",
      label: "Quotes",
      bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  }
  if (mod === "activity" || mod === "activities") {
    return {
      icon: "mgc_calendar_line",
      label: "Activities",
      bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  }
  if (mod === "mail" || mod === "mails") {
    return {
      icon: "mgc_mail_line",
      label: "Mail",
      bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    };
  }
  if (mod === "deal" || mod === "deals") {
    return {
      icon: "mgc_wallet_line",
      label: "Deals",
      bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    };
  }
  return {
    icon: "mgc_notification_line",
    label: module || "General",
    bg: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600",
  };
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    total,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotificationStore();

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // "all" | "unread" | "read"
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    const isReadParam =
      statusFilter === "unread" ? false : statusFilter === "read" ? true : undefined;
    fetchNotifications(page, limit, selectedModule, isReadParam);
    fetchUnreadCount();
  }, [page, limit, selectedModule, statusFilter]);

  const handleClearAll = async () => {
    const result = await Swal.fire({
      title: "Clear all notifications?",
      text: "This will permanently remove all notifications from your activity feed.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, clear all",
    });

    if (result.isConfirmed) {
      await clearAll();
      Swal.fire({
        title: "Cleared!",
        text: "All notifications have been cleared.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleItemClick = async (item: INotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  // Filter client-side by search query
  const filteredNotifications = notifications.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.title?.toLowerCase().includes(query) ||
      item.message?.toLowerCase().includes(query) ||
      item.module?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              Activity Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time feed of all events, leads, quotes, and CRM activities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <i className="mgc_check_circle_line text-sm text-[#0088cc]"></i>
              Mark All as Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <i className="mgc_delete_2_line text-sm"></i>
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Module Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "all", label: "All Feed", icon: "mgc_notification_line" },
              { id: "leads", label: "Leads", icon: "mgc_user_star_line" },
              { id: "quotes", label: "Quotes", icon: "mgc_file_check_line" },
              { id: "activities", label: "Activities", icon: "mgc_calendar_line" },
              { id: "mail", label: "Mail", icon: "mgc_mail_line" },
            ].map((tab) => {
              const active = selectedModule === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedModule(tab.id);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-[#0088cc] text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <i className={`${tab.icon} text-sm`}></i>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Read Filter and Search */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#0088cc] border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <i className="mgc_notification_line text-3xl opacity-40"></i>
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
              No notifications found
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {search || selectedModule !== "all" || statusFilter !== "all"
                ? "Try clearing your active filters or search terms."
                : "You're all caught up! New events and CRM updates will show up here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {filteredNotifications.map((item) => {
              const badge = getModuleBadge(item.module);
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-4 sm:p-5 flex items-start gap-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                    !item.is_read
                      ? "bg-blue-50/30 dark:bg-blue-900/10 border-l-4 border-[#0088cc]"
                      : ""
                  }`}
                >
                  {/* Left Icon Badge */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${badge.bg}`}
                  >
                    <i className={`${badge.icon} text-lg`}></i>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {badge.label}
                        </span>
                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#0088cc] flex-shrink-0 animate-pulse"></span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400" title={formatDateTime(item.created_at)}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    <h3
                      className={`text-sm mb-1 ${
                        !item.is_read
                          ? "font-bold text-gray-900 dark:text-gray-100"
                          : "font-semibold text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    {item.link && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#0088cc] hover:underline">
                        <span>View Details</span>
                        <i className="mgc_arrow_right_line text-sm"></i>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 self-center sm:self-start">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        title="Mark as read"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <i className="mgc_check_line text-base"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <i className="mgc_delete_2_line text-base"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} notifications
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
