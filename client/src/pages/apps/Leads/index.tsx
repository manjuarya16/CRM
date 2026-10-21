import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import { ILead, ILeadStage } from "@/interface";
import { getRottenInfo } from "@/utils/rottenHelper";
import API from "@/config";
import { usePermission } from "@/hooks/usePermission";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { realtimeService } from "@/services/realtimeService";
import { VoiceLeadModal } from "@/components/VoiceLeadModal";

interface LeadStageDropdownProps {
  currentStageId: number;
  stages: ILeadStage[];
  onSelectStage: (newStageId: number) => Promise<void> | void;
  stageColors: string[];
}

const LeadStageDropdown: React.FC<LeadStageDropdownProps> = ({
  currentStageId,
  stages,
  onSelectStage,
  stageColors,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStage = stages.find((s) => s.id === currentStageId) || stages[0];
  const stageIdx = stages.findIndex((s) => s.id === currentStageId);
  const stageColorClass = stageColors[(stageIdx >= 0 ? stageIdx : 0) % stageColors.length];

  useEffect(() => {
    if (!isOpen) return;
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 220);
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-0.5 rounded-full font-bold text-[10px] sm:text-[11px] border transition-all active:scale-95 shadow-sm cursor-pointer select-none ${stageColorClass}`}
        title="Tap to change stage"
      >
        <span>{currentStage?.name || "Stage"}</span>
        <i className={`mgc_down_line text-[10px] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}></i>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in duration-150`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/60 mb-0.5">
            Move to Stage
          </div>
          <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5">
            {stages.map((st, idx) => {
              const isSelected = st.id === currentStageId;
              const dotColor = stageColors[idx % stageColors.length];
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                    if (st.id !== currentStageId) {
                      await onSelectStage(st.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-[#e0f2fe] text-[#0088cc] dark:bg-sky-950/60 dark:text-sky-300 font-bold"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 border ${dotColor}`}></span>
                    <span className="truncate">{st.name}</span>
                  </span>
                  {isSelected && <i className="mgc_check_line text-sm text-[#0088cc] shrink-0 font-bold"></i>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

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
    deleteLead, deleteBulkLeads, updateLeadStage
  } = useLeadStore();

  const { viewMode, setViewMode, setHasUserToggled } = useResponsiveViewMode<"kanban" | "table">(768, "kanban", "kanban");
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | "">("");
  const [search, setSearch] = useState<string>("");
  const [onlyRotten, setOnlyRotten] = useState<boolean>(false);
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [mobileActiveStageId, setMobileActiveStageId] = useState<number | "all">("all");
  const [mobileKanbanLayout, setMobileKanbanLayout] = useState<"list" | "board">("list");

  // Dynamic Kanban Board container height to stretch cleanly to the end of the screen
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardHeight, setBoardHeight] = useState<string>("calc(100vh - 200px)");

  // Auto-calculate Kanban Board container height to stretch to the end of the screen
  useEffect(() => {
    if (viewMode !== "kanban") return;

    const calculateHeight = () => {
      if (boardContainerRef.current) {
        const rect = boardContainerRef.current.getBoundingClientRect();
        const footerEl = document.querySelector("footer");
        const footerHeight = footerEl ? footerEl.getBoundingClientRect().height : 0;
        // Extend completely to the bottom edge of the viewport / screen
        const available = window.innerHeight - rect.top - footerHeight;
        setBoardHeight(`${Math.max(380, Math.floor(available))}px`);
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    const timer = setTimeout(calculateHeight, 150);

    return () => {
      window.removeEventListener("resize", calculateHeight);
      clearTimeout(timer);
    };
  }, [viewMode, selectedPipelineId, search, onlyRotten, mobileKanbanLayout, stages.length, kanbanLeads.length]);

  // Magic AI Configuration state
  const [isDocGenEnabled, setIsDocGenEnabled] = useState<boolean>(true);

  // Voice Lead Modal
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);

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
  const [filterStages, setFilterStages] = useState<any[]>([]);

  const [filterForm, setFilterForm] = useState({
    id: "",
    lead_value: "",
    user_id: "",
    person_id: "",
    lead_pipeline_id: "",
    lead_pipeline_stage_id: "",
    lead_type_id: "",
    lead_source_id: "",
    tag: "",
    expected_close_date: "",
    created_at: "",
  });

  useEffect(() => {
    if (filterForm.lead_pipeline_id) {
      API.get(`/leads/pipeline-stages?pipeline_id=${filterForm.lead_pipeline_id}`)
        .then((res) => { if (res.data?.data) setFilterStages(res.data.data); })
        .catch(() => setFilterStages([]));
    } else {
      setFilterStages([]);
    }
  }, [filterForm.lead_pipeline_id]);

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
    API.get("/users?limit=200&per_page=200").then((res) => { if (res.data?.data) setUsersList(res.data.data); }).catch(() => { });
    API.get("/persons?limit=500&per_page=500").then((res) => {
      if (res.data?.data) {
        const sorted = (res.data.data || []).sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setPersonsList(sorted);
      }
    }).catch(() => { });
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

  // Real-time Push via SSE + Tab Focus sync (Zero continuous polling)
  useEffect(() => {
    // 1. Listen to real-time SSE push events (fires instantly <1s when lead is created/updated from email)
    const cleanupRealtime = realtimeService.onLeadChange(() => {
      if (selectedPipelineId !== "") {
        if (viewMode === "kanban") {
          fetchKanbanLeads(Number(selectedPipelineId), search, filterForm);
        } else {
          fetchLeads(page, perPage, search, filterForm);
        }
      }
    });

    // 2. Sync once when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && selectedPipelineId !== "") {
        if (viewMode === "kanban") {
          fetchKanbanLeads(Number(selectedPipelineId), search, filterForm);
        } else {
          fetchLeads(page, perPage, search, filterForm);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanupRealtime();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedPipelineId, viewMode, page, perPage, search, filterForm, fetchKanbanLeads, fetchLeads]);

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
      lead_pipeline_id: "",
      lead_pipeline_stage_id: "",
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, currentLeads: ILead[]) => {
    if (e.target.checked) {
      setSelectedLeadIds(currentLeads.map((l) => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    const result = await Swal.fire({
      title: "Bulk Delete Leads",
      text: `Are you sure you want to delete ${selectedLeadIds.length} selected lead(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#64748b",
      confirmButtonText: `Yes, delete ${selectedLeadIds.length} lead(s)`,
    });

    if (result.isConfirmed) {
      try {
        await deleteBulkLeads(selectedLeadIds);
        setSelectedLeadIds([]);
        if (viewMode === "kanban") {
          fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
        } else {
          fetchLeads(page, perPage, search, filterForm);
        }
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to bulk delete leads", "error");
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

  const stageColors = [
    "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 border-blue-300",
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300",
    "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 border-purple-300",
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300",
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 border-indigo-300",
    "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200 border-sky-300",
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

  const activeFilterCount = Object.values(filterForm).filter((val) => Boolean(val)).length;

  const displayMobileLeads = mobileActiveStageId === "all"
    ? displayKanbanLeads
    : displayKanbanLeads.filter((l) => l.lead_pipeline_stage_id === mobileActiveStageId);

  return (
    <div className={`p-1 sm:p-4 lg:p-6 ${viewMode === "kanban" ? "space-y-3 pb-0 -mb-3 sm:-mb-4 md:-mb-6" : "space-y-4 sm:space-y-6"}`}>
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-300 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">Leads</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Leads
          </h1>
        </div>

        <div className="flex items-center gap-x-2.5">
          {/* Voice Lead button */}
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#0e90d9] text-[#0e90d9] hover:bg-[#e0f2fe] dark:hover:bg-gray-700 text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
              title="Create Lead using Voice Assistant"
            >
              <i className="mgc_mic_line text-sm text-[#0e90d9]"></i>
              <span>Voice Lead</span>
            </button>
          )}

          {/* Upload File button */}
          {isDocGenEnabled && canCreate && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#0e90d9] text-[#0e90d9] hover:bg-[#e0f2fe] dark:hover:bg-gray-700 text-xs sm:text-sm font-semibold rounded-md shadow-2xs transition-colors"
            >
              <i className="mgc_upload_line text-sm"></i>
              <span>Upload File</span>
            </button>
          )}

          {canCreate && (
            <Link
              to="/leads/create"
              className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Create Lead
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar & Pipeline Selector & View Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <form onSubmit={handleFilter} className="flex items-center gap-2 w-full lg:w-auto flex-1 min-w-0 max-w-xl">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search leads or persons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  if (viewMode === "kanban") {
                    fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, "", filterForm);
                  } else {
                    setPage(1);
                    fetchLeads(1, perPage, "", filterForm);
                  }
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilterDrawer(true)}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold text-xs sm:text-sm rounded-lg border whitespace-nowrap transition-colors shrink-0 ${
              activeFilterCount > 0
                ? "bg-[#e0f2fe] text-[#0088cc] border-[#0088cc] dark:bg-sky-950/40 dark:text-sky-300"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
            }`}
          >
            <i className="mgc_filter_line text-base"></i>
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#0088cc] text-white text-[10px] font-extrabold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {(activeFilterCount > 0 || search) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-red-500 hover:text-red-700 font-semibold underline px-1 shrink-0 whitespace-nowrap"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Rotten Leads Quick Filter Toggle */}
          <button
            type="button"
            onClick={() => setOnlyRotten(!onlyRotten)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${onlyRotten
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
            title={`Show only rotten/stale leads exceeding pipeline limit (${currentPipeline?.rotten_days || 30} days)`}
          >
            <span>🍅</span>
            <span>Rotten</span>
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
            className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc] text-gray-700 dark:text-gray-200 flex-1 sm:flex-none min-w-[130px] max-w-full sm:max-w-[190px] truncate"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* View Toggle Buttons */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setHasUserToggled(true);
                setViewMode("kanban");
              }}
              title="Cards View"
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${viewMode === "kanban"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              <i className="mgc_grid_2_line text-base"></i>
              <span className="hidden sm:inline text-xs font-bold">Cards</span>
            </button>
            <button
              onClick={() => {
                setHasUserToggled(true);
                setViewMode("table");
              }}
              title="Table View"
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${viewMode === "table"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
            >
              <i className="mgc_table_line text-base"></i>
              <span className="hidden sm:inline text-xs font-bold">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN / CARDS VIEW */}
      {viewMode === "kanban" && (
        <>
          {/* MOBILE RESPONSIVE VIEW (Shown on < md) */}
          <div className="block md:hidden space-y-3">
            {/* View Switcher on mobile: Stage Tabs List vs Full Horizontal Board */}
            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-900/60 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 pl-2">
                Mobile View:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMobileKanbanLayout("list")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    mobileKanbanLayout === "list"
                      ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  <i className="mgc_list_check_line text-sm"></i>
                  <span>Compact List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileKanbanLayout("board")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    mobileKanbanLayout === "board"
                      ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-sm"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  <i className="mgc_layout_grid_line text-sm"></i>
                  <span>Columns Board</span>
                </button>
              </div>
            </div>

            {mobileKanbanLayout === "list" && (
              <>
                {/* Scrollable Stage Pills on Mobile */}
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
                    onClick={() => setMobileActiveStageId("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                      mobileActiveStageId === "all"
                        ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
                    }`}
                  >
                    <span>All</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${mobileActiveStageId === "all" ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                      {displayKanbanLeads.length}
                    </span>
                  </button>
                  {stages.map((stage) => {
                    const count = displayKanbanLeads.filter((l) => l.lead_pipeline_stage_id === stage.id).length;
                    const isActive = mobileActiveStageId === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setMobileActiveStageId(stage.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
                        }`}
                      >
                        <span>{stage.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Summary header */}
                <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Showing <strong className="text-gray-800 dark:text-gray-200">{displayMobileLeads.length}</strong> {displayMobileLeads.length === 1 ? "lead" : "leads"}
                  </span>
                  {mobileActiveStageId !== "all" && (
                    <button
                      type="button"
                      onClick={() => setMobileActiveStageId("all")}
                      className="text-xs text-[#0088cc] hover:underline font-semibold"
                    >
                      Show All Stages
                    </button>
                  )}
                </div>

                {/* Mobile High-Density Compact Cards List */}
                <div className="space-y-2">
                  {displayMobileLeads.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        {onlyRotten ? "No Rotten Leads Found" : "No Leads in this Stage"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {onlyRotten ? "No leads have exceeded rotten limit." : "Try switching stage or create a new lead."}
                      </p>
                    </div>
                  ) : (
                    displayMobileLeads.map((lead) => {
                      const stageIdx = stages.findIndex((s) => s.id === lead.lead_pipeline_stage_id);
                      const stageColorClass = stageColors[(stageIdx >= 0 ? stageIdx : 0) % stageColors.length];
                      const avatarColor = avatarColors[(lead.id || 0) % avatarColors.length];
                      const rottenInfo = getRottenInfo(lead, currentPipeline);

                      return (
                        <div
                          key={lead.id}
                          className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2"
                        >
                          {/* Top Row: Initial Avatar + Title + Company + Value */}
                          <div className="flex items-start justify-between gap-2.5">
                            <Link to={`/leads/view/${lead.id}`} className="flex items-start gap-2.5 min-w-0 flex-1 group">
                              <span className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}>
                                {getInitials(lead.title || lead.person_name)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight">
                                    {lead.title}
                                  </p>
                                  {rottenInfo.isRotten && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold shrink-0">
                                      🍅 {rottenInfo.daysIdle}d
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {lead.person_name ? (
                                    <>
                                      <span className="text-gray-700 dark:text-gray-300 font-medium">{lead.person_name}</span>
                                      {((lead as any).organization_name || (lead as any).company_name) && (
                                        <span> • {(lead as any).organization_name || (lead as any).company_name}</span>
                                      )}
                                    </>
                                  ) : (
                                    (lead as any).organization_name || (lead as any).company_name || "No Contact"
                                  )}
                                </p>
                              </div>
                            </Link>

                            {/* Right: Deal Value */}
                            <div className="text-right shrink-0">
                              <p className="text-sm font-extrabold text-[#0088cc] dark:text-[#38bdf8] whitespace-nowrap">
                                ₹{Number(lead.lead_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Row: Stage Dropdown Badge + Owner + Quick Actions */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                            {/* Stage Selector Pill */}
                            <LeadStageDropdown
                              currentStageId={lead.lead_pipeline_stage_id || stages[0]?.id}
                              stages={stages}
                              stageColors={stageColors}
                              onSelectStage={async (newStageId) => {
                                await updateLeadStage(lead.id, newStageId, true);
                                fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
                              }}
                            />

                            {/* Owner & Quick Links */}
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                              {lead.user_name && (
                                <span className="truncate max-w-[100px] flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                  <i className="mgc_user_3_line text-xs"></i>
                                  <span className="truncate">{lead.user_name}</span>
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <Link to={`/leads/view/${lead.id}`} className="p-1 hover:text-[#0088cc] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Lead">
                                  <i className="mgc_eye_line text-sm"></i>
                                </Link>
                                {canEdit && (
                                  <Link to={`/leads/edit/${lead.id}`} className="p-1 hover:text-[#0088cc] text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit Lead">
                                    <i className="mgc_edit_line text-sm"></i>
                                  </Link>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleDelete(lead)} className="p-1 hover:text-red-500 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Delete Lead">
                                    <i className="mgc_delete_line text-sm"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* KANBAN BOARD VIEW (Shown on >= md, or on mobile when board layout chosen) */}
          <div
            ref={boardContainerRef}
            style={{ height: boardHeight }}
            className={`${mobileKanbanLayout === "board" ? "block" : "hidden md:block"} kanban-board-scroll overflow-x-auto pb-0 scroll-smooth sticky bottom-0`}
          >
            <div className="flex gap-4 min-w-max h-full items-stretch">
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
                      fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
                    }}
                    className="w-72 lg:w-80 flex-shrink-0 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-3.5 flex flex-col h-full min-h-0 transition-colors hover:border-[#0088cc]/50"
                  >
                    <div className="flex items-center justify-between shrink-0 mb-2">
                      <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1.5">
                          {stage.name}
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">({stageLeads.length})</span>
                        </h3>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                          ₹{stageValueTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shrink-0 mb-3">
                      <div
                        className="h-full bg-[#0088cc] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (stageLeads.length / Math.max(1, kanbanLeads.length)) * 100 * 2)}%` }}
                      ></div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 kanban-column-scroll">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0088cc] border-t-transparent"></div>
                        </div>
                      ) : stageLeads.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col items-center justify-center text-center space-y-2.5 h-full min-h-[180px]">
                          <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-300">
                            <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div className="space-y-0.5">
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
                              className="px-3.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-bold transition-colors shadow-sm inline-block"
                            >
                              Create Lead
                            </Link>
                          )}
                        </div>
                      ) : (
                        stageLeads.map((lead) => {
                          const rottenInfo = getRottenInfo(lead, currentPipeline);
                          const isOverdue = Boolean(
                            lead.status !== false &&
                            lead.expected_close_date &&
                            new Date(lead.expected_close_date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)
                          );
                          const hasAlert = rottenInfo.isRotten || isOverdue;
                          const alertTitle = rottenInfo.isRotten && isOverdue
                            ? `Warning: Rotten (${rottenInfo.daysIdle}d idle) & Overdue close date`
                            : rottenInfo.isRotten
                            ? `Rotten: Idle for ${rottenInfo.daysIdle} days without updates (threshold: ${rottenInfo.rottenDaysThreshold}d)`
                            : isOverdue
                            ? `Overdue: Expected close date was ${new Date(lead.expected_close_date!).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                            : "";

                          return (
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
                                {/* Alert triangle (shown only when rotten or overdue) + edit/delete on hover */}
                                <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                                  {hasAlert && (
                                    <span className="text-red-500 opacity-80 hover:opacity-100 transition-opacity cursor-help" title={alertTitle}>
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                      </svg>
                                    </span>
                                  )}
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
                                ₹{Number(lead.lead_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                                  <span
                                    className={`flex items-center gap-1 ${isOverdue ? "text-red-500 dark:text-red-400 font-medium" : "text-gray-400"}`}
                                    title={isOverdue ? "Overdue: Expected close date has passed" : undefined}
                                  >
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
                        );
                      })
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        </>
      )}


      {/* TABLE GRID VIEW */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Bulk Selection Header Action Banner */}
          {selectedLeadIds.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-red-700 dark:text-red-300">
                  {selectedLeadIds.length} lead(s) selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLeadIds([])}
                  className="text-[11px] text-red-600 underline hover:text-red-800"
                >
                  Clear Selection
                </button>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-end sm:self-auto"
                >
                  <i className="mgc_delete_line text-sm"></i>
                  Delete Selected Leads ({selectedLeadIds.length})
                </button>
              )}
            </div>
          )}

          {/* Mobile Horizontal Swipe Cue */}
          <div className="md:hidden px-4 py-2 bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <i className="mgc_swap_line text-sm text-[#0088cc]"></i>
              Swipe horizontally to view full table
            </span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total: {total}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4 w-10 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={displayLeads.length > 0 && selectedLeadIds.length === displayLeads.length}
                      onChange={(e) => handleSelectAll(e, displayLeads)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">Title</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Value</th>
                  <th className="py-3 px-4 whitespace-nowrap">Contact Person</th>
                  <th className="py-3 px-4 whitespace-nowrap">Source</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stage</th>
                  <th className="py-3 px-4 whitespace-nowrap">Created At</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                    </td>
                  </tr>
                ) : displayLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                      {onlyRotten ? "No Rotten Leads Found." : "No Records Available."}
                    </td>
                  </tr>
                ) : (
                  displayLeads.map((lead) => {
                    const rottenInfo = getRottenInfo(lead, currentPipeline);
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <tr key={lead.id} className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/30" : rottenInfo.isRotten ? "bg-rose-50/20 dark:bg-rose-950/10" : ""}`}>
                        <td className="py-3 px-4 w-10 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(lead.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0088cc] max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link to={`/leads/view/${lead.id}`} className="hover:underline font-bold truncate">
                              {lead.title}
                            </Link>
                            {rottenInfo.isRotten && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 shrink-0">
                                🍅 Rotten ({rottenInfo.daysIdle}d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${lead.status ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}>
                            {lead.status ? "Open" : "Lost / Closed"}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">
                          ₹{Number(lead.lead_value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{lead.person_name || "-"}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{lead.source_name || "-"}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 dark:text-gray-300">{lead.stage_name || "-"}</td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-500">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
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
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              <span>{`${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total}`}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">{page} / {Math.ceil(total / perPage)}</span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                  disabled={page >= Math.ceil(total / perPage)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VOICE LEAD CREATION MODAL */}
      <VoiceLeadModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onLeadCreated={() => {
          if (viewMode === "kanban") {
            fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search, filterForm);
          } else {
            fetchLeads(page, perPage, search, filterForm);
          }
        }}
        pipelineId={selectedPipelineId}
      />

      {/* UPLOAD FILE MODAL (MAGIC AI / DOCUMENT LEAD CREATION) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">Create Lead Using AI File Upload</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
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
          <div className="bg-white dark:bg-gray-800 h-full w-full max-w-full sm:max-w-md shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col justify-between overflow-hidden">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 sm:p-5 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_filter_line text-[#0088cc]"></i>
                Filters in Leads
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#e0f2fe] text-[#0088cc] font-bold">
                    {activeFilterCount} Active
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <form id="leads-filter-form" onSubmit={handleApplyAdvancedFilters} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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

              {/* 5. Pipeline */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Pipeline</label>
                <select
                  value={filterForm.lead_pipeline_id}
                  onChange={(e) => setFilterForm({ ...filterForm, lead_pipeline_id: e.target.value, lead_pipeline_stage_id: "" })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 6. Stage */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Stage</label>
                <select
                  value={filterForm.lead_pipeline_stage_id}
                  onChange={(e) => setFilterForm({ ...filterForm, lead_pipeline_stage_id: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  disabled={!filterForm.lead_pipeline_id && filterStages.length === 0}
                >
                  <option value="">Select Stage</option>
                  {filterStages.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* 7. Lead Type */}
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

              {/* 8. Source */}
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

              {/* 9. Tags */}
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

              {/* 10. Expected Close Date */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Expected Close Date</label>
                <input
                  type="date"
                  value={filterForm.expected_close_date}
                  onChange={(e) => setFilterForm({ ...filterForm, expected_close_date: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* 11. Created At */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Created At</label>
                <input
                  type="date"
                  value={filterForm.created_at}
                  onChange={(e) => setFilterForm({ ...filterForm, created_at: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                />
              </div>
            </form>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-center transition-colors"
              >
                Clear All
              </button>
              <button
                type="submit"
                form="leads-filter-form"
                className="flex-1 py-2 px-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold text-center shadow-sm transition-colors"
              >
                Apply Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;
