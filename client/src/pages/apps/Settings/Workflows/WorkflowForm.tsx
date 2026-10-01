import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import API from "@/config";
import Swal from "sweetalert2";
import { workflowSchema, WorkflowInput } from "@/schemas";
import { IWorkflow, IWorkflowCondition, IWorkflowAction, WorkflowFormProps } from "@/interface";

const ENTITY_ACTION_OPTIONS: Record<string, { label: string; value: string }[]> = {
  leads: [
    { label: "Update Lead", value: "update_lead" },
    { label: "Update Person", value: "update_person" },
    { label: "Send email to person", value: "send_email_person" },
    { label: "Send email to sales owner", value: "send_email_owner" },
    { label: "Add Tag", value: "add_tag" },
    { label: "Add Note as Activity", value: "add_note_activity" },
    { label: "Add Webhook", value: "trigger_webhook" },
    { label: "Assign Record to User", value: "assign_user" },
    { label: "Create Task / Activity", value: "create_activity" },
  ],
  activities: [
    { label: "Update related leads", value: "update_related_leads" },
    { label: "Send email to sales owner", value: "send_email_owner" },
    { label: "Send email to participants", value: "send_email_participants" },
    { label: "Add Webhook", value: "trigger_webhook" },
  ],
  persons: [
    { label: "Update Person", value: "update_person" },
    { label: "Update related leads", value: "update_related_leads" },
    { label: "Send email to person", value: "send_email_person" },
    { label: "Add Webhook", value: "trigger_webhook" },
  ],
  quotes: [
    { label: "Update Quote", value: "update_quote" },
    { label: "Update Person", value: "update_person" },
    { label: "Update related leads", value: "update_related_leads" },
    { label: "Send email to person", value: "send_email_person" },
    { label: "Send email to sales owner", value: "send_email_owner" },
    { label: "Add Webhook", value: "trigger_webhook" },
  ],
};

const ENTITY_FIELDS: Record<string, { label: string; value: string; type?: string }[]> = {
  leads: [
    { label: "Lead Title", value: "title" },
    { label: "Lead Value ($)", value: "lead_value", type: "number" },
    { label: "Status (Open/Won/Lost)", value: "status" },
    { label: "Pipeline Stage ID", value: "stage_id" },
    { label: "Lead Source ID", value: "source_id" },
    { label: "Assigned User ID", value: "user_id" },
  ],
  activities: [
    { label: "Activity Title", value: "title" },
    { label: "Activity Type (call/task/meeting)", value: "type" },
    { label: "Comment", value: "comment" },
  ],
  persons: [
    { label: "Person Name", value: "name" },
    { label: "Email Address", value: "emails" },
    { label: "Phone Number", value: "contact_numbers" },
    { label: "Job Title", value: "job_title" },
    { label: "Is VIP / Person Tag", value: "is_vip" },
    { label: "Organization ID", value: "organization_id" },
  ],
  quotes: [
    { label: "Quote Subject", value: "subject" },
    { label: "Grand Total ($)", value: "grand_total", type: "number" },
    { label: "User ID", value: "user_id" },
  ],
};

