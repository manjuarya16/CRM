import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { IWebhook } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useWebhookStore } from "@/store";

const WebhooksPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.webhooks.create");
  const canEdit = hasPermission("settings.webhooks.edit");
  const canDelete = hasPermission("settings.webhooks.delete");
  const canView = hasPermission("settings.webhooks.view");

  const [webhooks, setWebhooks] = useState<IWebhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");

  const AVATAR_COLORS = [
    "bg-indigo-600 text-white",
    "bg-blue-600 text-white",
    "bg-teal-600 text-white",
    "bg-purple-600 text-white",
    "bg-amber-600 text-white",
    "bg-emerald-600 text-white",
    "bg-cyan-600 text-white",
    "bg-rose-500 text-white",
  ];

  const getInitials = (name?: string, fallback = "WH") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const list = await useWebhookStore.getState().fetchWebhooks();
      setWebhooks(list || []);
    } catch {
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleDelete = async (item: IWebhook) => {
    const res = await Swal.fire({
      title: "Delete Webhook?",
      text: `Are you sure you want to delete "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await useWebhookStore.getState().deleteWebhook(item.id);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchWebhooks();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to delete" });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const res = await Swal.fire({
      title: "Delete Selected Webhooks?",
      text: `Are you sure you want to delete ${selectedIds.length} webhook(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: `Yes, delete (${selectedIds.length})`,
    });
    if (res.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useWebhookStore.getState().deleteWebhook(id)));
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds([]);
        fetchWebhooks();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete selected webhooks" });
      }
    }
  };

  const handleTest = async (item: IWebhook) => {
    try {
      Swal.fire({
        title: "Firing Webhook...",
        text: `Sending sample ${item.entity_type} payload to ${item.end_point}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const resData = await useWebhookStore.getState().testWebhook(item.id);
      const payloadStr = JSON.stringify(resData?.sent_payload, null, 2);
      Swal.fire({
        icon: "success",
        title: "Webhook Fired Successfully!",
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p><strong>HTTP Status:</strong> <span style="color: green; font-weight: bold;">${resData?.result?.status_code || 200} OK</span></p>
            <p><strong>Endpoint:</strong> <code style="word-break: break-all; font-size: 11px;">${item.end_point}</code></p>
            <p style="margin-top: 10px;"><strong>Sent Real CRM Payload:</strong></p>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 6px; max-height: 180px; overflow-y: auto; font-size: 11px; color: #111;">${payloadStr}</pre>
          </div>
        `,
        confirmButtonColor: "#0088cc",
        confirmButtonText: "Done",
      });
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Test Failed",
        text: err.response?.data?.message || err.message || "Failed to trigger webhook",
      });
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      Swal.fire("Export", "No webhooks to export", "info");
      return;
    }

    const headers = ["ID", "Webhook Name", "Entity Type", "Method", "Endpoint", "Description", "Created At"];
    const rows = filtered.map((w) => [
      w.id,
      `"${(w.name || "").replace(/"/g, '""')}"`,
      w.entity_type || "",
      w.method || "POST",
      `"${(w.end_point || "").replace(/"/g, '""')}"`,
      `"${(w.description || "").replace(/"/g, '""')}"`,
      w.created_at ? new Date(w.created_at).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `webhooks_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    webhooks.forEach((w) => {
      if (w.entity_type) set.add(w.entity_type);
    });
    return Array.from(set);
  }, [webhooks]);

  const filtered = useMemo(() => {
    return webhooks.filter((w) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.end_point || "").toLowerCase().includes(q) ||
        (w.entity_type || "").toLowerCase().includes(q) ||
        (w.description || "").toLowerCase().includes(q);

      const matchesMethod =
        methodFilter === "all" || (w.method || "POST").toUpperCase() === methodFilter.toUpperCase();

      const matchesEntity =
        entityFilter === "all" || (w.entity_type || "").toLowerCase() === entityFilter.toLowerCase();

      return matchesSearch && matchesMethod && matchesEntity;
    });
  }, [webhooks, search, methodFilter, entityFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllSelected = paginated.length > 0 && paginated.every((w) => selectedIds.includes(w.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((w) => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getMethodBadgeClass = (method?: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
      case "POST":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
      case "PUT":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
      case "DELETE":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700";
    }
  };

  // Responsive Full-Detail Webhook Card
  const renderWebhookCard = (item: IWebhook, idx: number) => {
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
        {/* Top Row: Checkbox + Avatar + Name + Badges */}
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
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(item.name, "WH")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {item.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded ${getMethodBadgeClass(item.method)}`}>
                    {item.method || "POST"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 capitalize">
                    <i className="mgc_cube_line text-[11px]"></i>
                    {item.entity_type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #WHK-{item.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Endpoint URL & Description */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium mb-1">Target Endpoint</span>
            <div className="font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/70 p-2 rounded-lg border border-gray-200/70 dark:border-gray-700 break-all select-all">
              {item.end_point}
            </div>
          </div>

          {item.description && (
            <div className="flex items-start gap-1.5 text-gray-500 dark:text-gray-400 text-xs pt-1">
              <i className="mgc_information_line text-xs mt-0.5 shrink-0 text-gray-400"></i>
              <span className="line-clamp-2">{item.description}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-gray-400 text-[11px] pt-0.5">
            <span className="flex items-center gap-1">
              <i className="mgc_time_line text-xs"></i>
              <span>Created {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
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
            onClick={() => handleTest(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 font-semibold text-xs rounded-xl transition"
            title="Test Fire Webhook (Send Live CRM Payload)"
          >
            <i className="mgc_send_line text-sm"></i>
            <span>Test Fire</span>
          </button>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canEdit && (
              <Link
                to={`/settings/webhooks/${item.id}/edit`}
                className="p-1.5 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                title="Edit Webhook"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1.5 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Delete Webhook"
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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Webhooks</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Outbound Webhooks
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Send real-time HTTP events to third-party endpoints (Zapier, Make, Slack)
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-sm"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-white dark:bg-gray-800 hover:bg-[#e0f2fe] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-sm text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <Link
              to="/settings/webhooks/create"
              className="h-8 px-3 sm:px-3.5 inline-flex items-center justify-center gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors active:scale-98 shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Create Webhook</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, Filters, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                placeholder="Search webhooks by name, endpoint..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-52 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200"
            >
              <option value="all">All Methods</option>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            {availableEntities.length > 0 && (
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 capitalize"
              >
                <option value="all">All Entities</option>
                {availableEntities.map((ent) => (
                  <option key={ent} value={ent} className="capitalize">
                    {ent}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-600">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Cards View"
              >
                <i className="mgc_grid_2_line text-sm"></i>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Table View"
              >
                <i className="mgc_table_line text-sm"></i>
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Quick pagination arrows in toolbar */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <i className="mgc_left_line text-xs"></i>
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {page}/{totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
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
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> webhooks
            {total > 0 && ` (${startIndex} - ${endIndex} of ${total})`}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-[#0088cc] font-medium">
              {selectedIds.length} webhook(s) selected
            </div>
          )}
        </div>

        {/* 📦 View Modes Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading webhooks...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <i className="mgc_link_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No outbound webhooks found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginated.map((item, idx) => renderWebhookCard(item, idx))}
          </div>
        ) : (
          /* Table View with Mobile Card Fallback */
          <div>
            {/* Mobile Fallback: Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {paginated.map((item, idx) => renderWebhookCard(item, idx))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                    {canDelete && (
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 font-semibold">Webhook Name</th>
                    <th className="py-3.5 px-4 font-semibold">Entity</th>
                    <th className="py-3.5 px-4 font-semibold">Method</th>
                    <th className="py-3.5 px-4 font-semibold">Endpoint</th>
                    <th className="py-3.5 px-4 font-semibold">Created</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginated.map((item, idx) => {
                    const isSelected = selectedIds.includes(item.id);
                    const avatarColor = AVATAR_COLORS[(item.id || idx) % AVATAR_COLORS.length];

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        {canDelete && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(item.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(item.name, "WH")}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {item.name}
                              </p>
                              <span className="font-mono text-xs text-[#0088cc] dark:text-[#38bdf8]">
                                #WHK-{item.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 capitalize">
                            <i className="mgc_cube_line text-xs"></i>
                            {item.entity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 font-mono text-xs font-bold rounded ${getMethodBadgeClass(item.method)}`}>
                            {item.method || "POST"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {item.end_point}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleTest(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition inline-flex items-center font-semibold"
                              title="Test Fire Webhook (Send Live CRM Payload)"
                            >
                              <i className="mgc_send_line text-base"></i>
                            </button>
                            {canEdit && (
                              <Link
                                to={`/settings/webhooks/${item.id}/edit`}
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                                title="Edit"
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </Link>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                                title="Delete"
                              >
                                <i className="mgc_delete_line text-base"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {startIndex} to {endIndex} of {total} webhooks
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
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

export default WebhooksPage;
