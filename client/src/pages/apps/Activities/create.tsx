import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useActivityStore } from "@/store";
import API from "@/config";
import { activitySchema } from "@/schemas";

const CreateActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const { addActivity } = useActivityStore();
  const [leads, setLeads] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "call",
    comment: "",
    schedule_from: "",
    schedule_to: "",
    location: "",
    is_done: false,
    lead_id: "",
    person_id: "",
    user_id: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    API.get("/leads?limit=100").then((res) => {
      if (res.data?.data) setLeads(res.data.data);
    }).catch(() => {});

    API.get("/persons?limit=100").then((res) => {
      if (res.data?.data) setPersons(res.data.data);
    }).catch(() => {});

    API.get("/users?limit=100").then((res) => {
      if (res.data?.data) setUsers(res.data.data);
      else if (Array.isArray(res.data)) setUsers(res.data);
    }).catch(() => {});
  }, []);

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
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errMap[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(errMap);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await addActivity({
        title: formData.title,
        type: formData.type,
        comment: formData.comment || undefined,
        schedule_from: formData.schedule_from || undefined,
        schedule_to: formData.schedule_to || undefined,
        location: formData.location || undefined,
        is_done: formData.is_done,
        lead_id: formData.lead_id ? Number(formData.lead_id) : undefined,
        person_id: formData.person_id ? Number(formData.person_id) : undefined,
        user_id: formData.user_id ? Number(formData.user_id) : undefined,
      });
      navigate("/activities");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create activity", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#0088cc] dark:focus:border-[#0088cc] rounded-xl text-xs sm:text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-100 placeholder-gray-400";
  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/activities" className="text-[#0e90d9] hover:underline">
          Activities
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Create Activity</span>
      </div>

      {/* 🏷️ Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/activities"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Activities"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Create Activity
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 font-mono text-xs font-bold border border-blue-100 dark:border-blue-800/60 shrink-0">
                New
              </span>
            </div>
            {formData.title ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.title}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                Schedule a call, meeting, lunch, or task
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            to="/activities"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="mgc_check_line text-base"></i>
            )}
            <span>Save Activity</span>
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <i className="mgc_time_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Activity Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Timing, participants, and associated CRM records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Title */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="e.g. Call with client regarding new proposal"
                className={`${inputCls} ${errors.title ? "!border-red-500 !ring-red-500/20" : ""}`}
              />
              {errors.title && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.title}</p>}
            </div>

            {/* Type */}
            <div>
              <label className={labelCls}>Type <span className="text-red-500">*</span></label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`${inputCls} capitalize`}
              >
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="lunch">Lunch</option>
                <option value="email">Email</option>
                <option value="note">Note</option>
                <option value="follow_up">Follow Up</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className={labelCls}>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Conference Room A or Zoom link"
                className={inputCls}
              />
            </div>

            {/* Is Done Status */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 bg-gray-50/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100/50 transition">
                <input
                  type="checkbox"
                  id="is_done"
                  checked={formData.is_done}
                  onChange={(e) => setFormData({ ...formData, is_done: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0088cc] focus:ring-[#0088cc] border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mark as Done
                </span>
              </label>
            </div>

            {/* Schedule From */}
            <div>
              <label className={labelCls}>Schedule From</label>
              <input
                type="datetime-local"
                value={formData.schedule_from}
                onChange={(e) => setFormData({ ...formData, schedule_from: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Schedule To */}
            <div>
              <label className={labelCls}>Schedule To</label>
              <input
                type="datetime-local"
                value={formData.schedule_to}
                onChange={(e) => setFormData({ ...formData, schedule_to: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Link Lead */}
            <div>
              <label className={labelCls}>Link Lead</label>
              <select
                value={formData.lead_id}
                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                className={inputCls}
              >
                <option value="">-- None / Select Lead --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            {/* Link Person */}
            <div>
              <label className={labelCls}>Link Person</label>
              <select
                value={formData.person_id}
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                className={inputCls}
              >
                <option value="">-- None / Select Person --</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Assigned User */}
            <div>
              <label className={labelCls}>Assigned User</label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className={inputCls}
              >
                <option value="">-- None / Select User --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Comment / Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>Comment / Notes</label>
              <textarea
                rows={4}
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Activity details, agenda, notes or outcomes..."
                className={`${inputCls} min-h-[100px]`}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateActivityPage;
