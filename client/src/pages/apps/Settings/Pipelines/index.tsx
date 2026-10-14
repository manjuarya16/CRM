import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { usePipelineStore } from "@/store";
import { IPipeline } from "@/interface";
import { usePermission } from "@/hooks/usePermission";

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

const getInitials = (name?: string, fallback = "PL") => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const PipelinesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.pipelines.create");
  const canEdit = hasPermission("settings.pipelines.edit");
  const canDelete = hasPermission("settings.pipelines.delete");
  const canView = hasPermission("settings.pipelines.view");

  const [pipelines, setPipelines] = useState<IPipeline[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const list = await usePipelineStore.getState().fetchPipelines();
      setPipelines(list || []);
    } catch {
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (pipeline: IPipeline) => {
    if (pipeline.is_default) {
      Swal.fire("Action Blocked", "Default pipeline cannot be deleted.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Delete pipeline "${pipeline.name}"? Leads will be migrated to the default pipeline.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await usePipelineStore.getState().deletePipeline(pipeline.id);
          setSelectedIds((prev) => prev.filter((item) => item !== pipeline.id));
          Swal.fire("Deleted!", "Pipeline has been deleted.", "success");
          fetchPipelines();
        } catch (err: any) {
          Swal.fire(
            "Error",
            err?.response?.data?.message || "Failed to delete pipeline",
            "error"
          );
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    const nonDefaultSelected = selectedIds.filter((id) => {
      const p = pipelines.find((x) => x.id === id);
      return p && !p.is_default;
    });

    if (nonDefaultSelected.length === 0) {
      Swal.fire("Action Blocked", "Selected pipelines cannot be deleted as they are defaults.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${nonDefaultSelected.length} selected pipeline(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(nonDefaultSelected.map((id) => usePipelineStore.getState().deletePipeline(id)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${nonDefaultSelected.length} pipeline(s) deleted successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchPipelines();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete pipelines", "error");
      }
    }
  };

  const handleExport = () => {
    if (filteredPipelines.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }
    const headers = ["ID", "Name", "Stages", "Rotten Days", "Default"];
    const rows = filteredPipelines.map((p) => {
      const stageNames = Array.isArray(p.stages) ? p.stages.map((s: any) => s.name || s).join("; ") : "";
      return [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${stageNames.replace(/"/g, '""')}"`,
        p.rotten_days || 0,
        p.is_default ? "Yes" : "No",
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pipelines_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and pagination
  const filteredPipelines = useMemo(() => {
    if (!search.trim()) return pipelines;
    const q = search.toLowerCase();
    return pipelines.filter(
      (p) =>
        String(p.id).includes(q) ||
        (p.name && p.name.toLowerCase().includes(q))
    );
  }, [pipelines, search]);

  const total = filteredPipelines.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginatedPipelines = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredPipelines.slice(start, start + perPage);
  }, [filteredPipelines, page, perPage]);

  const isAllSelected = paginatedPipelines.length > 0 && paginatedPipelines.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedPipelines.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;

  // Responsive Full-Detail Pipeline Card (Person-like card design)
  const renderPipelineCard = (pipeline: IPipeline, idx: number) => {
    const isSelected = selectedIds.includes(pipeline.id);
    const avatarColor = AVATAR_COLORS[(pipeline.id || idx) % AVATAR_COLORS.length];
    const stagesList = Array.isArray(pipeline.stages) ? pipeline.stages : [];

    return (
      <div
        key={pipeline.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(pipeline.id)}
              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
            />
            <Link
              to={`/settings/pipelines/edit/${pipeline.id}`}
              className="flex items-start gap-2.5 min-w-0 flex-1 group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(pipeline.name, "PL")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                    {pipeline.name}
                  </p>
                  {pipeline.is_default && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                      DEFAULT
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Deal & Lead Pipeline
                </p>
              </div>
            </Link>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #PIP-{pipeline.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Stages Flow & Rotten Days */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* Stages Progression Pills */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Stages ({stagesList.length})
            </div>
            {stagesList.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {stagesList.map((st: any, sIdx: number) => (
                  <span
                    key={sIdx}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-600 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0088cc]"></span>
                    <span>{st.name || st}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 italic text-xs">No stages configured</span>
            )}
          </div>

          {/* Rotten Days & ID */}
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs pt-1">
            <span className="flex items-center gap-1.5">
              <i className="mgc_time_line text-xs text-gray-400"></i>
              <span>Rotten: <strong>{pipeline.rotten_days ? `${pipeline.rotten_days} days` : "Disabled"}</strong></span>
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              ID: {pipeline.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Stages Count Pill + Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
            <i className="mgc_git_commit_line text-xs shrink-0"></i>
            <span>{stagesList.length} Stages</span>
          </span>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canEdit && (
              <Link
                to={`/settings/pipelines/edit/${pipeline.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Pipeline"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && !pipeline.is_default && (
              <button
                type="button"
                onClick={() => handleDelete(pipeline)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Pipeline"
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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Pipelines</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Pipelines
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage sales deal stages, probabilities, and rotting periods
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          {selectedIds.length > 0 && canDelete && (
            <button
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
              to="/settings/pipelines/create"
              className="h-8 px-3 sm:px-3.5 inline-flex items-center justify-center gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors active:scale-98 shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Create Pipeline</span>
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
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search pipelines..."
              className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-48 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
            />
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
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Previous Page"
              >
                <i className="mgc_left_line text-base"></i>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
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
            Showing <strong className="text-gray-800 dark:text-gray-200">{paginatedPipelines.length}</strong> {paginatedPipelines.length === 1 ? "pipeline" : "pipelines"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading pipelines...</p>
          </div>
        ) : paginatedPipelines.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedPipelines.map((pipeline, idx) => renderPipelineCard(pipeline, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW (With Mobile Cards Fallback) */
          <>
            <div className="block md:hidden p-3 space-y-3">
              {paginatedPipelines.map((pipeline, idx) => renderPipelineCard(pipeline, idx))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold w-16">ID</th>
                    <th className="py-3 px-4 font-semibold">Pipeline Name</th>
                    <th className="py-3 px-4 font-semibold">Stages</th>
                    <th className="py-3 px-4 font-semibold text-center">Rotten Days</th>
                    <th className="py-3 px-4 font-semibold text-center">Default</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginatedPipelines.map((pipeline, idx) => {
                    const isSelected = selectedIds.includes(pipeline.id);
                    const avatarColor = AVATAR_COLORS[(pipeline.id || idx) % AVATAR_COLORS.length];
                    const stagesList = Array.isArray(pipeline.stages) ? pipeline.stages : [];

                    return (
                      <tr
                        key={pipeline.id}
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(pipeline.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0088cc] dark:text-[#38bdf8] font-bold">
                          #{pipeline.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(pipeline.name, "PL")}
                            </span>
                            <Link
                              to={`/settings/pipelines/edit/${pipeline.id}`}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-[#0088cc] dark:hover:text-[#38bdf8] hover:underline"
                            >
                              {pipeline.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {stagesList.slice(0, 4).map((st: any, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                              >
                                {st.name || st}
                              </span>
                            ))}
                            {stagesList.length > 4 && (
                              <span className="text-[11px] text-gray-400 font-semibold self-center">
                                +{stagesList.length - 4} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {pipeline.rotten_days ? `${pipeline.rotten_days}d` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {pipeline.is_default ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              DEFAULT
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {canEdit && (
                            <Link
                              to={`/settings/pipelines/edit/${pipeline.id}`}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="Edit Pipeline"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && !pipeline.is_default && (
                            <button
                              type="button"
                              onClick={() => handleDelete(pipeline)}
                              className="text-gray-500 hover:text-red-600 p-1 inline-block transition-colors"
                              title="Delete Pipeline"
                            >
                              <i className="mgc_delete_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <span>
              {startIndex} – {endIndex} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
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

export default PipelinesPage;
