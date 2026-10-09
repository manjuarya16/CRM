import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import Swal from "sweetalert2";
import { webhookSchema, WebhookInput } from "@/schemas";
import { WebhookFormProps } from "@/interface";
import { useWebhookStore } from "@/store";
import { API } from "@/config";
import { getToken } from "@/lib/auth-utils";

const ENTITY_CONFIG: Record<
  string,
  {
    placeholders: string[];
    defaultRawTemplate: string;
    defaultJsonPreview: string;
  }
> = {
  leads: {
    placeholders: ["{{id}}", "{{title}}", "{{lead_value}}", "{{email}}", "{{phone}}", "{{lead_pipeline_id}}"],
    defaultRawTemplate: `{\n  "event_name": "lead.created",\n  "lead_id": "{{id}}",\n  "lead_title": "{{title}}",\n  "contact_email": "{{email}}",\n  "deal_value": "{{lead_value}}"\n}`,
    defaultJsonPreview: `{\n  "id": 101,\n  "title": "New Business Lead",\n  "lead_value": 5000,\n  "email": "lead@example.com",\n  "phone": "+1234567890",\n  "lead_pipeline_id": 5,\n  "stage_name": "In Process"\n}`,
  },
  persons: {
    placeholders: ["{{id}}", "{{name}}", "{{emails}}", "{{contact_numbers}}", "{{job_title}}", "{{organization_id}}"],
    defaultRawTemplate: `{\n  "event_name": "person.created",\n  "person_id": "{{id}}",\n  "person_name": "{{name}}",\n  "emails": "{{emails}}",\n  "contact_numbers": "{{contact_numbers}}",\n  "job_title": "{{job_title}}"\n}`,
    defaultJsonPreview: `{\n  "id": 42,\n  "name": "John Doe",\n  "emails": ["john@example.com"],\n  "contact_numbers": ["+1987654321"],\n  "job_title": "Sales Manager",\n  "organization_id": 12\n}`,
  },
  organizations: {
    placeholders: ["{{id}}", "{{name}}", "{{address}}", "{{user_id}}"],
    defaultRawTemplate: `{\n  "event_name": "organization.created",\n  "organization_id": "{{id}}",\n  "org_name": "{{name}}",\n  "address": "{{address}}"\n}`,
    defaultJsonPreview: `{\n  "id": 12,\n  "name": "Acme Corp",\n  "address": "123 Business St, Tech City",\n  "user_id": 1\n}`,
  },
  quotes: {
    placeholders: ["{{id}}", "{{subject}}", "{{grand_total}}", "{{user_id}}", "{{person_id}}", "{{lead_id}}"],
    defaultRawTemplate: `{\n  "event_name": "quote.created",\n  "quote_id": "{{id}}",\n  "subject": "{{subject}}",\n  "grand_total": "{{grand_total}}",\n  "user_id": "{{user_id}}"\n}`,
    defaultJsonPreview: `{\n  "id": 88,\n  "subject": "Enterprise Plan Proposal",\n  "grand_total": 12500,\n  "sub_total": 10000,\n  "tax_amount": 2500,\n  "user_id": 1,\n  "person_id": 42,\n  "lead_id": 101\n}`,
  },
  activities: {
    placeholders: ["{{id}}", "{{title}}", "{{type}}", "{{comment}}", "{{user_id}}"],
    defaultRawTemplate: `{\n  "event_name": "activity.created",\n  "activity_id": "{{id}}",\n  "title": "{{title}}",\n  "activity_type": "{{type}}",\n  "comment": "{{comment}}"\n}`,
    defaultJsonPreview: `{\n  "id": 305,\n  "title": "Follow up call with client",\n  "type": "call",\n  "comment": "Discussed contract details",\n  "is_done": true,\n  "user_id": 1\n}`,
  },
};

