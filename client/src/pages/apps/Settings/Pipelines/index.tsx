import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IPipeline } from "@/interface";
import { usePermission } from "@/hooks/usePermission";

const PipelinesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.pipelines.create");
  const canEdit = hasPermission("settings.pipelines.edit");
  const canDelete = hasPermission("settings.pipelines.delete");
  const canView = hasPermission("settings.pipelines.view");
  const [pipelines, setPipelines] = useState<IPipeline[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const res = await API.get("/pipelines");
      setPipelines(res.data?.data || []);
    } catch {
      setPipelines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (pipeline: IPipeline) => {
    if (pipeline.is_default) {
      Swal.fire("Action Blocked", "Default pipeline cannot be deleted.", "warning");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: `Delete pipeline "${pipeline.name}"? Leads will be migrated to the default pipeline.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/pipelines/${pipeline.id}`);
          Swal.fire("Deleted!", "Pipeline has been deleted.", "success");
          fetchPipelines();
        } catch (err: any) {
          Swal.fire(
            "Error",
            err?.response?.data?.message || "Failed to delete pipeline",
            "error"
          );
        }
      }
    });
  };

  // Filter and pagination
  const filteredPipelines = useMemo(() => {
    if (!search.trim()) return pipelines;
    const q = search.toLowerCase();
    return pipelines.filter(
      (p) =>
        String(p.id).includes(q) ||
        (p.name && p.name.toLowerCase().includes(q))
    );
  }, [pipelines, search]);

  const totalPages = Math.ceil(filteredPipelines.length / perPage) || 1;
  const paginatedPipelines = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredPipelines.slice(start, start + perPage);
  }, [filteredPipelines, page, perPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedPipelines.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Pipelines</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Pipelines
          </h1>
        </div>
        {canCreate && (
          <Link
            to="/settings/pipelines/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-lg"></i>
            Create Pipeline
          </Link>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters and Controls Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Search by ID or Name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Per Page:
            </span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0088cc]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedPipelines.length > 0 &&
                      paginatedPipelines.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                  />
                </th>
                <th className="p-4 w-16">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Stages</th>
                <th className="p-4 text-center">Rotten Days</th>
                <th className="p-4 text-center">Default</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0088cc]"></div>
                    <p className="mt-2 text-xs">Loading pipelines...</p>
                  </td>
                </tr>
              ) : paginatedPipelines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <i className="mgc_git_commit_line text-4xl text-gray-300 dark:text-gray-600"></i>
                    <p className="mt-2 text-sm">No pipelines found.</p>
                  </td>
                </tr>
              ) : (
                paginatedPipelines.map((pipeline) => (
                  <tr
                    key={pipeline.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(pipeline.id)}
                        onChange={() => handleSelectOne(pipeline.id)}
                        className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                      />
                    </td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                      {pipeline.id}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/settings/pipelines/edit/${pipeline.id}`}
                          className="font-semibold text-[#0088cc] hover:underline"
                        >
                          {pipeline.name}
                        </Link>
                        {pipeline.is_default && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                        {pipeline.stages && pipeline.stages.length > 0 ? (
                          pipeline.stages.map((st, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                            >
                              <span>{st.name}</span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {st.probability}%
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No stages</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <i className="mgc_alarm_line text-sm"></i>
                        {pipeline.rotten_days || 30} days
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {pipeline.is_default ? (
                        <span className="text-emerald-500 font-bold text-base">
                          <i className="mgc_check_circle_fill"></i>
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 font-bold text-base">
                          <i className="mgc_close_circle_line"></i>
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <Link
                            to={`/settings/pipelines/edit/${pipeline.id}`}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="Edit Pipeline"
                          >
                            <i className="mgc_edit_line text-base"></i>
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(pipeline)}
                            className={`p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors ${
                              pipeline.is_default ? "opacity-30 cursor-not-allowed" : ""
                            }`}
                            title="Delete Pipeline"
                            disabled={pipeline.is_default}
                          >
                            <i className="mgc_delete_2_line text-base"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredPipelines.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredPipelines.length)} of{" "}
            {filteredPipelines.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipelinesPage;
