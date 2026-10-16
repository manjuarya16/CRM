import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useActivityStore } from "@/store";
import { IActivity } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { stripHtmlToText } from "@/utils/formatters";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";

const fmtDateTime = (dt?: string) => {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const TYPE_BADGE: Record<string, string> = {
  call: "text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  meeting: "text-purple-700 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  task: "text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  email: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  lunch: "text-orange-700 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
};

const TYPE_ICONS: Record<string, string> = {
  call: "mgc_phone_line",
  meeting: "mgc_calendar_line",
  task: "mgc_task_line",
  email: "mgc_mail_line",
  lunch: "mgc_restaurant_line",
};

const AVATAR_COLORS = [
  "bg-amber-600 text-white",
  "bg-blue-600 text-white",
  "bg-purple-600 text-white",
  "bg-emerald-600 text-white",
  "bg-teal-600 text-white",
  "bg-rose-500 text-white",
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
];

const getInitials = (title?: string, fallback = "AC") => {
  if (!title) return fallback;
  const parts = title.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ActivitiesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("activities.create");
  const canEdit = hasPermission("activities.edit");
  const canDelete = hasPermission("activities.delete");
  const canView = hasPermission("activities.view");
  const { activities, total, loading, fetchActivities, deleteActivity, updateActivity } = useActivityStore();

  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { viewMode, setViewMode, setHasUserToggled } = useResponsiveViewMode();

  useEffect(() => {
    fetchActivities(page, perPage, search);
  }, [page, perPage]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchActivities(1, perPage, search);
  };

  const handleToggleDone = async (act: IActivity) => {
    setTogglingId(act.id);
    try {
      await updateActivity(act.id, { is_done: !act.is_done });
      fetchActivities(page, perPage, search);
    } catch (e: any) {
      Swal.fire("Error", e.message || "Failed to update activity status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (activity: IActivity) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete "${activity.title || activity.type}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteActivity(activity.id);
        fetchActivities(page, perPage, search);
        setSelectedIds((prev) => prev.filter((id) => id !== activity.id));
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to delete activity", "error");
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === activities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activities.map((a) => a.id));
    }
  };

  const totalPages = Math.ceil(total / perPage);
  const startRow = (page - 1) * perPage + 1;
  const endRow = Math.min(page * perPage, total);

  const renderActivityCard = (act: IActivity, idx: number) => {
    const isSelected = selectedIds.includes(act.id);
    const avatarColor = AVATAR_COLORS[(act.id || idx) % AVATAR_COLORS.length];
    const iconClass = TYPE_ICONS[act.type?.toLowerCase()] || "mgc_time_line";
    const badgeClass = TYPE_BADGE[act.type?.toLowerCase()] || "text-gray-700 bg-gray-100 border-gray-200 dark:bg-gray-700 dark:text-gray-200";

    return (
      <div
        key={act.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        } ${act.is_done ? "opacity-80" : ""}`}
      >
        {/* Top Row: Checkbox + Avatar + Title + Status Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(act.id)}
              className="mt-1 rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer shrink-0"
            />
            <Link
              to={canEdit ? `/activities/edit/${act.id}` : "#"}
              className="flex items-start gap-2.5 min-w-0 flex-1 group"
            >
              <span className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}>
                {getInitials(act.title || act.type, "AC")}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-bold text-sm sm:text-base leading-tight group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] ${
                    act.is_done
                      ? "line-through text-gray-400 dark:text-gray-500"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {act.title || `(${act.type})`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[11px] font-semibold capitalize ${badgeClass}`}>
                    <i className={`${iconClass} text-[11px] shrink-0`}></i>
                    <span>{act.type}</span>
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">#ACT-{act.id}</span>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                act.is_done
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${act.is_done ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              <span>{act.is_done ? "Done" : "Pending"}</span>
            </span>
          </div>
        </div>

        {/* Middle Body: Full Details as shown on desktop table (Comment, Lead link, Schedule From & To, Created At) */}
        <div className="space-y-2.5 py-2.5 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* Full Comment */}
          {act.comment ? (
            <div className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50/80 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 leading-relaxed whitespace-pre-wrap">
              <span className="font-semibold text-gray-500 dark:text-gray-400 block mb-0.5 text-[10px] uppercase tracking-wider">Comment:</span>
              {stripHtmlToText(act.comment)}
            </div>
          ) : (
            <p className="text-gray-400 italic text-xs">No comments provided</p>
          )}

          {/* Linked Lead */}
          {act.lead_id && (
            <div className="flex items-center gap-2 text-xs">
              <i className="mgc_flag_3_line text-sm text-[#0088cc] shrink-0"></i>
              <span className="text-gray-500 dark:text-gray-400">Lead:</span>
              <Link
                to={`/leads/view/${act.lead_id}`}
                className="font-bold text-[#0088cc] hover:underline truncate"
              >
                {act.lead_title || `Lead #${act.lead_id}`}
              </Link>
            </div>
          )}

          {/* Schedule From & To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50/60 dark:bg-gray-900/30 p-2 rounded-xl border border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center gap-1.5">
              <i className="mgc_time_line text-xs text-gray-400 shrink-0"></i>
              <span className="text-gray-400">From:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {fmtDateTime(act.schedule_from)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <i className="mgc_time_line text-xs text-gray-400 shrink-0"></i>
              <span className="text-gray-400">To:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {fmtDateTime(act.schedule_to)}
              </span>
            </div>
          </div>

          {/* Created At */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <i className="mgc_calendar_line text-xs shrink-0"></i>
            <span>Created on {fmtDateTime(act.created_at)}</span>
          </div>
        </div>

        {/* Bottom Row: User / Owner + Quick Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
            <i className="mgc_user_3_line text-xs text-gray-400 shrink-0"></i>
            <span className="truncate max-w-[140px]" title={act.user_name || "Unassigned"}>
              {act.user_name || "Unassigned"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {/* Done Toggle */}
            <button
              onClick={() => handleToggleDone(act)}
              disabled={togglingId === act.id}
              className={`p-1.5 rounded-lg border transition ${
                act.is_done
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600"
                  : "border-gray-200 dark:border-gray-700 hover:text-emerald-600 hover:border-emerald-200"
              }`}
              title={act.is_done ? "Mark as Pending" : "Mark as Done"}
            >
              {togglingId === act.id ? (
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border border-gray-400 border-t-transparent" />
              ) : (
                <i className={act.is_done ? "mgc_check_circle_fill text-sm" : "mgc_check_circle_line text-sm"}></i>
              )}
            </button>

            {/* Edit */}
            {canEdit && (
              <Link
                to={`/activities/edit/${act.id}`}
                className="p-1.5 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Edit Activity"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}

            {/* Delete */}
            {canDelete && (
              <button
                onClick={() => handleDelete(act)}
                className="p-1.5 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Delete Activity"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🏷️ Header Card with Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-300 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">Activities</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Activities
          </h1>
        </div>

        {canCreate && (
          <div className="flex items-center gap-x-2.5">
            <Link
              to="/activities/create"
              className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Create Activity
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-44 sm:w-60 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-xs sm:text-sm rounded-xl border border-[#bae6fd] transition shadow-2xs"
            >
              Filter
            </button>
          </form>

          {/* Right side: View Mode, Per Page & Pagination controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <ViewModeSwitcher
              viewMode={viewMode}
              onViewModeChange={(m) => {
                setHasUserToggled(true);
                setViewMode(m);
              }}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 pl-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc] cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors shadow-2xs"
                title="Previous Page"
              >
                <i className="mgc_left_line text-base"></i>
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors shadow-2xs"
                title="Next Page"
              >
                <i className="mgc_right_line text-base"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{activities.length}</strong> {activities.length === 1 ? "activity" : "activities"}
          </span>
          <span>
            {total > 0 ? `${startRow} – ${endRow} of ` : ""}
            <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW (Full details matching desktop info in clean responsive cards) */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activities.map((act: IActivity, idx: number) => renderActivityCard(act, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === activities.length && activities.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-400 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                        <span>ID / Title / Created By</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Is Done</th>
                    <th className="py-3 px-4 whitespace-nowrap">Comment / Lead / Type</th>
                    <th className="py-3 px-4 whitespace-nowrap">Schedule From / Schedule To / Created At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act: IActivity) => (
                    <tr
                      key={act.id}
                      className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors ${
                        act.is_done ? "opacity-70" : ""
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(act.id)}
                            onChange={() => toggleSelect(act.id)}
                            className="mt-0.5 rounded border-gray-400 text-[#0088cc] focus:ring-[#0088cc]"
                          />
                          <div className="space-y-0.5">
                            <div className="text-xs text-gray-400 font-mono">{act.id}</div>
                            <Link
                              to={`/activities/edit/${act.id}`}
                              className={`block text-sm font-medium hover:underline leading-snug ${
                                act.is_done
                                  ? "line-through text-gray-400"
                                  : "text-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {act.title || `(${act.type})`}
                            </Link>
                            {act.user_name && (
                              <span className="text-xs text-[#0088cc] font-medium">{act.user_name}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center align-top">
                        <button
                          onClick={() => handleToggleDone(act)}
                          disabled={togglingId === act.id}
                          title={act.is_done ? "Mark as Pending" : "Mark as Done"}
                          className={`flex items-center justify-center h-5 w-5 rounded border-2 mx-auto transition-colors focus:outline-none ${
                            act.is_done
                              ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                              : "border-gray-400 bg-white dark:bg-gray-700 hover:border-[#0088cc]"
                          } ${togglingId === act.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {togglingId === act.id ? (
                            <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                          ) : act.is_done ? (
                            <i className="mgc_check_line text-[10px]"></i>
                          ) : null}
                        </button>
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="space-y-1">
                          {act.comment && (
                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug">
                              {stripHtmlToText(act.comment)}
                            </p>
                          )}
                          {act.lead_id && (
                            <Link
                              to={`/leads/view/${act.lead_id}`}
                              className="block text-xs text-[#0088cc] hover:underline font-medium truncate"
                            >
                              {act.lead_title || `Lead #${act.lead_id}`}
                            </Link>
                          )}
                          <span
                            className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                              TYPE_BADGE[act.type?.toLowerCase()] || "text-gray-600 bg-gray-100 dark:bg-gray-700"
                            }`}
                          >
                            {act.type}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <div>{fmtDateTime(act.schedule_from)}</div>
                          <div>{fmtDateTime(act.schedule_to)}</div>
                          <div className="text-gray-400 dark:text-gray-500">{fmtDateTime(act.created_at)}</div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/activities/edit/${act.id}`}
                            className="p-1.5 text-gray-500 hover:text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                            title="Edit Activity"
                          >
                            <i className="mgc_edit_line text-base"></i>
                          </Link>
                          <button
                            onClick={() => handleDelete(act)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                            title="Delete Activity"
                          >
                            <i className="mgc_delete_line text-base"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}

        {/* Bottom Pagination */}
        {
          total > perPage && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>
                {activities.length > 0 ? `${startRow} – ${endRow} of ${total}` : `0 of ${total}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                  {page} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default ActivitiesPage;
