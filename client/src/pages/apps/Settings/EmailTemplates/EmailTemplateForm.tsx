import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import API from "@/config";
import Swal from "sweetalert2";
import { emailTemplateSchema, EmailTemplateInput } from "@/schemas";
import { IEmailTemplate } from "@/interface";

interface EmailTemplateFormProps {
  initialData?: IEmailTemplate | null;
  isEdit?: boolean;
}

const PLACEHOLDERS = [
  { label: "Lead Name", tag: "{%lead.name%}" },
  { label: "Lead Title", tag: "{%lead.title%}" },
  { label: "Lead Value", tag: "{%lead.lead_value%}" },
  { label: "Contact Name", tag: "{%person.name%}" },
  { label: "Contact Email", tag: "{%person.email%}" },
  { label: "User Name", tag: "{%user.name%}" },
  { label: "User Email", tag: "{%user.email%}" },
];

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailTemplateInput>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      subject: "",
      content: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("subject", initialData.subject);
      setValue("content", initialData.content);
    }
  }, [initialData, setValue]);

  const insertTag = (tag: string) => {
    const current = watch("content") || "";
    setValue("content", current + " " + tag + " ");
  };

  const onInvalid = (errs: any) => {
    console.log("Zod validation errors:", errs);
  };

  const onSubmit = async (data: EmailTemplateInput) => {
    try {
      setLoading(true);
      if (isEdit && initialData) {
        await API.put(`/email-templates/${initialData.id}`, data);
        Swal.fire({ icon: "success", title: "Saved!", text: "Email template updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/email-templates", data);
        Swal.fire({ icon: "success", title: "Created!", text: "Email template created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/email-templates");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save email template" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-4xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Welcome Lead Onboarding Email"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject Line <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("subject")}
            placeholder="e.g. Welcome to {%lead.title%}!"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.subject ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Template Body / Content <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400">Insert tag:</span>
              {PLACEHOLDERS.map((p) => (
                <button
                  type="button"
                  key={p.tag}
                  onClick={() => insertTag(p.tag)}
                  className="text-[11px] px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            rows={12}
            {...register("content")}
            placeholder="Hi {%person.name%},

Thank you for reaching out regarding {%lead.title%}.

Best regards,
{%user.name%}"
            className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.content ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          ></textarea>
          {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/settings/email-templates")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? "Saving..." : isEdit ? "Update Template" : "Create Template"}
        </button>
      </div>
    </form>
  );
};
