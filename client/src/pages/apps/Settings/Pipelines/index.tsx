import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IPipeline, IPipelineStage } from "@/interface";

const DEFAULT_STAGES: IPipelineStage[] = [
  { name: "New", probability: 0, sort_order: 1 },
  { name: "Follow Up", probability: 20, sort_order: 2 },
  { name: "Prospect", probability: 50, sort_order: 3 },
  { name: "Negotiation", probability: 80, sort_order: 4 },
  { name: "Won", probability: 100, sort_order: 5 },
  { name: "Lost", probability: 0, sort_order: 6 },
];

const PipelinesPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<IPipeline[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State for Create / Edit Pipeline
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPipeline, setEditingPipeline] = useState<IPipeline | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    rotten_days: number;
    is_default: boolean;
    stages: IPipelineStage[];
  }>({
    name: "",
    rotten_days: 30,
    is_default: false,
    stages: DEFAULT_STAGES,
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const res = await API.get("/pipelines");
      setPipelines(res.data?.data || []);
    } catch {
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPipeline(null);
    setFormData({
      name: "",
      rotten_days: 30,
      is_default: pipelines.length === 0,
      stages: [...DEFAULT_STAGES.map((s) => ({ ...s }))],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (pipeline: IPipeline) => {
    setEditingPipeline(pipeline);
    setFormData({
      name: pipeline.name || "",
      rotten_days: pipeline.rotten_days || 30,
      is_default: Boolean(pipeline.is_default),
      stages:
        pipeline.stages && pipeline.stages.length > 0
          ? pipeline.stages.map((s) => ({ ...s }))
          : [...DEFAULT_STAGES.map((s) => ({ ...s }))],
    });
    setIsModalOpen(true);
  };

  const handleAddStage = () => {
    setFormData((prev) => ({
      ...prev,
      stages: [
        ...prev.stages,
        {
          name: `Stage ${prev.stages.length + 1}`,
          probability: 50,
          sort_order: prev.stages.length + 1,
        },
      ],
    }));
  };

  const handleRemoveStage = (index: number) => {
    if (formData.stages.length <= 1) {
      Swal.fire("Warning", "A pipeline must have at least one stage.", "warning");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      stages: prev.stages.filter((_, idx) => idx !== index),
    }));
  };

  const handleStageChange = (
    index: number,
    field: keyof IPipelineStage,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = [...prev.stages];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, stages: updated };
    });
  };

  // Single unified function for both Add and Edit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire("Error", "Pipeline name is required", "error");
      return;
    }

    if (!formData.stages || formData.stages.length === 0) {
      Swal.fire("Error", "Please add at least one stage", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingPipeline?.id) {
        // Edit / Update
        await API.put(`/pipelines/${editingPipeline.id}`, formData);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Pipeline updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // Add / Create
        await API.post("/pipelines", formData);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Pipeline created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      fetchPipelines();
    } catch (err: any) {
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to save pipeline",
        "error"
      );
    } finally {
      setSaving(false);
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
          await API.delete(`/pipelines/${pipeline.id}`);
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

  const totalPages = Math.ceil(filteredPipelines.length / perPage) || 1;
  const paginatedPipelines = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredPipelines.slice(start, start + perPage);
  }, [filteredPipelines, page, perPage]);

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Pipelines</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Pipelines
          </h1>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_add_line text-lg"></i>
          Create Pipeline
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters and Controls Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Per Page:
            </span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0088cc]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedPipelines.length > 0 &&
                      paginatedPipelines.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                  />
                </th>
                <th className="p-4 w-16">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Stages</th>
                <th className="p-4 text-center">Rotten Days</th>
                <th className="p-4 text-center">Default</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0088cc]"></div>
                    <p className="mt-2 text-xs">Loading pipelines...</p>
                  </td>
                </tr>
              ) : paginatedPipelines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <i className="mgc_git_commit_line text-4xl text-gray-300 dark:text-gray-600"></i>
                    <p className="mt-2 text-sm">No pipelines found.</p>
                  </td>
                </tr>
              ) : (
                paginatedPipelines.map((pipeline) => (
                  <tr
                    key={pipeline.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(pipeline.id)}
                        onChange={() => handleSelectOne(pipeline.id)}
                        className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                      />
                    </td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                      {pipeline.id}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {pipeline.name}
                        </span>
                        {pipeline.is_default && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                        {pipeline.stages && pipeline.stages.length > 0 ? (
                          pipeline.stages.map((st, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                            >
                              <span>{st.name}</span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {st.probability}%
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No stages</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <i className="mgc_alarm_line text-sm"></i>
                        {pipeline.rotten_days || 30} days
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {pipeline.is_default ? (
                        <span className="text-emerald-500 font-bold text-base">
                          <i className="mgc_check_circle_fill"></i>
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-bold text-base">
                          <i className="mgc_close_circle_line"></i>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(pipeline)}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          title="Edit Pipeline"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(pipeline)}
                          className={`p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors ${
                            pipeline.is_default ? "opacity-30 cursor-not-allowed" : ""
                          }`}
                          title="Delete Pipeline"
                          disabled={pipeline.is_default}
                        >
                          <i className="mgc_delete_2_line text-base"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredPipelines.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredPipelines.length)} of{" "}
            {filteredPipelines.length} entries
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
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl my-8 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingPipeline ? "Edit Pipeline" : "Create Pipeline"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Pipeline Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Pipeline"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Rotten In (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    placeholder="30"
                    value={formData.rotten_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rotten_days: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Days after which a lead in stage is considered stale.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                />
                <label
                  htmlFor="is_default"
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Mark as Default Pipeline
                </label>
              </div>

              {/* Dynamic Stages Section */}
              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Stages & Probabilities
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Define the progression stages and win likelihood (%).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-semibold text-[#0088cc] rounded-lg transition-colors"
                  >
                    <i className="mgc_add_line"></i>
                    Add Stage
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {formData.stages.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <span className="text-xs font-bold text-gray-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Stage Name"
                          value={st.name}
                          onChange={(e) =>
                            handleStageChange(idx, "name", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:border-[#0088cc]"
                        />
                      </div>
                      <div className="w-28 flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="%"
                          value={st.probability}
                          onChange={(e) =>
                            handleStageChange(
                              idx,
                              "probability",
                              Number(e.target.value)
                            )
                          }
                          className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md focus:outline-none focus:border-[#0088cc]"
                        />
                        <span className="text-xs font-semibold text-gray-500">
                          %
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(idx)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 transition-colors"
                        title="Delete Stage"
                      >
                        <i className="mgc_delete_2_line text-base"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow transition-colors disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingPipeline
                    ? "Save Pipeline"
                    : "Save Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelinesPage;
