import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMailStore } from "@/store";
import { ComposeMailModal } from "./ComposeMailModal";
import { EmailItem } from "@/interface";
import { stripHtmlToText, cleanEmailAddress } from "@/utils/formatters";

const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: "mgc_inbox_line" },
  { id: "important", label: "Important", icon: "mgc_bookmark_line" },
  { id: "starred", label: "Starred", icon: "mgc_star_line" },
  { id: "draft", label: "Draft", icon: "mgc_draft_line" },
  { id: "outbox", label: "Outbox", icon: "mgc_send_line" },
  { id: "sent", label: "Sent", icon: "mgc_check_circle_line" },
  { id: "spam", label: "Spam", icon: "mgc_alert_octagon_line" },
  { id: "trash", label: "Trash", icon: "mgc_delete_2_line" },
];

const AVATAR_COLORS = [
  "bg-blue-100 text-[#0088cc] dark:bg-blue-900/60 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
];

const MailPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeFolder,
    emails,
    counts,
    selectedEmailIds,
    search,
    page,
    totalPages,
    total,
    loading,
    actionLoading,
    setActiveFolder,
    setSearch,
    setPage,
    toggleSelectEmail,
    selectAllEmails,
    clearSelection,
    fetchEmails,
    fetchCounts,
    markAsRead,
    removeEmail,
    bulkMoveToFolder,
    bulkDelete,
  } = useMailStore();

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  useEffect(() => {
    fetchEmails();
    fetchCounts();
  }, []);

  // Handle search input debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFolderChange = (folderId: string) => {
    setActiveFolder(folderId);
    setMobileSidebarOpen(false);
  };

  const handleRowClick = (email: EmailItem) => {
    if (activeFolder === "draft") {
      setEditingDraft({
        draftId: email.id,
        to: email.reply_to || [],
        cc: email.cc || [],
        bcc: email.bcc || [],
        subject: email.subject || "",
        reply: email.reply || "",
        lead_id: email.lead_id,
        person_id: email.person_id,
        parent_id: email.parent_id,
      });
      setIsComposeOpen(true);
    } else {
      navigate(`/mail/view/${email.id}`);
    }
  };

  const getFolderBadge = (folderId: string) => {
    switch (folderId) {
      case "inbox":
        return counts.inbox_unread > 0 ? counts.inbox_unread : null;
      case "important":
        return counts.important_total > 0 ? counts.important_total : null;
      case "starred":
        return counts.starred_total > 0 ? counts.starred_total : null;
      case "draft":
        return counts.draft_total > 0 ? counts.draft_total : null;
      case "outbox":
        return counts.outbox_total > 0 ? counts.outbox_total : null;
      case "sent":
        return counts.sent_total > 0 ? counts.sent_total : null;
      case "spam":
        return counts.spam_total > 0 ? counts.spam_total : null;
      case "trash":
        return counts.trash_total > 0 ? counts.trash_total : null;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
    return stripHtmlToText(html).replace(/\s+/g, " ").trim().substring(0, 140);
  };

  const allSelected = emails.length > 0 && selectedEmailIds.length === emails.length;
  const isPartiallySelected = selectedEmailIds.length > 0 && !allSelected;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* 🏷️ Header Card with Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-300 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center transition shadow-2xs shrink-0"
            title="Open Folders"
          >
            <i className="mgc_menu_line text-xl"></i>
          </button>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
                Dashboard
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">Mail</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>Mail</span>
              {counts.inbox_unread > 0 && activeFolder === "inbox" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-[#0088cc] dark:bg-blue-900/50 dark:text-blue-300">
                  {counts.inbox_unread} unread
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingDraft(null);
              setIsComposeOpen(true);
            }}
            className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
          >
            Compose Mail
          </button>
        </div>
      </div>

      {/* 📱 Mobile Horizontal Folder Quick Switcher */}
      <div
        className="md:hidden flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FOLDERS.map((f) => {
          const isActive = activeFolder === f.id;
          const badge = getFolderBadge(f.id);
          return (
            <button
              key={f.id}
              onClick={() => handleFolderChange(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-[#0e90d9] text-white shadow-2xs"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
              }`}
            >
              <i className={`${f.icon} text-sm`}></i>
              <span>{f.label}</span>
              {badge !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Folder Slide-over Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setMobileSidebarOpen(false)}
          ></div>
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-gray-800 p-4 shadow-2xl flex flex-col h-full z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_mail_line text-[#0e90d9]"></i> Mail Folders
              </span>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="mgc_close_line text-lg"></i>
              </button>
            </div>
            <nav className="space-y-1 flex-1 overflow-y-auto">
              {FOLDERS.map((f) => {
                const isActive = activeFolder === f.id;
                const badge = getFolderBadge(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFolderChange(f.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-[#0088cc] dark:bg-blue-900/30 dark:text-blue-400 font-bold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className={`${f.icon} text-base`}></i>
                      <span>{f.label}</span>
                    </div>
                    {badge !== null && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isActive
                            ? "bg-[#0088cc] text-white"
                            : f.id === "inbox"
                            ? "bg-blue-100 text-[#0088cc] dark:bg-blue-900/50 dark:text-blue-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Mail Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar (Folders) for Desktop */}
        <div className="hidden md:block md:col-span-4 lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-3 space-y-2 shadow-sm sticky top-4">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Folders
          </div>
          <nav className="space-y-1">
            {FOLDERS.map((f) => {
              const isActive = activeFolder === f.id;
              const badge = getFolderBadge(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => handleFolderChange(f.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-[#0088cc] dark:bg-blue-900/30 dark:text-blue-400 font-bold"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className={`${f.icon} text-base`}></i>
                    <span>{f.label}</span>
                  </div>
                  {badge !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isActive
                          ? "bg-[#0088cc] text-white"
                          : f.id === "inbox"
                          ? "bg-blue-100 text-[#0088cc] dark:bg-blue-900/50 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Mailbox Content (Toolbar + List) */}
        <div className="md:col-span-8 lg:col-span-9 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
          {/* Top Mailbox Toolbar */}
          <div className="p-3.5 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/50">
            {/* Left Toolbar Controls */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected;
                  }}
                  onChange={selectAllEmails}
                  className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] w-4 h-4 cursor-pointer"
                />
              </label>

              {selectedEmailIds.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#0088cc] bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">
                    {selectedEmailIds.length} selected
                  </span>

                  {/* Move to Inbox (only in Trash) */}
                  {activeFolder === "trash" && (
                    <button
                      onClick={() => bulkMoveToFolder("inbox")}
                      title="Move to Inbox"
                      disabled={actionLoading}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <i className="mgc_inbox_line text-base"></i>
                    </button>
                  )}

                  {/* Bulk Read / Unread */}
                  <button
                    onClick={() => bulkMoveToFolder(activeFolder)}
                    title="Mark Selected"
                    disabled={actionLoading}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <i className="mgc_mail_open_line text-base"></i>
                  </button>

                  {/* Bulk Delete / Trash */}
                  <button
                    onClick={() => bulkDelete(activeFolder === "trash" ? "delete" : "trash")}
                    title={activeFolder === "trash" ? "Delete Permanently" : "Move to Trash"}
                    disabled={actionLoading}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <i className="mgc_delete_2_line text-base"></i>
                  </button>

                  <button
                    onClick={clearSelection}
                    className="text-xs text-gray-500 hover:underline ml-1 font-medium"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      fetchEmails();
                      fetchCounts();
                    }}
                    title="Refresh Mailbox"
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <i className={`mgc_refresh_line text-base ${loading ? "animate-spin text-[#0088cc]" : ""}`}></i>
                  </button>

                  <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">
                    {activeFolder}
                  </span>
                </div>
              )}
            </div>

            {/* Right Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search mail..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition shadow-2xs"
              />
              <i className="mgc_search_line absolute left-3 top-2.5 text-gray-400 text-sm"></i>
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-base"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Email List Content */}
          <div className="flex-1 divide-y divide-gray-100 dark:divide-gray-700/80 overflow-y-auto">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
                <p className="text-xs">Loading emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-3 text-gray-400 dark:text-gray-500">
                <i className="mgc_mail_unread_line text-5xl opacity-40"></i>
                <p className="text-sm font-medium">No emails found in {activeFolder}.</p>
                {search && (
                  <p className="text-xs text-gray-400">
                    Try refining your search keywords: <span className="font-semibold text-gray-600 dark:text-gray-300">{search}</span>
                  </p>
                )}
              </div>
            ) : (
              emails.map((email, idx) => {
                const isSelected = selectedEmailIds.includes(email.id);
                const isUnread = !email.is_read;
                const senderName = stripHtmlToText(
                  email.name ||
                  email.sender?.name ||
                  email.from_email?.name ||
                  cleanEmailAddress(email.sender?.email || email.from_email?.email) ||
                  "Unknown"
                );
                const avatarColor = AVATAR_COLORS[(email.id || idx) % AVATAR_COLORS.length];

                return (
                  <React.Fragment key={email.id}>
                    {/* 📱 MOBILE VIEW CARD (< md) */}
                    <div
                      onClick={() => handleRowClick(email)}
                      className={`md:hidden p-3.5 transition-colors cursor-pointer space-y-2 border-b border-gray-100 dark:border-gray-700/60 ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/20"
                          : isUnread
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50/40 dark:bg-gray-800/40"
                      }`}
                    >
                      {/* Top Line: Checkbox + Avatar + Sender + Date + Unread */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectEmail(email.id);
                            }}
                            className="flex items-center shrink-0"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] w-4 h-4 cursor-pointer"
                            />
                          </div>

                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}
                          >
                            {senderName.charAt(0).toUpperCase()}
                          </div>

                          <span
                            className={`text-xs truncate ${
                              isUnread
                                ? "font-bold text-gray-900 dark:text-white"
                                : "font-medium text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {senderName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          {email.attachments_count && email.attachments_count > 0 ? (
                            <span className="text-gray-400 text-xs flex items-center" title={`${email.attachments_count} attachment(s)`}>
                              <i className="mgc_attachment_line text-sm"></i>
                            </span>
                          ) : null}
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {formatDate(email.created_at)}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#0088cc] shrink-0"></span>
                          )}
                        </div>
                      </div>

                      {/* Subject Line */}
                      <div className="pl-6 text-xs sm:text-sm">
                        <p
                          className={`truncate leading-snug ${
                            isUnread
                              ? "font-bold text-gray-900 dark:text-white"
                              : "font-medium text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {email.subject || "(No Subject)"}
                        </p>
                      </div>

                      {/* Snippet Line */}
                      <div className="pl-6 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {stripHtml(email.reply)}
                      </div>

                      {/* Badges & Actions Line */}
                      <div className="pl-6 flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {email.lead_title && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-800">
                              <i className="mgc_flag_3_line"></i>
                              <span className="max-w-[120px] truncate">{email.lead_title}</span>
                            </span>
                          )}
                          {email.person_name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-medium border border-purple-200 dark:border-purple-800">
                              <i className="mgc_user_3_line"></i>
                              <span className="max-w-[120px] truncate">{email.person_name}</span>
                            </span>
                          )}
                        </div>

                        {/* Mobile Quick Action Buttons */}
                        <div className="flex items-center gap-1 text-gray-400">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(email.id, !email.is_read);
                            }}
                            className="p-1 hover:text-[#0088cc] rounded"
                            title={email.is_read ? "Mark unread" : "Mark read"}
                          >
                            <i className={email.is_read ? "mgc_mail_line text-sm" : "mgc_mail_open_line text-sm"}></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEmail(email.id, activeFolder === "trash" ? "delete" : "trash");
                            }}
                            className="p-1 hover:text-red-500 rounded"
                            title={activeFolder === "trash" ? "Delete permanently" : "Move to trash"}
                          >
                            <i className="mgc_delete_2_line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 💻 DESKTOP ROW (>= md) */}
                    <div
                      onClick={() => handleRowClick(email)}
                      className={`hidden md:flex items-center justify-between px-4 py-3 hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors cursor-pointer text-xs group ${
                        isSelected
                          ? "bg-blue-50/60 dark:bg-blue-950/20"
                          : isUnread
                          ? "bg-white dark:bg-gray-800 font-semibold"
                          : "bg-gray-50/30 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 font-normal"
                      }`}
                    >
                      {/* Left: Checkbox + Unread Dot + Avatar + Sender */}
                      <div className="flex items-center gap-2.5 min-w-[160px] max-w-[210px] truncate shrink-0">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectEmail(email.id);
                          }}
                          className="flex items-center shrink-0"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] w-3.5 h-3.5 cursor-pointer"
                          />
                        </div>

                        <div className="w-2 flex justify-center shrink-0">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#0088cc] shadow-xs"></span>
                          )}
                        </div>

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${avatarColor}`}
                        >
                          {senderName.charAt(0).toUpperCase()}
                        </div>

                        <span
                          className={`truncate text-xs ${
                            isUnread
                              ? "text-gray-900 dark:text-white font-bold"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {senderName}
                        </span>
                      </div>

                      {/* Middle: Subject + Content Snippet + Badges */}
                      <div className="flex-1 mx-3 min-w-0 flex items-center gap-2 overflow-hidden">
                        {/* Attached Lead Badge */}
                        {email.lead_title && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-800 shrink-0">
                            <i className="mgc_flag_3_line"></i>
                            <span className="max-w-[100px] truncate">{email.lead_title}</span>
                          </span>
                        )}

                        {/* Attached Person Badge */}
                        {email.person_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-medium border border-purple-200 dark:border-purple-800 shrink-0">
                            <i className="mgc_user_3_line"></i>
                            <span className="max-w-[100px] truncate">{email.person_name}</span>
                          </span>
                        )}

                        {/* Subject */}
                        <span
                          className={`truncate ${
                            isUnread
                              ? "text-gray-900 dark:text-white font-semibold"
                              : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {email.subject || "(No Subject)"}
                        </span>

                        {/* Body Snippet */}
                        <span className="hidden lg:inline text-gray-400 dark:text-gray-500 font-normal truncate">
                          - {stripHtml(email.reply)}
                        </span>
                      </div>

                      {/* Right: Attachments + Date + Row Actions */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {email.attachments_count && email.attachments_count > 0 ? (
                          <span
                            className="text-gray-400 flex items-center gap-0.5"
                            title={`${email.attachments_count} attachment(s)`}
                          >
                            <i className="mgc_attachment_line text-sm"></i>
                            <span className="text-[10px]">{email.attachments_count}</span>
                          </span>
                        ) : null}

                        {/* Hover Action Buttons */}
                        <div className="hidden group-hover:flex items-center gap-1.5 bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-2xs border border-gray-100 dark:border-gray-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(email.id, !email.is_read);
                            }}
                            title={email.is_read ? "Mark as unread" : "Mark as read"}
                            className="p-1 hover:text-[#0088cc] text-gray-500 rounded"
                          >
                            <i
                              className={
                                email.is_read ? "mgc_mail_line text-sm" : "mgc_mail_open_line text-sm"
                              }
                            ></i>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEmail(email.id, activeFolder === "trash" ? "delete" : "trash");
                            }}
                            title={activeFolder === "trash" ? "Delete permanently" : "Move to trash"}
                            className="p-1 hover:text-red-600 text-gray-500 rounded"
                          >
                            <i className="mgc_delete_2_line text-sm"></i>
                          </button>
                        </div>

                        {/* Date */}
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap min-w-[55px] text-right group-hover:hidden">
                          {formatDate(email.created_at)}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Mailbox Footer Pagination */}
          {total > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/50 text-xs text-gray-500">
              <div>
                Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{emails.length}</span> of{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> mails
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition"
                >
                  Previous
                </button>
                <span className="px-2 font-semibold text-gray-700 dark:text-gray-300">
                  {page} / {totalPages || 1}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Mail Modal */}
      <ComposeMailModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setEditingDraft(null);
        }}
        onSuccess={(msg) => {
          showToast(msg || "Email sent successfully!", "success");
          fetchEmails();
          fetchCounts();
        }}
        initialData={editingDraft}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20"
              : "bg-red-600 text-white border-red-500 shadow-red-900/20"
          }`}
        >
          <i
            className={`${
              toastMessage.type === "success" ? "mgc_check_circle_fill" : "mgc_close_circle_fill"
            } text-lg`}
          ></i>
          <span className="text-xs font-semibold">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-3 text-white/80 hover:text-white"
          >
            <i className="mgc_close_line text-sm"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default MailPage;
