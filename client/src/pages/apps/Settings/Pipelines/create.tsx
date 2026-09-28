import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IPipelineStage } from "@/interface";
import { pipelineSchema } from "@/schemas";
import { ZodError } from "zod";

const DEFAULT_STAGES: IPipelineStage[] = [
  { name: "New", probability: 100, sort_order: 1 },
  { name: "Newly Added", probability: 100, sort_order: 2 },
  { name: "Won", probability: 100, sort_order: 3 },
  { name: "Lost", probability: 0, sort_order: 4 },
];

const CreatePipelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState<boolean>(false);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    rotten_days: number;
    is_default: boolean;
    stages: IPipelineStage[];
  }>({
    name: "",
    rotten_days: 30,
    is_default: false,
    stages: [...DEFAULT_STAGES.map((s) => ({ ...s }))],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddStage = () => {
    setFormData((prev) => ({
      ...prev,
      stages: [
        ...prev.stages,
        {
          name: `Stage ${prev.stages.length + 1}`,
          probability: 100,
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

  const handleMoveStage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= formData.stages.length) return;
    setFormData((prev) => {
      const updated = [...prev.stages];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return {
        ...prev,
        stages: updated.map((s, idx) => ({ ...s, sort_order: idx + 1 })),
      };
    });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = pipelineSchema.parse(formData);
      setSaving(true);
      await API.post("/pipelines", validated);
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Pipeline created successfully",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/settings/pipelines");
    } catch (err: any) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0];
          if (field) {
            fieldErrors[String(field)] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to create pipeline",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            /{" "}
            <Link to="/settings/pipelines" className="text-[#0088cc] hover:underline">
              Pipelines
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Create Pipeline</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Create Pipeline
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/pipelines"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Save Pipeline
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Top Controls Box */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={`w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0088cc] ${
                  errors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:border-[#0088cc]"
                }`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 italic font-medium">
                  The Name field is required
                </p>
              )}
            </div>

            {/* Rotten Days */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Rotten Days <span className="text-red-500">*</span>
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
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              />
            </div>

            {/* Mark as Default Toggle */}
            <div className="flex flex-col justify-center h-full pt-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Mark as Default
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_default: !formData.is_default })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.is_default ? "bg-[#0088cc]" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.is_default ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {formData.is_default ? "Default Pipeline" : "Standard Pipeline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors for Stages */}
        {errors.stages && (
          <p className="text-xs text-red-500 font-medium px-1">{errors.stages}</p>
        )}

        {/* Horizontal Scrollable Stage Cards Builder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Pipeline Stages
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Drag cards or use arrow buttons to reorder stages.
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 custom-scrollbar min-h-[320px]">
            {formData.stages.map((st, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => setDraggedStageIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedStageIndex !== null && draggedStageIndex !== idx) {
                    handleMoveStage(draggedStageIndex, idx);
                    setDraggedStageIndex(null);
                  }
                }}
                className={`w-72 min-w-[270px] shrink-0 bg-white dark:bg-gray-800 rounded-xl border ${
                  draggedStageIndex === idx
                    ? "border-[#0088cc] shadow-lg opacity-70"
                    : "border-gray-200 dark:border-gray-700 shadow-sm"
                } p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                    {st.name || `Stage ${idx + 1}`}
                  </span>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStage(idx, idx - 1)}
                      className="hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20 text-xs px-1"
                      title="Move Left"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={idx === formData.stages.length - 1}
                      onClick={() => handleMoveStage(idx, idx + 1)}
                      className="hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-20 text-xs px-1"
                      title="Move Right"
                    >
                      ▶
                    </button>
                    <i className="mgc_transfer_line text-base ml-0.5 cursor-grab" title="Drag to reorder"></i>
                  </div>
                </div>

                {/* Card Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={st.name}
                      onChange={(e) => handleStageChange(idx, "name", e.target.value)}
                      placeholder="Stage Name"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0088cc]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Probability(%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={st.probability}
                      onChange={(e) => handleStageChange(idx, "probability", Number(e.target.value))}
                      placeholder="100"
                      className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#0088cc]"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleRemoveStage(idx)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <i className="mgc_delete_2_line text-sm"></i>
                    Delete Stage
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Stage Card */}
            <div className="w-72 min-w-[270px] shrink-0 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-sm min-h-[260px]">
              <h4 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Add New Stage
              </h4>
              <p className="text-xs text-gray-400">Add new stage to pipeline</p>
              <button
                type="button"
                onClick={handleAddStage}
                className="px-5 py-2 border-2 border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc] hover:text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Add Stage
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/settings/pipelines"
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Save Pipeline
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePipelinePage;
