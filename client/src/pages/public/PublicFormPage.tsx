import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "@/config";
import { IWebForm } from "@/interface";
import { WebFormFieldInput } from "../apps/Settings/WebForms/WebFormFieldInput";

const PublicFormPage: React.FC = () => {
  const { form_id } = useParams<{ form_id: string }>();
  const [form, setForm] = useState<IWebForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!form_id) return;
    setLoading(true);
    API.get(`/web-forms/public/${form_id}`)
      .then((res) => {
        setForm(res.data?.data || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Web form not found");
        setLoading(false);
      });
  }, [form_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form_id || !form) return;
    try {
      setSubmitting(true);
      const res = await API.post(`/web-forms/submit/${form_id}`, formData);
      const data = res.data?.data;
      if (data?.action === "redirect" && data?.content) {
        window.location.href = data.content;
        return;
      }
      setSuccessMessage(form.submit_success_content || "Thank you for your submission.");
      setSubmitted(true);
    } catch (err: any) {
      alert(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center text-sm text-gray-500 animate-pulse">Loading form...</div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl max-w-md w-full text-center shadow-lg">
          <i className="mgc_close_circle_line text-4xl text-red-500 mb-2 block"></i>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Form Not Found</h2>
          <p className="text-xs text-gray-500">{error || "The requested web form does not exist or has been removed."}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: form.background_color || "#f8fafc" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl border border-gray-200/80 p-6 sm:p-8 space-y-6 my-auto"
        style={{ backgroundColor: form.form_background_color || "#ffffff" }}
      >
        {submitted ? (
          <div className="text-center space-y-3 py-6">
            <i className="mgc_check_circle_line text-5xl text-green-500 mx-auto block"></i>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Submission Received</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold" style={{ color: form.form_title_color || "#1e293b" }}>
                {form.title}
              </h2>
              {form.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{form.description}</p>
              )}
            </div>

            <div className="space-y-4 pt-2">
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

            <div className="pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-5 text-sm font-bold text-white rounded-xl shadow-md transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: form.form_submit_button_color || "#0088cc" }}
              >
                {submitting ? "Submitting..." : form.submit_button_label || "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicFormPage;
