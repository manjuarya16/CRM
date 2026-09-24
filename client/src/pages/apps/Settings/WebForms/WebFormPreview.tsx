import React, { useState } from "react";
import { IWebForm } from "@/interface";
import Swal from "sweetalert2";
import API from "@/config";
import { WebFormFieldInput } from "./WebFormFieldInput";

interface WebFormPreviewProps {
  form: IWebForm;
  onClose: () => void;
}

export const WebFormPreview: React.FC<WebFormPreviewProps> = ({ form, onClose }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.post(`/web-forms/submit/${form.form_id}`, formData);
      if (form.submit_success_action === "redirect" && form.submit_success_content) {
        Swal.fire({
          icon: "success",
          title: "Redirecting...",
          text: `Would redirect to: ${form.submit_success_content}`,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: form.submit_success_content || "Thank you for your submission.",
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Submission Failed", text: err.message || "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 my-8">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <div>
            <span className="text-xs uppercase font-semibold text-blue-600 dark:text-blue-400">Live Preview & Embed</span>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{form.title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>

        {/* Embed code snippet */}
        <div className="bg-gray-50 dark:bg-gray-900/70 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
          <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">HTML Embed Code:</p>
          <code className="text-blue-600 dark:text-blue-300 select-all block break-all font-mono">
            {`<iframe src="${window.location.origin}/forms/${form.form_id}" width="100%" height="450" frameborder="0"></iframe>`}
          </code>
        </div>

        {/* Live Form Mock Container */}
        <div
          className="p-6 rounded-xl border border-gray-200 shadow-inner"
          style={{ backgroundColor: form.background_color || "#f8fafc" }}
        >
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-xl shadow-md space-y-4"
            style={{ backgroundColor: form.form_background_color || "#ffffff" }}
          >
            <h4 className="text-xl font-bold" style={{ color: form.form_title_color || "#1e293b" }}>
              {form.title}
            </h4>
            {form.description && (
              <p className="text-xs text-gray-500">{form.description}</p>
            )}

            <div className="space-y-3 pt-2">
              {(form.attributes || []).map((attr, idx) => {
                const key = attr.attribute_code || `field_${idx}`;
                return (
                  <WebFormFieldInput
                    key={idx}
                    attr={attr}
                    value={formData[key]}
                    onChange={(val) => setFormData({ ...formData, [key]: val })}
                    labelColor={form.attribute_label_color || "#475569"}
                  />
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-lg shadow transition-opacity hover:opacity-90"
                style={{ backgroundColor: form.form_submit_button_color || "#0088cc" }}
              >
                {submitting ? "Submitting..." : form.submit_button_label || "Submit"}
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
