import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IWebForm, IWebFormSubmission } from "@/interface";
import { WebFormPreview } from "./WebFormPreview";
import { usePermission } from "@/hooks/usePermission";
import { useWebFormStore } from "@/store";

const avatarColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
];

const WebFormsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.web_forms.create");
  const canEdit = hasPermission("settings.web_forms.edit");
  const canDelete = hasPermission("settings.web_forms.delete");
  const canView = hasPermission("settings.web_forms.view");

  const [webForms, setWebForms] = useState<IWebForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");
  const [previewForm, setPreviewForm] = useState<IWebForm | null>(null);

  // Submissions Modal State
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<IWebForm | null>(null);
  const [submissions, setSubmissions] = useState<IWebFormSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fetchWebForms = async () => {
    try {
      setLoading(true);
      const list = await useWebFormStore.getState().fetchWebforms();
      setWebForms(list || []);
    } catch {
      setWebForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebForms();
  }, []);

  const openSubmissionsModal = async (form?: IWebForm) => {
    try {
      setSelectedFormForSubmissions(form || null);
      setSubmissionsModalOpen(true);
      setLoadingSubmissions(true);
      const url = form ? `/web-forms/${form.id}/submissions` : "/web-forms/submissions";
      const list = await useWebFormStore.getState().fetchWebforms(url);
      setSubmissions((list as any) || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDelete = async (item: IWebForm) => {
    const res = await Swal.fire({
      title: "Delete Web Form?",
      text: `Are you sure you want to delete "${item.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await useWebFormStore.getState().deleteWebform(item.id);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        fetchWebForms();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || err.message || "Failed to delete",
        });
      }
    }
  };

  const typeCounts = useMemo(() => {
    const all = webForms.length;
    const leads = webForms.filter((w) => w.create_lead).length;
    const formOnly = webForms.filter((w) => !w.create_lead).length;
    return { all, leads, formOnly };
  }, [webForms]);

  const stats = useMemo(() => {
    const total = webForms.length;
    const leadGenerators = webForms.filter((w) => w.create_lead).length;
    const totalFields = webForms.reduce(
      (sum, w) => sum + (Array.isArray(w.attributes) ? w.attributes.length : 0),
      0
    );
    return { total, leadGenerators, totalFields };
  }, [webForms]);

  const filtered = useMemo(() => {
    let result = webForms;
    if (typeFilter === "leads") {
      result = result.filter((w) => w.create_lead);
    } else if (typeFilter === "formOnly") {
      result = result.filter((w) => !w.create_lead);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.form_id || "").toLowerCase().includes(q) ||
          (w.lead_pipeline_name || "").toLowerCase().includes(q) ||
          String(w.id).includes(q)
      );
    }
    return result;
  }, [webForms, typeFilter, search]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const startIndex = filtered.length === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, filtered.length);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      <PageBreadcrumb title="Web Forms" breadCrumbItems={["Settings", "Web Forms"]} />

      {/* Top Bar & Breadcrumb Navigation */}
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
            <span className="text-gray-700 dark:text-gray-300 font-normal">Web Forms</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Web Forms
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Embeddable lead capture forms and landing page widgets with automated CRM ingestion.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchWebForms}
            disabled={loading}
            title="Refresh Web Forms"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors disabled:opacity-60"
          >
            <i className={`mgc_refresh_2_line text-base ${loading ? "animate-spin" : ""}`}></i>
            <span>Refresh</span>
          </button>

          {canView && (
            <button
              onClick={() => openSubmissionsModal()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors"
            >
              <i className="mgc_list_check_3_line text-base"></i>
              <span>All Form Entries</span>
            </button>
          )}

          {canCreate && (
            <Link
              to="/settings/web-forms/create"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-xs transition-colors"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Web Form</span>
            </Link>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] dark:text-blue-400 flex items-center justify-center shrink-0 text-xl font-bold">
            <i className="mgc_layout_grid_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Forms
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_flag_2_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Lead Generators
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.leadGenerators}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_list_check_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Fields
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalFields}
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
              Web Forms Directory
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300">
              {filtered.length}
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
                placeholder="Search web forms..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                  title="Clear search"
                >
                  <i className="mgc_close_line text-sm"></i>
                </button>
              )}
            </div>
            {(search || typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-1 transition-colors shrink-0"
                title="Clear all filters"
              >
                <i className="mgc_refresh_3_line text-xs"></i>
                <span>Clear</span>
              </button>
            )}

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
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              typeFilter === "all"
                ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
            }`}
          >
            <span>All Forms</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                typeFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {typeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTypeFilter("leads");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              typeFilter === "leads"
                ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
            }`}
          >
            <span>Creates Lead</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                typeFilter === "leads"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {typeCounts.leads}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTypeFilter("formOnly");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              typeFilter === "formOnly"
                ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
            }`}
          >
            <span>Form Only</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                typeFilter === "formOnly"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {typeCounts.formOnly}
            </span>
          </button>
        </div>

        {/* Summary Header matching Leads */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "web form" : "web forms"}
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
              Show All Forms
            </button>
          )}
        </div>

        {/* CARDS VIEW (Matching Leads High-Density Compact Cards List) */}
        {viewMode === "cards" && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <i className="mgc_loading_3_line animate-spin text-base text-[#0088cc]"></i>
                <span>Loading web forms...</span>
              </div>
            ) : paginated.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] flex items-center justify-center mx-auto text-xl">
                  <i className="mgc_layout_grid_line"></i>
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">No Web Forms Found</p>
                <p className="text-xs text-gray-400">
                  {typeFilter !== "all"
                    ? "No forms match the selected filter."
                    : "Create embeddable web forms to capture leads directly from your website."}
                </p>
                {canCreate && (
                  <div className="pt-1">
                    <Link
                      to="/settings/web-forms/create"
                      className="text-xs font-bold text-[#0088cc] hover:underline"
                    >
                      Click here to create a web form
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                {paginated.map((item, idx) => {
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  const fieldCount = Array.isArray(item.attributes) ? item.attributes.length : 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2 group"
                    >
                      {/* Top Row: Initial Avatar + Title + Slug + Field Count Highlight */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}
                          >
                            WF
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight transition-colors">
                                {item.title}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-mono">
                              slug: {item.form_id || `form-${item.id}`}
                            </p>
                          </div>
                        </div>

                        {/* Right: Field count highlight like Deal Value in Leads */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-[#0088cc] dark:text-[#38bdf8] whitespace-nowrap">
                            {fieldCount}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">fields</p>
                        </div>
                      </div>

                      {/* Middle: Info Pills matching Leads */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.create_lead ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-bold">
                            <i className="mgc_flag_2_line text-[11px] text-emerald-500"></i>
                            <span>{item.lead_pipeline_name || "Creates Lead"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-750 dark:text-gray-300 border border-gray-200 dark:border-gray-600 text-[11px] font-medium">
                            <span>Form Only</span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs font-mono">
                          ID: #{item.id}
                        </span>
                      </div>

                      {/* Bottom Row: Actions matching Leads */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <i className="mgc_calendar_line text-xs"></i>
                            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "Active"}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => openSubmissionsModal(item)}
                              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="View Entries"
                              aria-label="View Entries"
                            >
                              <i className="mgc_inbox_line text-sm"></i>
                            </button>
                          )}
                          {canView && (
                            <button
                              type="button"
                              onClick={() => setPreviewForm(item)}
                              className="p-1 text-gray-400 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Preview & Embed"
                              aria-label="Preview & Embed"
                            >
                              <i className="mgc_eye_line text-sm"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/settings/web-forms/${item.id}/edit`}
                              className="p-1 text-gray-400 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors inline-block"
                              title="Edit Form"
                              aria-label="Edit Form"
                            >
                              <i className="mgc_edit_line text-sm"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Delete Form"
                              aria-label="Delete Form"
                            >
                              <i className="mgc_delete_line text-sm"></i>
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
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 text-xs uppercase font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Form ID (Slug)</th>
                    <th className="py-3 px-4">Lead Pipeline</th>
                    <th className="py-3 px-4">Fields</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mr-2"></div>
                        Loading web forms...
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-gray-500 font-medium text-sm">
                        No Web Forms Available.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{item.id}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{item.title}</td>
                        <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">{item.form_id}</td>
                        <td className="py-3 px-4">
                          {item.create_lead ? (
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium">
                              {item.lead_pipeline_name || "Creates Lead"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              Form Only
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {Array.isArray(item.attributes) ? item.attributes.length : 0} fields
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 sm:space-x-2">
                          {canView && (
                            <button
                              onClick={() => openSubmissionsModal(item)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="View Form Entries / Submissions"
                            >
                              <i className="mgc_inbox_line text-base"></i>
                            </button>
                          )}
                          {canView && (
                            <button
                              onClick={() => setPreviewForm(item)}
                              className="p-1.5 text-gray-400 hover:text-[#0088cc] rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Preview & Embed"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/settings/web-forms/${item.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-[#0088cc] rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 inline-block transition-colors"
                              title="Edit"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Delete"
                            >
                              <i className="mgc_delete_line text-base"></i>
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
        {filtered.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="per-page-select pl-2.5 pr-8 min-w-[5.25rem] py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="font-medium text-gray-700 dark:text-gray-300">
              {filtered.length === 0 ? "0 - 0 of 0" : `${startIndex} - ${endIndex} of ${filtered.length}`}
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

      {previewForm && (
        <WebFormPreview form={previewForm} onClose={() => setPreviewForm(null)} />
      )}

      {/* Submissions / Entries Modal */}
      {submissionsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSubmissionsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                  {selectedFormForSubmissions ? `Entries: ${selectedFormForSubmissions.title}` : "All Web Form Submissions"}
                </h3>
                <p className="text-xs text-gray-500">
                  Submissions also automatically create new records under{" "}
                  <Link to="/leads" className="text-[#0088cc] hover:underline font-semibold">
                    Leads
                  </Link>
                </p>
              </div>
              <button
                onClick={() => setSubmissionsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl font-bold transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold border-b dark:border-gray-700">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Form</th>
                    <th className="py-2.5 px-3">Submitted Payload</th>
                    <th className="py-2.5 px-3 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono">
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500 font-sans">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0088cc] border-t-transparent mr-2"></div>
                        Loading entries...
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 font-sans">No submissions recorded yet.</td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750">
                        <td className="py-2.5 px-3 text-gray-400">#{sub.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 font-sans">{sub.form_title || sub.form_id}</td>
                        <td className="py-2.5 px-3">
                          <pre className="text-[11px] bg-gray-50 dark:bg-gray-900/50 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {JSON.stringify(sub.data, null, 2)}
                          </pre>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 text-right font-sans whitespace-nowrap">
                          {sub.created_at ? new Date(sub.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSubmissionsModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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

export default WebFormsPage;
