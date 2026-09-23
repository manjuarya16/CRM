import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IWebForm, IWebFormSubmission } from "@/interface";
import { WebFormPreview } from "./WebFormPreview";

const WebFormsPage: React.FC = () => {
  const [webForms, setWebForms] = useState<IWebForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [previewForm, setPreviewForm] = useState<IWebForm | null>(null);

  // Submissions Modal State
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState<IWebForm | null>(null);
  const [submissions, setSubmissions] = useState<IWebFormSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fetchWebForms = async () => {
    try {
      setLoading(true);
      const res = await API.get("/web-forms").catch(() => ({ data: { data: [] } }));
      setWebForms(res.data?.data || []);
    } catch {
      setWebForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebForms();
  }, []);

  const openSubmissionsModal = async (form?: IWebForm) => {
    try {
      setSelectedFormForSubmissions(form || null);
      setSubmissionsModalOpen(true);
      setLoadingSubmissions(true);
      const url = form ? `/web-forms/${form.id}/submissions` : "/web-forms/submissions";
      const res = await API.get(url).catch(() => ({ data: { data: [] } }));
      setSubmissions(res.data?.data || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleDelete = async (item: IWebForm) => {
    const res = await Swal.fire({
      title: "Delete Web Form?",
      text: `Are you sure you want to delete "${item.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await API.delete(`/web-forms/${item.id}`);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        fetchWebForms();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete" });
      }
    }
  };

  const filtered = webForms.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.form_id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Web Forms" breadCrumbItems={["Settings", "Web Forms"]} />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Web Forms</h1>
          <p className="text-sm text-gray-500 mt-0.5">Embeddable lead capture forms for websites and landing pages</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openSubmissionsModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_list_check_3_line text-lg"></i>
            All Form Entries
          </button>
          <Link
            to="/settings/web-forms/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-lg"></i>
            Create Web Form
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search forms by title or form id..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <i className="mgc_search_line absolute left-3 top-2 text-gray-400"></i>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Per Page:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 focus:outline-none dark:text-gray-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Title</th>
                <th className="py-3.5 px-4">Form ID (Slug)</th>
                <th className="py-3.5 px-4">Lead Pipeline</th>
                <th className="py-3.5 px-4">Fields</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">Loading web forms...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">No web forms found.</td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{item.id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{item.title}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-300">{item.form_id}</td>
                    <td className="py-3 px-4">
                      {item.create_lead ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {item.lead_pipeline_name || "Creates Lead"}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Form Only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {Array.isArray(item.attributes) ? item.attributes.length : 0} fields
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openSubmissionsModal(item)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="View Form Entries / Submissions"
                      >
                        <i className="mgc_inbox_line text-base"></i>
                      </button>
                      <button
                        onClick={() => setPreviewForm(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Preview & Embed"
                      >
                        <i className="mgc_eye_line text-base"></i>
                      </button>
                      <Link
                        to={`/settings/web-forms/${item.id}/edit`}
                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 inline-block"
                        title="Edit"
                      >
                        <i className="mgc_edit_line text-base"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Delete"
                      >
                        <i className="mgc_delete_line text-base"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filtered.length)} of {filtered.length} web forms
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {previewForm && (
        <WebFormPreview form={previewForm} onClose={() => setPreviewForm(null)} />
      )}

      {/* Submissions / Entries Modal */}
      {submissionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {selectedFormForSubmissions ? `Entries: ${selectedFormForSubmissions.title}` : "All Web Form Submissions"}
                </h3>
                <p className="text-xs text-gray-500">
                  Submissions also automatically create new records under <Link to="/leads" className="text-blue-600 underline">Leads</Link>
                </p>
              </div>
              <button onClick={() => setSubmissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase font-semibold border-b dark:border-gray-700">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Form</th>
                    <th className="py-2 px-3">Submitted Payload</th>
                    <th className="py-2 px-3 text-right">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono">
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500 font-sans">Loading entries...</td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 font-sans">No submissions recorded yet.</td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750">
                        <td className="py-2 px-3 text-gray-400">#{sub.id}</td>
                        <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-200 font-sans">{sub.form_title || sub.form_id}</td>
                        <td className="py-2 px-3">
                          <pre className="text-[11px] bg-gray-50 dark:bg-gray-900/50 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {JSON.stringify(sub.data, null, 2)}
                          </pre>
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-right font-sans">
                          {sub.created_at ? new Date(sub.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setSubmissionsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WebFormsPage;
