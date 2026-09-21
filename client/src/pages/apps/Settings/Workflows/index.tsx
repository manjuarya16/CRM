import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IWorkflow } from "@/interface";

const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<IWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const res = await API.get("/workflows").catch(() => ({ data: { data: [] } }));
      setWorkflows(res.data?.data || []);
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleDelete = async (item: IWorkflow) => {
    const res = await Swal.fire({
      title: "Delete Workflow?",
      text: `Are you sure you want to delete "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await API.delete(`/workflows/${item.id}`);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        fetchWorkflows();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete" });
      }
    }
  };

  const filtered = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <PageBreadcrumb title="Workflows" breadCrumbItems={["Settings", "Workflows"]} />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Automation Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">Automate events, conditional logic, and custom actions</p>
        </div>
        <Link
          to="/settings/workflows/create"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_add_line text-lg"></i>
          Create Workflow
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Search workflows by name or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <i className="mgc_search_line absolute left-3 top-2 text-gray-400"></i>
          </div>
          <span className="text-xs text-gray-400">{filtered.length} workflows</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Workflow Name</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Trigger Event</th>
                <th className="py-3.5 px-4">Conditions</th>
                <th className="py-3.5 px-4">Actions</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">Loading workflows...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">No workflows found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 text-gray-500 font-mono text-xs">#{item.id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-100">{item.name}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {item.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 capitalize">
                        {item.event}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {Array.isArray(item.conditions) ? item.conditions.length : 0} rules
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {Array.isArray(item.actions) ? item.actions.length : 0} actions
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/settings/workflows/${item.id}/edit`}
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
      </div>
    </div>
  );
};
export default WorkflowsPage;
