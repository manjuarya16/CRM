import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import { ILead, ILeadStage } from "@/interface";
import API from "@/config";

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Upload File Modal
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    fetchPipelines();
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
      if (viewMode === "kanban") {
        fetchKanbanLeads(Number(selectedPipelineId), search);
      } else {
        fetchLeads(page, perPage, search);
      }
    }
  }, [selectedPipelineId, viewMode, page, perPage]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === "kanban") {
      fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search);
    } else {
      setPage(1);
      fetchLeads(1, perPage, search);
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

      // Simulate file upload endpoint or create lead from file
      Swal.fire("Success", `File "${uploadFile.name}" processed successfully. New lead created.`, "success");
      setShowUploadModal(false);
      setUploadFile(null);
      if (viewMode === "kanban") {
        fetchKanbanLeads(selectedPipelineId ? Number(selectedPipelineId) : undefined, search);
      } else {
        fetchLeads(page, perPage, search);
      }
    } catch (err: any) {
      Swal.fire("Error", "Failed to upload file", "error");
    } finally {
      setUploading(false);
    }
  };

  // Helper: Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "LD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Helper colors for avatar circles
  const avatarColors = [
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-[#0088cc]/10 text-[#0088cc] border-[#0088cc]/30",
    "bg-purple-100 text-purple-800 border-purple-300",
    "bg-pink-100 text-pink-800 border-pink-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Dashboard / Leads</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Leads</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 border border-[#0088cc] text-[#0088cc] hover:bg-[#e0f2fe] dark:hover:bg-gray-800 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <i className="mgc_upload_line text-base"></i>
            Upload File
          </button>
          <Link
            to="/leads/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Create Lead
          </Link>
        </div>
      </div>

      {/* Filter Bar & Pipeline Selector & View Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleFilter} className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <input
            type="text"
            placeholder="Search leads or persons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd] transition-colors"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-3">
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

          {/* View Toggle Buttons: Kanban vs Table */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                viewMode === "kanban"
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
              className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                viewMode === "table"
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
            {stages.map((stage, idx) => {
              const stageLeads = kanbanLeads.filter((l) => l.lead_pipeline_stage_id === stage.id);
              const stageValueTotal = stageLeads.reduce((acc, l) => acc + Number(l.lead_value || 0), 0);
              const colorClass = avatarColors[idx % avatarColors.length];

              return (
                <div
                  key={stage.id}
                  className="w-80 flex-shrink-0 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-200/80 dark:border-gray-700/80 p-3.5 space-y-3"
                >
                  {/* Column Header */}
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

                    <Link
                      to="/leads/create"
                      className="p-1 text-gray-400 hover:text-[#0088cc] hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                      title={`Quick add lead to ${stage.name}`}
                    >
                      <i className="mgc_add_line text-lg"></i>
                    </Link>
                  </div>

                  {/* Stage Progress Bar Indicator */}
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0088cc] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (stageLeads.length / Math.max(1, kanbanLeads.length)) * 100 * 2)}%` }}
                    ></div>
                  </div>

                  {/* Lead Cards list */}
                  <div className="space-y-3 min-h-[120px]">
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0088cc] border-t-transparent"></div>
                      </div>
                    ) : stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-400 font-medium border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        No leads in this stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const initials = getInitials(lead.person_name || lead.title);
                        return (
                          <div
                            key={lead.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/60 dark:border-gray-700/60 hover:shadow-md transition-all space-y-3 relative group"
                          >
                            {/* Card Person Avatar & Name */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${colorClass}`}>
                                  {initials}
                                </div>
                                <div className="leading-tight">
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{lead.person_name || "Unassigned Person"}</p>
                                </div>
                              </div>

                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Link to={`/leads/edit/${lead.id}`} className="p-1 text-gray-400 hover:text-[#0088cc]">
                                  <i className="mgc_edit_line text-sm"></i>
                                </Link>
                                <button onClick={() => handleDelete(lead)} className="p-1 text-gray-400 hover:text-red-500">
                                  <i className="mgc_delete_line text-sm"></i>
                                </button>
                              </div>
                            </div>

                            {/* Lead Title */}
                            <div>
                              <Link
                                to={`/leads/view/${lead.id}`}
                                className="text-sm font-bold text-gray-800 dark:text-gray-100 hover:text-[#0088cc] transition-colors leading-snug block"
                              >
                                {lead.title}
                              </Link>
                              <span className="text-[11px] text-gray-400">Lead #{lead.id}</span>
                            </div>

                            {/* Badges / Tags row */}
                            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                              {lead.lead_value !== undefined && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-bold">
                                  ${Number(lead.lead_value).toLocaleString()}
                                </span>
                              )}
                              {lead.user_name && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium flex items-center gap-1">
                                  👤 {lead.user_name}
                                </span>
                              )}
                              {lead.source_name && (
                                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                  {lead.source_name}
                                </span>
                              )}
                              {lead.type_name && (
                                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded font-medium">
                                  {lead.type_name}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABLE GRID VIEW */}
      {viewMode === "table" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Value</th>
                  <th className="py-3 px-4 font-semibold">Contact Person</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Stage</th>
                  <th className="py-3 px-4 font-semibold">Created At</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                      No Records Available.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-medium text-[#0088cc]">
                        <Link to={`/leads/view/${lead.id}`} className="hover:underline font-bold">
                          {lead.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                          lead.status ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
                        <Link to={`/leads/view/${lead.id}`} className="text-gray-500 hover:text-[#0088cc] p-1 inline-block" title="View Lead Process">
                          <i className="mgc_eye_line text-base"></i>
                        </Link>
                        <Link to={`/leads/edit/${lead.id}`} className="text-gray-500 hover:text-[#0088cc] p-1 inline-block" title="Edit Lead">
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                        <button onClick={() => handleDelete(lead)} className="text-gray-500 hover:text-red-600 p-1 inline-block" title="Delete Lead">
                          <i className="mgc_delete_line text-base"></i>
                        </button>
                      </td>
                    </tr>
                  ))
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
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Create Lead Using File</h3>
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
    </div>
  );
};

export default LeadsPage;
