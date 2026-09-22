import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import API from "@/config";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    fetchLeadById, updateLead,
    sources, types, pipelines, stages,
    fetchSources, fetchTypes, fetchPipelines, fetchStages,
  } = useLeadStore();
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lead_value: "",
    status: true,
    lost_reason: "",
    person_id: "",
    lead_source_id: "",
    lead_type_id: "",
    lead_pipeline_id: "",
    lead_pipeline_stage_id: "",
    expected_close_date: "",
  });
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchSources();
    fetchTypes();
    fetchPipelines();
    fetchStages();
    API.get("/persons?limit=100").then(res => {
      if (res.data?.data) setPersons(res.data.data);
    }).catch(() => {});

    if (id) {
      fetchLeadById(Number(id)).then(lead => {
        if (lead) {
          setFormData({
            title: lead.title || "",
            description: lead.description || "",
            lead_value: lead.lead_value ? String(lead.lead_value) : "",
            status: lead.status !== false,
            lost_reason: lead.lost_reason || "",
            person_id: lead.person_id ? String(lead.person_id) : "",
            lead_source_id: lead.lead_source_id ? String(lead.lead_source_id) : "",
            lead_type_id: lead.lead_type_id ? String(lead.lead_type_id) : "",
            lead_pipeline_id: lead.lead_pipeline_id ? String(lead.lead_pipeline_id) : "",
            lead_pipeline_stage_id: lead.lead_pipeline_stage_id ? String(lead.lead_pipeline_stage_id) : "",
            expected_close_date: lead.expected_close_date ? lead.expected_close_date.substring(0, 10) : "",
          });
          if (lead.custom_attributes) {
            if (typeof lead.custom_attributes === "object") {
              setCustomAttributes(lead.custom_attributes);
            } else if (typeof lead.custom_attributes === "string") {
              try {
                setCustomAttributes(JSON.parse(lead.custom_attributes));
              } catch {
                setCustomAttributes({});
              }
            }
          }
        }
        setLoading(false);
      });
    }
  }, [id]);

  // When pipeline changes, reload stages for that pipeline
  const handlePipelineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pipelineId = e.target.value;
    setFormData(prev => ({ ...prev, lead_pipeline_id: pipelineId, lead_pipeline_stage_id: "" }));
    if (pipelineId) {
      fetchStages(Number(pipelineId));
    } else {
      fetchStages();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      Swal.fire("Validation Error", "Title is required", "warning");
      return;
    }
    setSaving(true);
    try {
      await updateLead(Number(id), {
        title: formData.title,
        description: formData.description || undefined,
        lead_value: formData.lead_value ? Number(formData.lead_value) : undefined,
        status: formData.status,
        lost_reason: formData.status ? undefined : (formData.lost_reason || undefined),
        person_id: formData.person_id ? Number(formData.person_id) : undefined,
        lead_source_id: formData.lead_source_id ? Number(formData.lead_source_id) : undefined,
        lead_type_id: formData.lead_type_id ? Number(formData.lead_type_id) : undefined,
        lead_pipeline_id: formData.lead_pipeline_id ? Number(formData.lead_pipeline_id) : undefined,
        lead_pipeline_stage_id: formData.lead_pipeline_stage_id ? Number(formData.lead_pipeline_stage_id) : undefined,
        expected_close_date: formData.expected_close_date || undefined,
        custom_attributes: customAttributes,
      } as any);
      navigate("/leads");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update lead", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/leads" className="text-sm text-[#0088cc] hover:underline flex items-center gap-1 mb-1">
            &larr; Back to Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Edit Lead</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={formData.status ? "true" : "false"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value === "true" })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="true">Open</option>
              <option value="false">Lost / Closed</option>
            </select>
          </div>

          {/* Lost Reason — only when closed */}
          {!formData.status && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lost Reason</label>
              <input
                type="text"
                value={formData.lost_reason}
                onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })}
                placeholder="Reason for losing lead"
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
              />
            </div>
          )}

          {/* Lead Value */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead Value ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.lead_value}
              onChange={(e) => setFormData({ ...formData, lead_value: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
            <select
              value={formData.person_id}
              onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="">Select Person</option>
              {persons.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Lead Source */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead Source</label>
            <select
              value={formData.lead_source_id}
              onChange={(e) => setFormData({ ...formData, lead_source_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="">Select Source</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Lead Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Lead Type</label>
            <select
              value={formData.lead_type_id}
              onChange={(e) => setFormData({ ...formData, lead_type_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="">Select Type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Pipeline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pipeline</label>
            <select
              value={formData.lead_pipeline_id}
              onChange={handlePipelineChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="">Select Pipeline</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Stage</label>
            <select
              value={formData.lead_pipeline_stage_id}
              onChange={(e) => setFormData({ ...formData, lead_pipeline_stage_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            >
              <option value="">Select Stage</option>
              {stages.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Expected Close Date</label>
            <input
              type="date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>
        </div>

        {/* Dynamic Custom Attributes for Leads */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <DynamicAttributeFields
            entityType="leads"
            values={customAttributes}
            onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            to="/leads"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Lead"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditLeadPage;
