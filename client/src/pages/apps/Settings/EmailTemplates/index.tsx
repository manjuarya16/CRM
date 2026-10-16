import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { ViewModeSwitcher } from "@/components";
import { IEmailTemplate } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { useEmailTemplateStore } from "@/store";
import { stripHtmlToText } from "@/utils/formatters";

const EmailTemplatesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.email_templates.create");
  const canEdit = hasPermission("settings.email_templates.edit");
  const canDelete = hasPermission("settings.email_templates.delete");
  const canView = hasPermission("settings.email_templates.view");

  const [templates, setTemplates] = useState<IEmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { viewMode, setViewMode, setHasUserToggled } = useResponsiveViewMode();
  const [previewTemplate, setPreviewTemplate] = useState<IEmailTemplate | null>(null);

  const AVATAR_COLORS = [
    "bg-blue-600 text-white",
    "bg-purple-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-teal-600 text-white",
    "bg-rose-500 text-white",
    "bg-indigo-600 text-white",
    "bg-cyan-600 text-white",
  ];

  const getInitials = (name?: string, fallback = "ET") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const list = await useEmailTemplateStore.getState().fetchEmailTemplates();
      setTemplates(list || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (item: IEmailTemplate) => {
    const res = await Swal.fire({
      title: "Delete Email Template?",
      text: `Are you sure you want to delete "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await useEmailTemplateStore.getState().deleteEmailTemplate(item.id);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchTemplates();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to delete" });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const res = await Swal.fire({
      title: "Delete Selected Templates?",
      text: `Are you sure you want to delete ${selectedIds.length} email template(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: `Yes, delete (${selectedIds.length})`,
    });
    if (res.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useEmailTemplateStore.getState().deleteEmailTemplate(id)));
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds([]);
        fetchTemplates();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete selected templates" });
      }
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      Swal.fire("Export", "No templates to export", "info");
      return;
    }

    const headers = ["ID", "Name", "Subject", "Content", "Created At"];
    const rows = filtered.map((t) => [
      t.id,
      `"${(t.name || "").replace(/"/g, '""')}"`,
      `"${(t.subject || "").replace(/"/g, '""')}"`,
      `"${(t.content || "").replace(/"/g, '""')}"`,
      t.created_at ? new Date(t.created_at).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `email_templates_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.subject || "").toLowerCase().includes(q) ||
        (t.content || "").toLowerCase().includes(q)
    );
  }, [templates, search]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllSelected = paginated.length > 0 && paginated.every((t) => selectedIds.includes(t.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Responsive Full-Detail Email Template Card
  const renderEmailTemplateCard = (item: IEmailTemplate, idx: number) => {
    const isSelected = selectedIds.includes(item.id);
    const avatarColor = AVATAR_COLORS[(item.id || idx) % AVATAR_COLORS.length];

    return (
      <div
        key={item.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {canDelete && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectOne(item.id)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
              />
            )}
            <div
              onClick={() => canView && setPreviewTemplate(item)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(item.name, "ET")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1">
                  <i className="mgc_mail_line text-xs"></i>
                  <span>{item.subject || "No subject specified"}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #ETPL-{item.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Snippet & Creation Date */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed bg-gray-50/70 dark:bg-gray-900/50 p-2 rounded-xl font-mono text-[11px]">
            {item.content ? stripHtmlToText(item.content).slice(0, 160) : <span className="text-gray-400 italic">Empty body template</span>}
          </div>

          <div className="flex items-center justify-between text-gray-400 text-[11px] pt-0.5">
            <span className="flex items-center gap-1">
              <i className="mgc_calendar_line text-xs"></i>
              <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
            </span>
            <span className="font-mono">
              ID: {item.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setPreviewTemplate(item)}
            className="inline-flex items-center gap-1 text-[11px] text-[#0088cc] font-semibold hover:underline"
          >
            <i className="mgc_eye_line text-xs"></i> Preview Content
          </button>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <button
                type="button"
                onClick={() => setPreviewTemplate(item)}
                className="p-1 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Preview Template"
              >
                <i className="mgc_eye_line text-sm"></i>
              </button>
            )}
            {canEdit && (
              <Link
                to={`/settings/email-templates/${item.id}/edit`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition inline-flex items-center"
                title="Edit Template"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Template"
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
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0e90d9] hover:underline">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Email Templates</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Email Templates
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage reusable automated email designs with dynamic merge tags
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-base"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-base text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <Link
              to="/settings/email-templates/create"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Template</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="mgc_search_line text-base"></i>
            </span>
            <input
              type="text"
              placeholder="Search templates by name or subject..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-52 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
            />
          </div>

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
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Quick pagination arrows in toolbar */}
            <div className="h-8 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-2xs shrink-0">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="h-full px-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <i className="mgc_left_line text-xs"></i>
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="h-full px-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Page"
              >
                <i className="mgc_right_line text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <div>
            Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{paginated.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> templates
            {total > 0 && ` (${startIndex} - ${endIndex} of ${total})`}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-[#0088cc] font-medium">
              {selectedIds.length} template(s) selected
            </div>
          )}
        </div>

        {/* 📦 View Modes Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading templates...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <i className="mgc_mail_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No email templates found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search keywords</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginated.map((item, idx) => renderEmailTemplateCard(item, idx))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                    {canDelete && (
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 w-16">ID</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Subject</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                    <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginated.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        {canDelete && (
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(item.id)}
                              className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                          #{item.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                          <button
                            type="button"
                            onClick={() => setPreviewTemplate(item)}
                            className="hover:text-[#0088cc] transition-colors font-semibold text-left"
                          >
                            {item.name}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-sm truncate">
                          {item.subject || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-xs">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => setPreviewTemplate(item)}
                              className="inline-flex items-center text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 p-1.5 rounded-lg transition-colors"
                              title="Preview Content"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/settings/email-templates/${item.id}/edit`}
                              className="inline-flex items-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg transition-colors"
                              title="Edit Template"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="inline-flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"
                              title="Delete Template"
                            >
                              <i className="mgc_delete_2_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}

        {/* Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {startIndex} to {endIndex} of {total} templates
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📧 Responsive Preview Template Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b pb-3.5 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0088cc]">
                  <i className="mgc_mail_line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                    {previewTemplate.name}
                  </h3>
                  <span className="text-[11px] font-mono text-gray-400">
                    #ETPL-{previewTemplate.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Subject</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50/80 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600">
                {previewTemplate.subject || "(No subject)"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Body Content</p>
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                {stripHtmlToText(previewTemplate.content)}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              {canEdit && (
                <Link
                  to={`/settings/email-templates/${previewTemplate.id}/edit`}
                  className="px-4 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs font-semibold rounded-xl shadow-sm transition"
                >
                  Edit Template
                </Link>
              )}
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesPage;