export const WorkflowForm: React.FC<WorkflowFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<IWorkflowCondition[]>([]);
  const [actions, setActions] = useState<IWorkflowAction[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ id: number; name: string; subject: string }[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);
  const [tags, setTags] = useState<{ id: number; name: string; color: string }[]>([]);

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

  const selectedEntityType = watch("entity_type") || "leads";
  const currentActionOptions = ENTITY_ACTION_OPTIONS[selectedEntityType] || ENTITY_ACTION_OPTIONS.leads;

  useEffect(() => {
    // Fetch helper data for dropdowns
    const fetchHelperData = async () => {
      try {
        const [templatesRes, usersRes, tagsRes] = await Promise.all([
          API.get("/email-templates").catch(() => ({ data: { data: [] } })),
          API.get("/users").catch(() => ({ data: { data: [] } })),
          API.get("/tags").catch(() => ({ data: { data: [] } })),
        ]);
        if (templatesRes.data?.data) setEmailTemplates(templatesRes.data.data);
        if (usersRes.data?.data) setUsers(usersRes.data.data);
        if (tagsRes.data?.data) setTags(tagsRes.data.data);
      } catch (err) {
        console.error("Failed to load helper options", err);
      }
    };
    fetchHelperData();
  }, []);

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
    const fields = ENTITY_FIELDS[selectedEntityType] || ENTITY_FIELDS.leads;
    const defaultField = fields[0]?.value || "status";
    const updated = [...conditions, { field: defaultField, operator: "equals", value: "" }];
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
    const defaultActionType = currentActionOptions[0]?.value || "update_lead";
    const defaultTarget = defaultActionType === "update_lead" || defaultActionType === "update_related_leads"
      ? ENTITY_FIELDS.leads[0]?.value || "title"
      : defaultActionType === "update_person"
      ? ENTITY_FIELDS.persons[0]?.value || "name"
      : defaultActionType === "update_quote"
      ? ENTITY_FIELDS.quotes[0]?.value || "subject"
      : "";

    const updated = [...actions, { action_type: defaultActionType, target: defaultTarget, value: "" }];
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

  const availableFields = ENTITY_FIELDS[selectedEntityType] || ENTITY_FIELDS.leads;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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
            Event <span className="text-red-500">*</span>
          </label>
          <select
            {...register("entity_type")}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 font-medium"
          >
            <option value="leads">Leads</option>
            <option value="activities">Activities</option>
            <option value="persons">Persons</option>
            <option value="quotes">Quotes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trigger <span className="text-red-500">*</span>
          </label>
          <select
            {...register("event")}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-100 font-medium"
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
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Conditions (If Criteria)</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Logic:</span>
              <select
                {...register("condition_type")}
                className="px-2 py-1 text-xs border rounded focus:outline-none dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="and">All Match (AND)</option>
                <option value="or">Any Match (OR)</option>
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
          <p className="text-xs text-gray-400 italic">No conditions set (workflow will trigger unconditionally on matching event).</p>
        ) : (
          conditions.map((c, idx) => (
            <div key={idx} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
              {/* Field selector */}
              <select
                value={c.field}
                onChange={(e) => updateCondition(idx, e.target.value, c.operator, c.value)}
                className="w-1/3 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 font-medium"
              >
                {availableFields.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={c.operator}
                onChange={(e) => updateCondition(idx, c.field, e.target.value, c.value)}
                className="w-1/3 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="equals">Equals (=)</option>
                <option value="not_equals">Not Equals (!=)</option>
                <option value="greater_than">Greater Than (&gt;)</option>
                <option value="less_than">Less Than (&lt;)</option>
                <option value="contains">Contains</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>

              {/* Value input */}
              <input
                type="text"
                placeholder="Target value"
                value={c.value}
                onChange={(e) => updateCondition(idx, c.field, c.operator, e.target.value)}
                disabled={c.operator === "is_empty" || c.operator === "is_not_empty"}
                className="w-1/3 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => removeCondition(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                title="Remove condition"
              >
                <i className="mgc_delete_line text-base"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Actions Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Actions (Then Execute)</h3>
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
            <div key={idx} className="flex flex-col gap-2 bg-blue-50/50 dark:bg-gray-900/40 p-3 rounded-lg border border-blue-100 dark:border-gray-700">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 w-16">Action #{idx + 1}</span>
                <select
                  value={a.action_type}
                  onChange={(e) => updateAction(idx, e.target.value, "", "")}
                  className="flex-1 px-2.5 py-1.5 text-xs border rounded-md focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 font-semibold"
                >
                  {currentActionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeAction(idx)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                  title="Remove action"
                >
                  <i className="mgc_delete_line text-base"></i>
                </button>
              </div>

              {/* Dynamic Target & Value Fields based on Action Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-18">
                {(a.action_type === "update_lead" || a.action_type === "update_related_leads" || a.action_type === "update_attribute") && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Target Lead Field</label>
                      <select
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">Select Field to Update</option>
                        {ENTITY_FIELDS.leads.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">New Value</label>
                      <input
                        type="text"
                        placeholder="Enter new value"
                        value={a.value || ""}
                        onChange={(e) => updateAction(idx, a.action_type, a.target || "", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {a.action_type === "update_person" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Target Person Field</label>
                      <select
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">Select Field to Update</option>
                        {ENTITY_FIELDS.persons.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">New Value</label>
                      <input
                        type="text"
                        placeholder="Enter new value"
                        value={a.value || ""}
                        onChange={(e) => updateAction(idx, a.action_type, a.target || "", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {a.action_type === "update_quote" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Target Quote Field</label>
                      <select
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">Select Field to Update</option>
                        {ENTITY_FIELDS.quotes.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">New Value</label>
                      <input
                        type="text"
                        placeholder="Enter new value"
                        value={a.value || ""}
                        onChange={(e) => updateAction(idx, a.action_type, a.target || "", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {(a.action_type === "send_email_person" || a.action_type === "send_email_owner" || a.action_type === "send_email_participants" || a.action_type === "send_email") && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Email Template</label>
                      <select
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">Select Email Template</option>
                        {emailTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.subject})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {a.action_type === "add_tag" && (
                  <>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Select Tag</label>
                        <select
                          value={a.target || ""}
                          onChange={(e) => updateAction(idx, a.action_type, e.target.value, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        >
                          <option value="">Select Existing Tag</option>
                          {tags.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Or Custom Tag Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Hot Lead or VIP"
                          value={a.value || a.target || ""}
                          onChange={(e) => updateAction(idx, a.action_type, e.target.value, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </>
                )}

                {a.action_type === "add_note_activity" && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Note Content</label>
                      <input
                        type="text"
                        placeholder="Enter note text to add as an activity..."
                        value={a.value || a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {a.action_type === "assign_user" && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Assign To User</label>
                      <select
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="">Select User</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {a.action_type === "create_activity" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Task Title / Type</label>
                      <select
                        value={a.target || "call"}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      >
                        <option value="call">Phone Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="task">Follow-up Task</option>
                        <option value="email">Send Email Activity</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Task Notes / Instructions</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule introductory call within 24h"
                        value={a.value || ""}
                        onChange={(e) => updateAction(idx, a.action_type, a.target || "", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}

                {a.action_type === "trigger_webhook" && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Webhook URL</label>
                      <input
                        type="url"
                        placeholder="https://hooks.zapier.com/hooks/catch/12345/abcde"
                        value={a.target || ""}
                        onChange={(e) => updateAction(idx, a.action_type, e.target.value, a.value || "")}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                  </>
                )}
              </div>
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


