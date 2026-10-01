import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import { ILead, ILeadStage } from "@/interface";
import { getRottenInfo } from "@/utils/rottenHelper";
import API from "@/config";
import { usePermission } from "@/hooks/usePermission";

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("leads.create");
  const canEdit = hasPermission("leads.edit");
  const canDelete = hasPermission("leads.delete");
  const canView = hasPermission("leads.view");
  const {
    leads, total, loading, fetchLeads,
    kanbanLeads, fetchKanbanLeads,
    pipelines, fetchPipelines,
    stages, fetchStages,
    deleteLead, updateLeadStage
  } = useLeadStore();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | "">("");
  const [search, setSearch] = useState<string>("");
  const [onlyRotten, setOnlyRotten] = useState<boolean>(false);
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Magic AI Configuration state
  const [isDocGenEnabled, setIsDocGenEnabled] = useState<boolean>(true);

  // Upload File Modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Filter Drawer & Options
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [personsList, setPersonsList] = useState<any[]>([]);
  const [sourcesList, setSourcesList] = useState<any[]>([]);
  const [typesList, setTypesList] = useState<any[]>([]);

  const [filterForm, setFilterForm] = useState({
    id: "",
    lead_value: "",
    user_id: "",
    person_id: "",
    lead_type_id: "",
    lead_source_id: "",
    tag: "",
    expected_close_date: "",
    created_at: "",
  });

  useEffect(() => {
    fetchPipelines();
    // Fetch configuration to check if Magic AI Doc Generation is enabled
    API.get("/configuration").then((res) => {
      if (res.data?.data) {
        const docGen = res.data.data["general.magic_ai.doc_generation.enabled"];
        if (docGen !== undefined) {
          setIsDocGenEnabled(String(docGen) === "1" || docGen === true);
        }
      }
    }).catch(() => { });

    // Fetch lists for filter dropdowns
    API.get("/users").then((res) => { if (res.data?.data) setUsersList(res.data.data); }).catch(() => { });
    API.get("/persons?limit=100").then((res) => { if (res.data?.data) setPersonsList(res.data.data); }).catch(() => { });
    API.get("/leads/sources").then((res) => { if (res.data?.data) setSourcesList(res.data.data); }).catch(() => { });
    API.get("/leads/types").then((res) => { if (res.data?.data) setTypesList(res.data.data); }).catch(() => { });
  }, []);

  useEffect(() => {
    if (pipelines.length > 0 && selectedPipelineId === "") {
      const defaultPipe = pipelines.find((p) => p.is_default) || pipelines[0];
      if (defaultPipe) {
        setSelectedPipelineId(defaultPipe.id);
      }
    }
  }, [pipelines]);

  useEffect(() => {
    if (selectedPipelineId !== "") {
      fetchStages(Number(selectedPipelineId));
      fetchKanbanLeads(Number(selectedPipelineId), search, filterForm);
      fetchLeads(page, perPage, search, filterForm);
    }
  }, [selectedPipelineId, viewMode, page, perPage]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === "kanban") {
      fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
    } else {
      setPage(1);
      fetchLeads(1, perPage, search, filterForm);
    }
  };

  const handleApplyAdvancedFilters = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === "kanban") {
      fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
    } else {
      setPage(1);
      fetchLeads(1, perPage, search, filterForm);
    }
    setShowFilterDrawer(false);
  };

  const handleResetFilters = () => {
    const emptyForm = {
      id: "",
      lead_value: "",
      user_id: "",
      person_id: "",
      lead_type_id: "",
      lead_source_id: "",
      tag: "",
      expected_close_date: "",
      created_at: "",
    };
    setFilterForm(emptyForm);
    setSearch("");
    if (viewMode === "kanban") {
      fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, "", emptyForm);
    } else {
      setPage(1);
      fetchLeads(1, perPage, "", emptyForm);
    }
  };


  const handleDelete = async (lead: ILead) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete lead "${lead.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteLead(lead.id);
        if (viewMode === "kanban") {
          fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search);
        } else {
          fetchLeads(page, perPage, search);
        }
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to delete lead", "error");
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      Swal.fire("Warning", "Please select a file to upload", "warning");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await API.post("/leads/create-by-ai", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const msg = response.data?.message || `Lead created from "${uploadFile.name}"`;
      Swal.fire("Success", msg, "success");
      setShowUploadModal(false);
      setUploadFile(null);
      if (viewMode === "kanban") {
        fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search);
      } else {
        fetchLeads(page, perPage, search);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to upload file. Please try again.";
      Swal.fire("Error", msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "LD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const avatarColors = [
    "bg-[#6c8ebf] text-white",
    "bg-[#e6b93d] text-white",
    "bg-[#82b366] text-white",
    "bg-[#d6a4c7] text-white",
    "bg-[#5cb8b2] text-white",
    "bg-[#f0a070] text-white",
    "bg-[#7e6ca8] text-white",
    "bg-[#b5c4d1] text-gray-800",
  ];

  const currentPipeline = pipelines.find((p) => Number(p.id) === Number(selectedPipelineId)) || pipelines[0];

  const totalRottenInKanban = kanbanLeads.filter((l) => getRottenInfo(l, currentPipeline).isRotten).length;
  const totalRottenInTable = leads.filter((l) => getRottenInfo(l, currentPipeline).isRotten).length;

  const displayKanbanLeads = onlyRotten
    ? kanbanLeads.filter((l) => getRottenInfo(l, currentPipeline).isRotten)
    : kanbanLeads;

  const displayLeads = onlyRotten
    ? leads.filter((l) => getRottenInfo(l, currentPipeline).isRotten)
    : leads;

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Dashboard / Leads</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Leads</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Upload File button (Conditional upon Magic AI / DOC Generation setting) */}
          {isDocGenEnabled && canCreate && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 border border-[#0088cc] text-[#0088cc] hover:bg-[#e0f2fe] dark:hover:bg-gray-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <i className="mgc_upload_line text-base"></i>
              Upload File
            </button>
          )}

          {canCreate && (
            <Link
              to="/leads/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              + Create Lead
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar & Pipeline Selector & View Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleFilter} className="flex items-center gap-2 flex-1 min-w-[220px] max-w-lg">
          <input
            type="text"
            placeholder="Search leads or persons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
          />
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-sm rounded-lg border border-gray-300 dark:border-gray-600 whitespace-nowrap transition-colors"
          >
            <i className="mgc_filter_line text-base"></i>
            Filter
          </button>
        </form>

        <div className="flex items-center gap-3">
          {/* Rotten Leads Quick Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyRotten(!onlyRotten)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${onlyRotten
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            title={`Show only rotten/stale leads exceeding pipeline limit (${currentPipeline?.rotten_days || 30} days)`}
          >
            <span>🍅</span>
            <span>Rotten Leads</span>
            {(viewMode === "kanban" ? totalRottenInKanban : totalRottenInTable) > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${onlyRotten ? "bg-white text-rose-700" : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                }`}>
                {viewMode === "kanban" ? totalRottenInKanban : totalRottenInTable}
              </span>
            )}
          </button>

          {/* Pipeline Selector */}
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(Number(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc] text-gray-700 dark:text-gray-200"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* View Toggle Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${viewMode === "kanban"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              <i className="mgc_layout_grid_line text-base"></i>
              <span className="hidden sm:inline text-xs">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table Grid View"
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${viewMode === "table"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              <i className="mgc_list_check_line text-base"></i>
              <span className="hidden sm:inline text-xs">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max items-start">
            {(() => {
              const validStageIds = new Set(stages.map((s) => s.id));
              return stages.map((stage, idx) => {
                const stageLeads = displayKanbanLeads.filter(
                  (l) => l.lead_pipeline_stage_id === stage.id || (idx === 0 && (!l.lead_pipeline_stage_id || !validStageIds.has(l.lead_pipeline_stage_id)))
                );
                const stageValueTotal = stageLeads.reduce((acc, l) => acc + Number(l.lead_value || 0), 0);
                const colorClass = avatarColors[idx % avatarColors.length];

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const leadIdStr = e.dataTransfer.getData("text/plain");
                    if (!leadIdStr) return;
                    const leadId = Number(leadIdStr);
                    await updateLeadStage(leadId, stage.id, true);
                    fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search);
                  }}
                  className="w-80 flex-shrink-0 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-3.5 space-y-3 transition-colors hover:border-[#0088cc]/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1.5">
                        {stage.name}
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">({stageLeads.length})</span>
                      </h3>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                        ${stageValueTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {canCreate && (
                      <Link
                        to={`/leads/create?lead_pipeline_stage_id=${stage.id}&lead_pipeline_id=${selectedPipelineId || stage.lead_pipeline_id || ""}`}
                        className="p-1 text-gray-400 hover:text-[#0088cc] hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                        title={`Quick add lead to ${stage.name}`}
                      >
                        <i className="mgc_add_line text-lg"></i>
                      </Link>
                    )}
                  </div>

                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0088cc] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (stageLeads.length / Math.max(1, kanbanLeads.length)) * 100 * 2)}%` }}
                    ></div>
                  </div>

                  <div className="space-y-3 min-h-[120px]">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0088cc] border-t-transparent"></div>
                      </div>
                    ) : stageLeads.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                        <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300">
                          <svg className="w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">
                            {onlyRotten ? "No Rotten Leads" : "Your Leads List is Empty"}
                          </h4>
                          <p className="text-[11px] text-gray-400 leading-tight">
                            {onlyRotten ? "No leads have exceeded rotten days limit." : "Create a lead to organize your goals."}
                          </p>
                        </div>
                        {!onlyRotten && canCreate && (
                          <Link
                            to={`/leads/create?lead_pipeline_stage_id=${stage.id}&lead_pipeline_id=${selectedPipelineId || stage.lead_pipeline_id || ""}`}
                            className="px-3 py-1.5 border-2 border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc] hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm inline-block"
                          >
                            Create Lead
                          </Link>
                        )}
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", String(lead.id));
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="group bg-gray-50 dark:bg-gray-900 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow-md hover:border-[#0088cc]/40 transition-all cursor-grab active:cursor-grabbing space-y-2.5"
                        >
                          {/* ROW 1: Avatar + Person + Company + alert icon */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Solid color avatar */}
                              <span className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${colorClass}`}>
                                {getInitials(lead.person_name || lead.title)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate leading-tight">
                                  {lead.person_name || "No Person"}
                                </p>
                                {/* Company name in teal/blue like the screenshot */}
                                <p className="text-[11px] text-[#0088cc] dark:text-[#4ab8f5] truncate leading-tight font-medium">
                                  {(lead as any).organization_name || (lead as any).company_name || "\u00a0"}
                                </p>
                              </div>
                            </div>
                            {/* Alert triangle (always visible) + edit/delete on hover */}
                            <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                              <span className="text-red-400 opacity-70" title="Lead Alert">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center ml-1">
                                <Link to={`/leads/edit/${lead.id}`} className="p-0.5 text-gray-400 hover:text-[#0088cc]" title="Edit">
                                  <i className="mgc_edit_line text-xs"></i>
                                </Link>
                                <button onClick={() => handleDelete(lead)} className="p-0.5 text-gray-400 hover:text-red-500" title="Delete">
                                  <i className="mgc_delete_line text-xs"></i>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ROW 2: Lead title */}
                          <Link
                            to={`/leads/view/${lead.id}`}
                            className="block text-[12.5px] font-medium text-gray-800 dark:text-gray-200 hover:text-[#0088cc] line-clamp-2 leading-snug"
                          >
                            {lead.title}
                          </Link>

                          {/* ROW 3: User icon+name pill  +  value pill — matching screenshot */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-sm">
                              <i className="mgc_user_3_line text-[11px] text-gray-400"></i>
                              {lead.user_name || "Unassigned"}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] font-semibold text-gray-700 dark:text-gray-200 shadow-sm">
                              ${Number(lead.lead_value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* ROW 4: Source + Type — gray rounded pills */}
                          {(lead.source_name || lead.type_name) && (
                            <div className="flex flex-wrap gap-1.5">
                              {lead.source_name && (
                                <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-sm">
                                  {lead.source_name}
                                </span>
                              )}
                              {lead.type_name && (
                                <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-sm">
                                  {lead.type_name}
                                </span>
                              )}
                            </div>
                          )}

                          {/* ROW 5: Tag chips — colored border + text, white/transparent bg like screenshot */}
                          {Array.isArray((lead.custom_attributes as any)?.tags) && (lead.custom_attributes as any).tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {((lead.custom_attributes as any).tags as string[]).slice(0, 4).map((tag: string, ti: number) => {
                                const tagStyles = [
                                  "border-orange-400 text-orange-600 dark:text-orange-400",
                                  "border-red-400 text-red-600 dark:text-red-400",
                                  "border-blue-400 text-blue-600 dark:text-blue-400",
                                  "border-yellow-500 text-yellow-600 dark:text-yellow-400",
                                  "border-purple-400 text-purple-600 dark:text-purple-400",
                                  "border-green-500 text-green-600 dark:text-green-400",
                                ];
                                return (
                                  <span
                                    key={ti}
                                    className={`px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border font-medium text-[11px] ${tagStyles[ti % tagStyles.length]}`}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* ROW 6: Expected close date + Status */}
                          {(lead.expected_close_date || lead.status !== undefined) && (
                            <div className="flex items-center gap-2 pt-1.5 border-t border-gray-200 dark:border-gray-700/50 text-[10px]">
                              {lead.expected_close_date && (
                                <span className="flex items-center gap-1 text-gray-400">
                                  <i className="mgc_calendar_line text-[11px]"></i>
                                  {new Date(lead.expected_close_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              )}
                              {lead.status !== undefined && (
                                <span className={`ml-auto px-2 py-0.5 rounded-full font-semibold text-[10px] ${lead.status ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400"}`}>
                                  {lead.status ? "Open" : "Lost"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        </div>
      )}


      {/* TABLE GRID VIEW */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                    </td>
                  </tr>
                ) : displayLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                      {onlyRotten ? "No Rotten Leads Found." : "No Records Available."}
                    </td>
                  </tr>
                ) : (
                  displayLeads.map((lead) => {
                    const rottenInfo = getRottenInfo(lead, currentPipeline);
                    return (
                      <tr key={lead.id} className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 ${rottenInfo.isRotten ? "bg-rose-50/20 dark:bg-rose-950/10" : ""}`}>
                        <td className="py-3 px-4 font-medium text-[#0088cc]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/leads/view/${lead.id}`} className="hover:underline font-bold">
                              {lead.title}
                            </Link>
                            {rottenInfo.isRotten && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200">
                                🍅 Rotten ({rottenInfo.daysIdle}d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${lead.status ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                            {lead.status ? "Open" : "Lost / Closed"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                          ${Number(lead.lead_value || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{lead.person_name || "-"}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{lead.source_name || "-"}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{lead.stage_name || "-"}</td>
                        <td className="py-3 px-4 text-gray-500">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {canView && (
                            <Link to={`/leads/view/${lead.id}`} className="text-gray-500 hover:text-[#0088cc] p-1 inline-block" title="View Lead Process">
                              <i className="mgc_eye_line text-base"></i>
                            </Link>
                          )}
                          {canEdit && (
                            <Link to={`/leads/edit/${lead.id}`} className="text-gray-500 hover:text-[#0088cc] p-1 inline-block" title="Edit Lead">
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(lead)} className="text-gray-500 hover:text-red-600 p-1 inline-block" title="Delete Lead">
                              <i className="mgc_delete_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > perPage && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>{`${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total}`}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">{page} / {Math.ceil(total / perPage)}</span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                  disabled={page >= Math.ceil(total / perPage)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPLOAD FILE MODAL (MAGIC AI / DOCUMENT LEAD CREATION) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create Lead Using AI File Upload</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">File Upload *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#e0f2fe] file:text-[#0284c7] hover:file:bg-[#bae6fd]"
                />
                <p className="text-[11px] text-gray-400 mt-2">Only pdf, doc, bmp, jpeg, jpg, png format files are accepted.</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload & Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD FILTERS DRAWER / MODAL (MATCHING KRAYIN CRM DOC) */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 h-full w-full max-w-md shadow-2xl border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between space-y-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <i className="mgc_filter_line text-[#0088cc]"></i>
                  Filters in Leads
                </h3>
                <button onClick={() => setShowFilterDrawer(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>

              <form onSubmit={handleApplyAdvancedFilters} className="space-y-4">
                {/* 1. ID */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">ID</label>
                  <input
                    type="number"
                    placeholder="Search by Lead ID"
                    value={filterForm.id}
                    onChange={(e) => setFilterForm({ ...filterForm, id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                {/* 2. Lead Value */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Lead Value</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Min / Exact Lead Value"
                    value={filterForm.lead_value}
                    onChange={(e) => setFilterForm({ ...filterForm, lead_value: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                {/* 3. Sales Person */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Sales Person</label>
                  <select
                    value={filterForm.user_id}
                    onChange={(e) => setFilterForm({ ...filterForm, user_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Select Sales Person</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* 4. Contact Person */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Contact Person</label>
                  <select
                    value={filterForm.person_id}
                    onChange={(e) => setFilterForm({ ...filterForm, person_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Select Contact Person</option>
                    {personsList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Lead Type */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Lead Type</label>
                  <select
                    value={filterForm.lead_type_id}
                    onChange={(e) => setFilterForm({ ...filterForm, lead_type_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Select Lead Type</option>
                    {typesList.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Source */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Source</label>
                  <select
                    value={filterForm.lead_source_id}
                    onChange={(e) => setFilterForm({ ...filterForm, lead_source_id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">Select Source</option>
                    {sourcesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* 7. Tags */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Tags</label>
                  <input
                    type="text"
                    placeholder="Filter by tag..."
                    value={filterForm.tag}
                    onChange={(e) => setFilterForm({ ...filterForm, tag: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                {/* 8. Expected Close Date */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Expected Close Date</label>
                  <input
                    type="date"
                    value={filterForm.expected_close_date}
                    onChange={(e) => setFilterForm({ ...filterForm, expected_close_date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                {/* 9. Created At */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Created At</label>
                  <input
                    type="date"
                    value={filterForm.created_at}
                    onChange={(e) => setFilterForm({ ...filterForm, created_at: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 text-center"
                  >
                    Clear All
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold text-center"
                  >
                    Apply Filters
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