export const WebhookForm: React.FC<WebhookFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WebhookInput>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      entity_type: "leads",
      description: "",
      method: "POST",
      end_point: "",
      payload_type: "default",
      raw_payload_type: "json",
      headers: [],
      query_params: [],
    },
  });

  const payloadType = watch("payload_type");
  const entityType = watch("entity_type") || "leads";
  const currentEntityConfig = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.leads;
  const prevEntityType = React.useRef(entityType);

  useEffect(() => {
    if (prevEntityType.current !== entityType) {
      prevEntityType.current = entityType;
      setValue("payload", currentEntityConfig.defaultRawTemplate);
    }
  }, [entityType, currentEntityConfig, setValue]);

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("entity_type", initialData.entity_type || "leads");
      setValue("description", initialData.description || "");
      setValue("method", initialData.method || "POST");
      setValue("end_point", initialData.end_point || "");
      setValue("payload_type", initialData.payload_type || "default");
      setValue("raw_payload_type", initialData.raw_payload_type || "json");

      const payloadStr = typeof initialData.payload === "object"
        ? JSON.stringify(initialData.payload, null, 2)
        : (initialData.payload || currentEntityConfig.defaultRawTemplate);
      setValue("payload", payloadStr);

      const h = Array.isArray(initialData.headers) ? initialData.headers : [];
      setHeaders(h);
      setValue("headers", h);

      const q = Array.isArray(initialData.query_params) ? initialData.query_params : [];
      setQueryParams(q);
      setValue("query_params", q);
    }
  }, [initialData, setValue]);

  const addHeader = () => {
    const updated = [...headers, { key: "", value: "" }];
    setHeaders(updated);
    setValue("headers", updated);
  };

  const removeHeader = (idx: number) => {
    const updated = headers.filter((_, i) => i !== idx);
    setHeaders(updated);
    setValue("headers", updated);
  };

  const updateHeader = (idx: number, key: string, value: string) => {
    const updated = [...headers];
    updated[idx] = { key, value };
    setHeaders(updated);
    setValue("headers", updated);
  };

  const addQueryParam = () => {
    const updated = [...queryParams, { key: "", value: "" }];
    setQueryParams(updated);
    setValue("query_params", updated);
  };

  const removeQueryParam = (idx: number) => {
    const updated = queryParams.filter((_, i) => i !== idx);
    setQueryParams(updated);
    setValue("query_params", updated);
  };

  const updateQueryParam = (idx: number, key: string, value: string) => {
    const updated = [...queryParams];
    updated[idx] = { key, value };
    setQueryParams(updated);
    setValue("query_params", updated);
  };

  const onInvalid = (errs: any) => {
    console.log("Zod validation errors:", errs);
  };

  const onSubmit = async (data: WebhookInput) => {
    try {
      setLoading(true);
      data.headers = headers.filter((h) => h.key.trim() !== "");
      data.query_params = queryParams.filter((q) => q.key.trim() !== "");

      if (typeof data.payload === "string" && data.payload.trim()) {
        try {
          data.payload = JSON.parse(data.payload);
        } catch {
          // Keep as string template
        }
      }

      if (isEdit && initialData) {
        await useWebhookStore.getState().saveWebhook(data, initialData.id);
        Swal.fire({ icon: "success", title: "Saved!", text: "Webhook updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await useWebhookStore.getState().saveWebhook(data);
        Swal.fire({ icon: "success", title: "Created!", text: "Webhook created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/webhooks");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to save webhook" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Webhook Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Zapier Lead Sync Webhook"
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
            HTTP Method <span className="text-red-500">*</span>
          </label>
          <select
            {...register("method")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Endpoint URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("end_point")}
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.end_point ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.end_point && <p className="text-xs text-red-500 mt-1">{errors.end_point.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Payload Format
          </label>
          <select
            {...register("payload_type")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="default">Default JSON</option>
            <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
            <option value="raw">Raw</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Raw Content Type
          </label>
          <select
            {...register("raw_payload_type")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="json">application/json</option>
            <option value="text">text/plain</option>
          </select>
        </div>

        {payloadType === "default" && (
          <div className="md:col-span-2 bg-blue-50 dark:bg-gray-900/50 p-3 rounded-lg border border-blue-100 dark:border-gray-700 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                Default Payload Structure ({entityType.toUpperCase()})
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                All {entityType} entity attributes automatically included in POST body
              </span>
            </div>
            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
              {currentEntityConfig.defaultJsonPreview}
            </pre>
          </div>
        )}

        {payloadType === "raw" && (
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Custom Payload / Template (JSON or Text)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setValue("payload", currentEntityConfig.defaultRawTemplate)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Reset to {entityType} template
                </button>
              </div>
            </div>

            {/* Interactive Placeholder Picker Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 font-semibold mr-1">Insert Placeholders:</span>
              {currentEntityConfig.placeholders.map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => {
                    const cur = watch("payload") || "";
                    setValue("payload", cur ? `${cur}\n  "field": "${ph}"` : ph);
                  }}
                  className="px-2 py-0.5 text-[11px] font-mono bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded border border-blue-200 dark:border-gray-600 transition-colors shadow-xs flex items-center gap-1"
                  title={`Click to insert ${ph}`}
                >
                  <i className="mgc_add_line text-[10px]"></i>
                  {ph}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              {...register("payload")}
              placeholder={currentEntityConfig.defaultRawTemplate}
              className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 bg-gray-50 dark:bg-gray-900"
            ></textarea>
            <p className="text-[11px] text-gray-400">
              Enter custom JSON template or text. Dynamic placeholders starting with <code>{"{{"}</code> and ending with <code>{"}}"}</code> will automatically be replaced with entity attributes upon webhook execution.
            </p>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            {...register("description")}
            placeholder="Optional description of what this webhook triggers..."
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          ></textarea>
        </div>
      </div>

      {/* Headers Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Custom HTTP Headers</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const token = getToken() || localStorage.getItem("token") || localStorage.getItem("jwt_token") || "";
                if (!token) {
                  Swal.fire({
                    icon: "info",
                    title: "No Session Token Found",
                    text: "Please log in to auto-populate your active JWT token, or type your Bearer token manually into the header value field.",
                  });
                }
                const tokenVal = token ? `Bearer ${token}` : "Bearer <YOUR_JWT_TOKEN>";
                const existingIndex = headers.findIndex(h => h.key.toLowerCase() === "authorization");
                let updated = [...headers];
                if (existingIndex >= 0) {
                  updated[existingIndex] = { key: "Authorization", value: tokenVal };
                } else {
                  updated.push({ key: "Authorization", value: tokenVal });
                }
                setHeaders(updated);
                setValue("headers", updated);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800"
            >
              <i className="mgc_key_2_line"></i> + Add Bearer Token Header
            </button>
            <button
              type="button"
              onClick={addHeader}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              <i className="mgc_add_line"></i> Add Header
            </button>
          </div>
        </div>
        {headers.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No custom headers configured.</p>
        ) : (
          headers.map((h, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Header Name (e.g. Authorization)"
                value={h.key}
                onChange={(e) => updateHeader(idx, e.target.value, h.value)}
                className="w-1/2 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Header Value (e.g. Bearer token_xyz)"
                value={h.value}
                onChange={(e) => updateHeader(idx, h.key, e.target.value)}
                className="w-1/2 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeHeader(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Query Params Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">URL Query Parameters</h3>
          <button
            type="button"
            onClick={addQueryParam}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <i className="mgc_add_line"></i> Add Parameter
          </button>
        </div>
        {queryParams.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No query parameters configured.</p>
        ) : (
          queryParams.map((q, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Param Key (e.g. api_key)"
                value={q.key}
                onChange={(e) => updateQueryParam(idx, e.target.value, q.value)}
                className="w-1/2 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <input
                type="text"
                placeholder="Param Value"
                value={q.value}
                onChange={(e) => updateQueryParam(idx, q.key, e.target.value)}
                className="w-1/2 px-3 py-1.5 text-xs border rounded-lg focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => removeQueryParam(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={async () => {
            const endpoint = watch("end_point");
            if (!endpoint || !endpoint.startsWith("http")) {
              Swal.fire({ icon: "warning", title: "Endpoint Required", text: "Please enter a valid Target Endpoint URL to test." });
              return;
            }
            try {
              Swal.fire({ title: "Testing Webhook Endpoint...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
              
              let payloadVal = watch("payload");
              if (typeof payloadVal === "string" && payloadVal.trim()) {
                try {
                  payloadVal = JSON.parse(payloadVal);
                } catch {
                  // Keep as string template
                }
              }

              const res = await API.post("/webhooks/test-direct", {
                name: watch("name") || "Test Webhook",
                entity_type: watch("entity_type") || "leads",
                method: watch("method") || "POST",
                end_point: endpoint,
                payload_type: watch("payload_type") || "default",
                raw_payload_type: watch("raw_payload_type") || "json",
                headers,
                query_params: queryParams,
                payload: payloadVal,
              });

              const resData = res.data;
              Swal.fire({
                icon: "success",
                title: "Test Webhook Dispatched!",
                html: `
                  <div style="text-align: left; font-size: 13px;">
                    <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">${resData?.result?.status_code || 200} OK</span></p>
                    <p><strong>Endpoint:</strong> <code style="word-break: break-all; font-size: 11px;">${endpoint}</code></p>
                    <p style="margin-top: 10px;"><strong>Sent Custom Payload:</strong></p>
                    <pre style="background: #f4f4f4; padding: 10px; border-radius: 6px; max-height: 180px; overflow-y: auto; font-size: 11px; color: #111;">${JSON.stringify(resData?.sent_payload, null, 2)}</pre>
                  </div>
                `,
                confirmButtonColor: "#0088cc",
              });
            } catch (err: any) {
              Swal.fire({ icon: "error", title: "Test Failed", text: err.response?.data?.message || err.message || "Endpoint test failed" });
            }
          }}
          className="px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <i className="mgc_send_line text-sm"></i> Test Endpoint
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/settings/webhooks")}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? "Saving..." : isEdit ? "Update Webhook" : "Create Webhook"}
          </button>
        </div>
      </div>
    </form>
  );
};
