import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useActivityStore } from "@/store";
import { activitySchema } from "@/schemas";

const EditActivityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchActivityById, updateActivity } = useActivityStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "call",
    comment: "",
    schedule_from: "",
    schedule_to: "",
    location: "",
    is_done: false,
  });

  useEffect(() => {
    if (id) {
      fetchActivityById(Number(id)).then((act) => {
        if (act) {
          setFormData({
            title: act.title || "",
            type: act.type || "call",
            comment: act.comment || "",
            schedule_from: act.schedule_from ? act.schedule_from.substring(0, 16) : "",
            schedule_to: act.schedule_to ? act.schedule_to.substring(0, 16) : "",
            location: act.location || "",
            is_done: !!act.is_done,
          });
        }
        setLoading(false);
      });
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = activitySchema.safeParse({
      title: formData.title.trim(),
      type: formData.type,
      comment: formData.comment || undefined,
      schedule_from: formData.schedule_from || undefined,
      schedule_to: formData.schedule_to || undefined,
      location: formData.location || undefined,
      is_done: formData.is_done,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      Swal.fire("Validation Error", issue ? issue.message : "Invalid activity data", "warning");
      return;
    }
    setSaving(true);
    try {
      await updateActivity(Number(id), {
        title: formData.title,
        type: formData.type,
        comment: formData.comment || undefined,
        schedule_from: formData.schedule_from || undefined,
        schedule_to: formData.schedule_to || undefined,
        location: formData.location || undefined,
        is_done: formData.is_done,
      });
      navigate("/activities");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update activity", "error");
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
          <Link to="/activities" className="text-sm text-[#0088cc] hover:underline flex items-center gap-1 mb-1">
            &larr; Back to Activities
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Edit Activity</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200 capitalize"
            >
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="lunch">Lunch</option>
              <option value="email">Email</option>
              <option value="note">Note</option>
              <option value="follow_up">Follow Up</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Schedule From</label>
            <input
              type="datetime-local"
              value={formData.schedule_from}
              onChange={(e) => setFormData({ ...formData, schedule_from: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Schedule To</label>
            <input
              type="datetime-local"
              value={formData.schedule_to}
              onChange={(e) => setFormData({ ...formData, schedule_to: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_done_edit"
              checked={formData.is_done}
              onChange={(e) => setFormData({ ...formData, is_done: e.target.checked })}
              className="h-4 w-4 text-[#0088cc] rounded border-gray-300 focus:ring-[#0088cc]"
            />
            <label htmlFor="is_done_edit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mark as Done
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Comment / Notes</label>
            <textarea
              rows={4}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            to="/activities"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Activity"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditActivityPage;
