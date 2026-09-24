import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/utils/zodResolver";
import API from "@/config";
import Swal from "sweetalert2";
import { campaignSchema, CampaignInput } from "@/schemas";
import { ICampaign, IEmailTemplate, IEvent, CampaignFormProps } from "@/interface";

export const CampaignForm: React.FC<CampaignFormProps> = ({ initialData, isEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<IEmailTemplate[]>([]);
  const [events, setEvents] = useState<IEvent[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      status: true,
      type: "general",
      mail_to: "leads",
      spooling: "",
      marketing_template_id: null,
      marketing_event_id: null,
    },
  });

  useEffect(() => {
    API.get("/email-templates").then((res) => setTemplates(res.data?.data || [])).catch(() => {});
    API.get("/events").then((res) => setEvents(res.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("subject", initialData.subject);
      setValue("status", initialData.status);
      setValue("type", initialData.type || "general");
      setValue("mail_to", initialData.mail_to || "leads");
      setValue("spooling", initialData.spooling || "");
      setValue("marketing_template_id", initialData.marketing_template_id || null);
      setValue("marketing_event_id", initialData.marketing_event_id || null);
    }
  }, [initialData, setValue]);

  const onInvalid = (errs: any) => {
    console.log("Zod validation errors:", errs);
  };

  const onSubmit = async (data: CampaignInput) => {
    try {
      setLoading(true);
      if (isEdit && initialData) {
        await API.put(`/campaigns/${initialData.id}`, data);
        Swal.fire({ icon: "success", title: "Saved!", text: "Marketing campaign updated successfully", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/campaigns", data);
        Swal.fire({ icon: "success", title: "Created!", text: "Marketing campaign created successfully", timer: 1500, showConfirmButton: false });
      }
      navigate("/settings/campaigns");
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save campaign" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 max-w-3xl bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Q4 Product Launch Outreach"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Subject Line <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("subject")}
            placeholder="e.g. Special Offer from our Team"
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.subject ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Template
          </label>
          <select
            {...register("marketing_template_id")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="">-- Select Template --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Trigger Event
          </label>
          <select
            {...register("marketing_event_id")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="">-- Select Event (Optional) --</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Audience (Mail To)
          </label>
          <select
            {...register("mail_to")}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="leads">All Leads</option>
            <option value="persons">All Contacts / Persons</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <input
            type="text"
            {...register("type")}
            placeholder="e.g. general, promo, onboarding"
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="campaign_status"
            {...register("status")}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="campaign_status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active Campaign (Running)
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => navigate("/settings/campaigns")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? "Saving..." : isEdit ? "Update Campaign" : "Create Campaign"}
        </button>
      </div>
    </form>
  );
};
