import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import API from "@/config";
import Swal from "sweetalert2";
import { webhookSchema, WebhookInput } from "@/schemas";
import { IWebhook } from "@/interface";

interface WebhookFormProps {
  initialData?: IWebhook | null;
  isEdit?: boolean;
}

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

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("entity_type", initialData.entity_type);
      setValue("description", initialData.description || "");
      setValue("method", initialData.method || "POST");
      setValue("end_point", initialData.end_point);
      setValue("payload_type", initialData.payload_type || "default");
      setValue("raw_payload_type", initialData.raw_payload_type || "json");

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

      if (isEdit && initialData) {
        await API.put(`/webhooks/${initialData.id}`, data);
        Swal.fire({ icon: "success", title: "Saved!", text: "Webhook updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/webhooks", data);
        Swal.fire({ icon: "success", title: "Created!", text: "Webhook created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/webhooks");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save webhook" });
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Custom HTTP Headers</h3>
          <button
            type="button"
            onClick={addHeader}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <i className="mgc_add_line"></i> Add Header
          </button>
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

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
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
    </form>
  );
};
