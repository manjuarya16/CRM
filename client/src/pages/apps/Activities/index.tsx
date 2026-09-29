import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useActivityStore } from "@/store";
import { IActivity } from "@/interface";

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
  call: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300",
  meeting: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300",
  email: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300",
  lunch: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300",
};

const ActivitiesPage: React.FC = () => {
  const { activities, total, loading, fetchActivities, deleteActivity, updateActivity } = useActivityStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  return (
    <div className="p-6 space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0088cc] hover:underline">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Activities</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Activities</h1>
        <Link
          to="/activities/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_add_line"></i> Create Activity
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <div className="relative">
              <i className="mgc_search_line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-52 dark:text-gray-200"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd] transition"
            >
              Filter
            </button>
          </form>

          {/* Per Page + Pagination Info */}
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Per Page</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            {total > 0 && (
              <span className="text-xs text-gray-500">
                {startRow} – {endRow} of {total}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="mgc_left_line text-sm"></i>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <i className="mgc_right_line text-sm"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide">
                {/* Checkbox + ID / Title / Created By */}
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
                {/* Is Done */}
                <th className="py-3 px-4 text-center whitespace-nowrap">Is Done</th>
                {/* Comment / Lead / Type */}
                <th className="py-3 px-4 whitespace-nowrap">Comment / Lead / Type</th>
                {/* Schedule From / To / Created At */}
                <th className="py-3 px-4 whitespace-nowrap">Schedule From / Schedule To / Created At</th>
                {/* Actions */}
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-14 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
                    No Records Available.
                  </td>
                </tr>
              ) : (
                activities.map((act: IActivity) => (
                  <tr
                    key={act.id}
                    className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors ${act.is_done ? "opacity-70" : ""}`}
                  >
                    {/* Column 1: Checkbox + ID + Title + Created By */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(act.id)}
                          onChange={() => toggleSelect(act.id)}
                          className="mt-0.5 rounded border-gray-400 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                        <div className="space-y-0.5">
                          {/* ID */}
                          <div className="text-xs text-gray-400 font-mono">{act.id}</div>
                          {/* Title */}
                          <Link
                            to={`/activities/edit/${act.id}`}
                            className={`block text-sm font-medium hover:underline leading-snug ${act.is_done ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"}`}
                          >
                            {act.title || `(${act.type})`}
                          </Link>
                          {/* Created By (user_name acts as created by) */}
                          {act.user_name && (
                            <span className="text-xs text-[#0088cc] font-medium">{act.user_name}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Is Done Toggle */}
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

                    {/* Column 3: Comment / Lead (linked) / Type */}
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="space-y-1">
                        {/* Comment */}
                        {act.comment && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug">
                            {act.comment}
                          </p>
                        )}
                        {/* Lead link */}
                        {act.lead_id && (
                          <Link
                            to={`/leads/view/${act.lead_id}`}
                            className="block text-xs text-[#0088cc] hover:underline font-medium truncate"
                          >
                            {act.lead_title || `Lead #${act.lead_id}`}
                          </Link>
                        )}
                        {/* Type badge */}
                        <span
                          className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                            TYPE_BADGE[act.type?.toLowerCase()] || "text-gray-600 bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          {act.type}
                        </span>
                      </div>
                    </td>

                    {/* Column 4: Schedule From / Schedule To / Created At */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div>{fmtDateTime(act.schedule_from)}</div>
                        <div>{fmtDateTime(act.schedule_to)}</div>
                        <div className="text-gray-400 dark:text-gray-500">{fmtDateTime(act.created_at)}</div>
                      </div>
                    </td>

                    {/* Column 5: Actions */}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {total > perPage && (
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
        )}
      </div>
    </div>
  );
};

export default ActivitiesPage;
