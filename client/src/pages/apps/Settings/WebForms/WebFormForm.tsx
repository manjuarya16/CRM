import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import API from "@/config";
import Swal from "sweetalert2";
import { webFormSchema, WebFormInput } from "@/schemas";
import { IWebForm, IWebFormAttribute, IPipeline, IAttribute } from "@/interface";

interface WebFormFormProps {
  initialData?: IWebForm | null;
  isEdit?: boolean;
}

export const WebFormForm: React.FC<WebFormFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<IPipeline[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<IAttribute[]>([]);
  const [attributes, setAttributes] = useState<IWebFormAttribute[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WebFormInput>({
    resolver: zodResolver(webFormSchema),
    defaultValues: {
      form_id: "form-" + Math.random().toString(36).substring(2, 9),
      title: "",
      description: "",
      submit_button_label: "Submit Form",
      submit_success_action: "message",
      submit_success_content: "Thank you for reaching out to us. We will get back to you shortly.",
      create_lead: true,
      lead_pipeline_id: null,
      background_color: "#f8fafc",
      form_background_color: "#ffffff",
      form_title_color: "#1e293b",
      form_submit_button_color: "#0088cc",
      attribute_label_color: "#475569",
      attributes: [],
    },
  });

  useEffect(() => {
    API.get("/pipelines").then((res) => setPipelines(res.data?.data || [])).catch(() => {});
    API.get("/attributes").then((res) => {
      const list: IAttribute[] = res.data?.data || [];
      setAvailableAttributes(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setValue("form_id", initialData.form_id);
      setValue("title", initialData.title);
      setValue("description", initialData.description || "");
      setValue("submit_button_label", initialData.submit_button_label || "Submit");
      setValue("submit_success_action", initialData.submit_success_action || "message");
      setValue("submit_success_content", initialData.submit_success_content || "");
      setValue("create_lead", initialData.create_lead ?? true);
      setValue("lead_pipeline_id", initialData.lead_pipeline_id || null);
      setValue("background_color", initialData.background_color || "#f8fafc");
      setValue("form_background_color", initialData.form_background_color || "#ffffff");
      setValue("form_title_color", initialData.form_title_color || "#1e293b");
      setValue("form_submit_button_color", initialData.form_submit_button_color || "#0088cc");
      setValue("attribute_label_color", initialData.attribute_label_color || "#475569");

      const attrs = Array.isArray(initialData.attributes) ? initialData.attributes : [];
      setAttributes(attrs);
      setValue("attributes", attrs);
    }
  }, [initialData, setValue]);

  const addAttributeField = (attr: IAttribute) => {
    if (attributes.some((a) => a.attribute_id === attr.id)) return;
    const newField: IWebFormAttribute = {
      attribute_id: attr.id || 0,
      attribute_code: attr.code,
      attribute_name: attr.name,
      attribute_type: attr.type,
      name: attr.name,
      placeholder: "Enter " + attr.name,
      is_required: attr.is_required || false,
      is_hidden: false,
      sort_order: attributes.length + 1,
    };
    const updated = [...attributes, newField];
    setAttributes(updated);
    setValue("attributes", updated);
  };

  const removeAttributeField = (idx: number) => {
    const updated = attributes.filter((_, i) => i !== idx);
    setAttributes(updated);
    setValue("attributes", updated);
  };

  const updateAttributeField = (idx: number, patch: Partial<IWebFormAttribute>) => {
    const updated = [...attributes];
    updated[idx] = { ...updated[idx], ...patch };
    setAttributes(updated);
    setValue("attributes", updated);
  };

  const onSubmit = async (data: WebFormInput) => {
    try {
      setLoading(true);
      data.attributes = attributes;

      if (isEdit && initialData) {
        await API.put(`/web-forms/${initialData.id}`, data);
        Swal.fire({ icon: "success", title: "Saved!", text: "Web form updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/web-forms", data);
        Swal.fire({ icon: "success", title: "Created!", text: "Web form created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/web-forms");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save web form" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* General Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Form Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("title")}
            placeholder="e.g. Contact Us Website Form"
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Form Unique Identifier (Slug) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("form_id")}
            placeholder="e.g. website-contact-form"
            className="w-full px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
          {errors.form_id && <p className="text-xs text-red-500 mt-1">{errors.form_id.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            {...register("description")}
            placeholder="Optional form description or instructions shown at the top..."
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Submit Button Label
          </label>
          <input
            type="text"
            {...register("submit_button_label")}
            placeholder="Submit"
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Pipeline for Created Leads
          </label>
          <select
            {...register("lead_pipeline_id")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="">-- Default Pipeline --</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Success Action
          </label>
          <select
            {...register("submit_success_action")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="message">Display Thank You Message</option>
            <option value="redirect">Redirect to Custom URL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Success Message or Redirect URL
          </label>
          <input
            type="text"
            {...register("submit_success_content")}
            placeholder="Thank you for your submission or https://mysite.com/thanks"
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="create_lead_chk"
            {...register("create_lead")}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="create_lead_chk" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Automatically create a new Lead in CRM upon form submission
          </label>
        </div>
      </div>

      {/* Styling Customization */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Colors & Styling</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Page BG</label>
            <input type="color" {...register("background_color")} className="w-full h-8 rounded border cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Form BG</label>
            <input type="color" {...register("form_background_color")} className="w-full h-8 rounded border cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title Color</label>
            <input type="color" {...register("form_title_color")} className="w-full h-8 rounded border cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Button Color</label>
            <input type="color" {...register("form_submit_button_color")} className="w-full h-8 rounded border cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Label Color</label>
            <input type="color" {...register("attribute_label_color")} className="w-full h-8 rounded border cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Form Fields Builder */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Form Fields & Attributes</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Add Field:</span>
            <select
              onChange={(e) => {
                const id = Number(e.target.value);
                const a = availableAttributes.find((x) => x.id === id);
                if (a) addAttributeField(a);
                e.target.value = "";
              }}
              defaultValue=""
              className="px-2 py-1 text-xs border rounded focus:outline-none dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="" disabled>-- Select Attribute --</option>
              {availableAttributes.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
              ))}
            </select>
          </div>
        </div>

        {attributes.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No fields configured yet. Pick attributes from the dropdown above.</p>
        ) : (
          <div className="space-y-2">
            {attributes.map((attr, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-gray-400">#{idx + 1}</span>
                <input
                  type="text"
                  placeholder="Label"
                  value={attr.name || ""}
                  onChange={(e) => updateAttributeField(idx, { name: e.target.value })}
                  className="px-2.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 flex-1 min-w-[120px]"
                />
                <input
                  type="text"
                  placeholder="Placeholder"
                  value={attr.placeholder || ""}
                  onChange={(e) => updateAttributeField(idx, { placeholder: e.target.value })}
                  className="px-2.5 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 flex-1 min-w-[120px]"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={attr.is_required}
                    onChange={(e) => updateAttributeField(idx, { is_required: e.target.checked })}
                    className="w-3.5 h-3.5"
                  />
                  Required
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={attr.is_hidden}
                    onChange={(e) => updateAttributeField(idx, { is_hidden: e.target.checked })}
                    className="w-3.5 h-3.5"
                  />
                  Hidden
                </label>
                <button
                  type="button"
                  onClick={() => removeAttributeField(idx)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <i className="mgc_delete_line text-base"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/settings/web-forms")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? "Saving..." : isEdit ? "Update Web Form" : "Create Web Form"}
        </button>
      </div>
    </form>
  );
};
