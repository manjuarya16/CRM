import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { IImport } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useDataTransferStore } from "@/store";

const avatarColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
];

const MODULE_TYPES = ["all", "persons", "leads", "organizations", "products"];

const DataTransferPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canImport = hasPermission("settings.data_transfer.import");
  const canDelete = hasPermission("settings.data_transfer.delete") || hasPermission("settings.data_transfer.import");
  const navigate = useNavigate();

  const [imports, setImports] = useState<IImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const fetchImports = async () => {
    try {
      setLoading(true);
      const list = await useDataTransferStore.getState().fetchImports();
      setImports((list as any) || []);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete Import Record?",
      text: "Are you sure you want to delete this import history log?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });

    if (result.isConfirmed) {
      try {
        await useDataTransferStore.getState().deleteImport(id);
        setImports(imports.filter((i) => i.id !== id));
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
      } catch {
        Swal.fire({ icon: "error", title: "Error", text: "Failed to delete record" });
      }
    }
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: imports.length };
    imports.forEach((i) => {
      const t = (i.type || "").toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [imports]);

  const filteredImports = useMemo(() => {
    let result = imports;
    if (typeFilter !== "all") {
      result = result.filter((i) => (i.type || "").toLowerCase() === typeFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          String(i.id).includes(q) ||
          (i.type && i.type.toLowerCase().includes(q)) ||
          (i.state && i.state.toLowerCase().includes(q)) ||
          (i.summary?.fileName && i.summary.fileName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [imports, typeFilter, search]);

  const stats = useMemo(() => {
    const total = imports.length;
    const completed = imports.filter(
      (i) => (i.state || "completed").toLowerCase() === "completed"
    ).length;
    const totalProcessed = imports.reduce(
      (acc, i) => acc + (Number(i.summary?.processed) || 0),
      0
    );
    return { total, completed, totalProcessed };
  }, [imports]);

  const totalRecords = filteredImports.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const startIndex = totalRecords === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, totalRecords);
  const paginatedImports = filteredImports.slice((page - 1) * perPage, page * perPage);

  const getTypeInitials = (type?: string) => {
    const t = (type || "").toLowerCase();
    if (t === "persons") return "PE";
    if (t === "leads") return "LD";
    if (t === "organizations") return "OR";
    if (t === "products") return "PR";
    return type?.slice(0, 2).toUpperCase() || "IM";
  };

  const renderStateBadge = (state?: string) => {
    const s = (state || "completed").toLowerCase();
    if (s === "completed" || s === "success") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="capitalize">{state || "Completed"}</span>
        </span>
      );
    }
    if (s === "partial") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="capitalize">{state || "Partial"}</span>
        </span>
      );
    }
    if (s === "failed" || s === "error") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span className="capitalize">{state || "Failed"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-750 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shrink-0">
        <span className="capitalize">{state || "Pending"}</span>
      </span>
    );
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      {/* Top Bar & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5 flex-wrap">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-normal">Data Transfer & Imports</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Data Transfer & Imports
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage bulk data import history, inspect processing metrics, and upload new files.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={fetchImports}
            disabled={loading}
            title="Refresh import history"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors disabled:opacity-60"
          >
            <i className={`mgc_refresh_2_line text-base ${loading ? "animate-spin" : ""}`}></i>
            <span>Refresh</span>
          </button>

          {canImport && (
            <button
              type="button"
              onClick={() => navigate("/settings/data-transfer/create")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Import</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] dark:text-blue-400 flex items-center justify-center shrink-0 text-xl font-bold">
            <i className="mgc_layers_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Imports
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_check_circle_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Completed
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.completed}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_user_3_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Processed
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalProcessed}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-3">
        {/* Top Control Bar: Search & View Switcher like Leads */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              Import History
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300">
              {filteredImports.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search imports..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              />
            </div>

            {/* View Toggle Buttons matching Leads */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_layout_grid_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_list_check_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Type Filter Pills matching Leads Stage Pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          {MODULE_TYPES.map((typeKey) => {
            const count = typeCounts[typeKey] || 0;
            const isActive = typeFilter === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => {
                  setTypeFilter(typeKey);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 capitalize ${
                  isActive
                    ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
                }`}
              >
                <span>{typeKey === "all" ? "All Modules" : typeKey}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Header matching Leads */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredImports.length}</strong>{" "}
            {filteredImports.length === 1 ? "import record" : "import records"}
          </span>
          {typeFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setPage(1);
              }}
              className="text-xs text-[#0088cc] hover:underline font-semibold"
            >
              Show All Types
            </button>
          )}
        </div>

        {/* CARDS VIEW (Matching Leads High-Density Compact Cards List) */}
        {viewMode === "cards" && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <i className="mgc_loading_3_line animate-spin text-base text-[#0088cc]"></i>
                <span>Loading import records...</span>
              </div>
            ) : paginatedImports.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  No Import Records Found
                </p>
                <p className="text-xs text-gray-400">
                  {typeFilter !== "all"
                    ? "No records match the selected module filter."
                    : "Create your first import to see records here."}
                </p>
                {canImport && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => navigate("/settings/data-transfer/create")}
                      className="text-xs font-bold text-[#0088cc] hover:underline"
                    >
                      Click here to create an import
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                {paginatedImports.map((item, idx) => {
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  const total = Number(item.summary?.total) || 0;
                  const processed = Number(item.summary?.processed) || 0;
                  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2 group"
                    >
                      {/* Top Row: Initial Avatar + Type Title + Filename + Processed Count Highlight */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}
                          >
                            {getTypeInitials(item.type)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight capitalize transition-colors">
                                {item.type} Import #{item.id}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                              <i className="mgc_file_line text-xs text-gray-400 shrink-0"></i>
                              <span className="truncate">
                                {item.summary?.fileName || `${item.type}_import.csv`}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Deal Value style for processed rows */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-[#0088cc] dark:text-[#38bdf8] whitespace-nowrap">
                            {processed} / {total}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">rows</p>
                        </div>
                      </div>

                      {/* Middle: Info Pills matching Leads */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStateBadge(item.state)}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs capitalize">
                          <i className="mgc_refresh_2_line text-[11px] text-gray-400"></i>
                          {item.action || "Append"}
                        </span>
                        {Number(item.summary?.errors || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 text-[11px] font-bold">
                            <i className="mgc_alert_line text-[11px] text-rose-500"></i>
                            {item.summary?.errors} Errors
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {total > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>Import Completion</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percent === 100 ? "bg-emerald-500" : "bg-[#0088cc]"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Date & Time + Delete Action */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <i className="mgc_calendar_line text-xs"></i>
                            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <i className="mgc_time_line text-xs"></i>
                            <span>
                              {item.created_at
                                ? new Date(item.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1 hover:text-red-500 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Delete record"
                            >
                              <i className="mgc_delete_2_line text-sm"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Uploaded File</th>
                    <th className="py-3 px-4">Error File</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4">Completed At</th>
                    <th className="py-3 px-4">Summary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mr-2"></div>
                        Loading import records...
                      </td>
                    </tr>
                  ) : paginatedImports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-gray-500 font-medium text-sm">
                        No Records Available.
                      </td>
                    </tr>
                  ) : (
                    paginatedImports.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-3 px-4 font-mono text-gray-500">#{item.id}</td>
                        <td className="py-3 px-4 capitalize font-semibold">{item.type}</td>
                        <td className="py-3 px-4">{renderStateBadge(item.state)}</td>
                        <td className="py-3 px-4 text-[#0088cc] font-medium truncate max-w-[150px]">
                          {item.summary?.fileName || `${item.type}_import.csv`}
                        </td>
                        <td className="py-3 px-4 text-gray-400 italic">
                          {item.summary?.errors ? "error_log.csv" : "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          Processed: {item.summary?.processed ?? 0} / Total: {item.summary?.total ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete record"
                            >
                              <i className="mgc_delete_2_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls Bar */}
        {totalRecords > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="font-medium text-gray-700 dark:text-gray-300">
              {totalRecords === 0 ? "0 - 0 of 0" : `${startIndex} - ${endIndex} of ${totalRecords}`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <i className="mgc_chevron_left_line text-base"></i>
              </button>
              <span className="px-2 font-bold text-gray-800 dark:text-gray-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <i className="mgc_chevron_right_line text-base"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTransferPage;
