import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import API from "@/config";
import Swal from "sweetalert2";
import { workflowSchema, WorkflowInput } from "@/schemas";
import { IWorkflow, IWorkflowCondition, IWorkflowAction, WorkflowFormProps } from "@/interface";

export const WorkflowForm: React.FC<WorkflowFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<IWorkflowCondition[]>([]);
  const [actions, setActions] = useState<IWorkflowAction[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkflowInput>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: "",
      description: "",
      entity_type: "leads",
      event: "create",
      condition_type: "and",
      conditions: [],
      actions: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("description", initialData.description || "");
      setValue("entity_type", initialData.entity_type);
      setValue("event", initialData.event);
      setValue("condition_type", initialData.condition_type || "and");

      const conds = Array.isArray(initialData.conditions) ? initialData.conditions : [];
      setConditions(conds);
      setValue("conditions", conds);

      const acts = Array.isArray(initialData.actions) ? initialData.actions : [];
      setActions(acts);
      setValue("actions", acts);
    }
  }, [initialData, setValue]);

  const addCondition = () => {
    const updated = [...conditions, { field: "status", operator: "equals", value: "active" }];
    setConditions(updated);
    setValue("conditions", updated);
  };

  const removeCondition = (idx: number) => {
    const updated = conditions.filter((_, i) => i !== idx);
    setConditions(updated);
    setValue("conditions", updated);
  };

  const updateCondition = (idx: number, field: string, operator: string, value: string) => {
    const updated = [...conditions];
    updated[idx] = { field, operator, value };
    setConditions(updated);
    setValue("conditions", updated);
  };

  const addAction = () => {
    const updated = [...actions, { action_type: "send_email", target: "", value: "" }];
    setActions(updated);
    setValue("actions", updated);
  };

  const removeAction = (idx: number) => {
    const updated = actions.filter((_, i) => i !== idx);
    setActions(updated);
    setValue("actions", updated);
  };

  const updateAction = (idx: number, action_type: string, target: string, value: string) => {
    const updated = [...actions];
    updated[idx] = { action_type, target, value };
    setActions(updated);
    setValue("actions", updated);
  };

  const onInvalid = (errs: any) => {
    console.log("Zod validation errors:", errs);
  };

  const onSubmit = async (data: WorkflowInput) => {
    try {
      setLoading(true);
      data.conditions = conditions;
      data.actions = actions;

      if (isEdit && initialData) {
        await API.put(`/workflows/${initialData.id}`, data);
        Swal.fire({ icon: "success", title: "Saved!", text: "Workflow updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/workflows", data);
        Swal.fire({ icon: "success", title: "Created!", text: "Workflow created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/workflows");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save workflow" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Workflow Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Auto-assign New High Value Leads"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entity Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("entity_type")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="leads">Leads</option>
            <option value="persons">Persons / Contacts</option>
            <option value="organizations">Organizations</option>
            <option value="quotes">Quotes</option>
            <option value="activities">Activities</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event Trigger <span className="text-red-500">*</span>
          </label>
          <select
            {...register("event")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            {...register("description")}
            placeholder="Describe what this workflow automation accomplishes..."
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          ></textarea>
        </div>
      </div>

      {/* Conditions Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Conditions</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Match:</span>
              <select
                {...register("condition_type")}
                className="px-2 py-1 text-xs border rounded focus:outline-none dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="and">All (AND)</option>
                <option value="or">Any (OR)</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={addCondition}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <i className="mgc_add_line"></i> Add Condition
          </button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No conditions set (will trigger on all matching events).</p>
        ) : (
          conditions.map((c, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Field (e.g. lead_value)"
                value={c.field}
                onChange={(e) => updateCondition(idx, e.target.value, c.operator, c.value)}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <select
                value={c.operator}
                onChange={(e) => updateCondition(idx, c.field, e.target.value, c.value)}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="contains">Contains</option>
              </select>
              <input
                type="text"
                placeholder="Value"
                value={c.value}
                onChange={(e) => updateCondition(idx, c.field, c.operator, e.target.value)}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeCondition(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Actions Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Actions to Execute</h3>
          <button
            type="button"
            onClick={addAction}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <i className="mgc_add_line"></i> Add Action
          </button>
        </div>

        {actions.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No actions added yet.</p>
        ) : (
          actions.map((a, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={a.action_type}
                onChange={(e) => updateAction(idx, e.target.value, a.target || "", a.value || "")}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="send_email">Send Email Template</option>
                <option value="update_attribute">Update Field / Attribute</option>
                <option value="trigger_webhook">Trigger Webhook</option>
                <option value="create_activity">Create Task / Activity</option>
              </select>
              <input
                type="text"
                placeholder="Target / Parameter"
                value={a.target || ""}
                onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Value / Details"
                value={a.value || ""}
                onChange={(e) => updateAction(idx, a.action_type, a.target || "", e.target.value)}
                className="w-1/3 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeAction(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/settings/workflows")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? "Saving..." : isEdit ? "Update Workflow" : "Create Workflow"}
        </button>
      </div>
    </form>
  );
};
