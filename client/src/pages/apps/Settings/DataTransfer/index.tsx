import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IImport } from "@/interface";

const DataTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const [imports, setImports] = useState<IImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  const fetchImports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/data-transfer/imports", {
        params: { search: search || undefined },
      }).catch(() => ({ data: { data: [] } }));
      setImports(res.data?.data || []);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchImports();
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete Import Record?",
      text: "Are you sure you want to delete this import history log?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/data-transfer/imports/${id}`).catch(() => {});
        setImports(imports.filter((i) => i.id !== id));
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
      } catch {
        Swal.fire({ icon: "error", title: "Error", text: "Failed to delete record" });
      }
    }
  };

  const totalRecords = imports.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const startIndex = totalRecords === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, totalRecords);
  const paginatedImports = imports.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Bar & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-normal">Imports</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Imports
          </h1>
        </div>

        <div>
          <button
            type="button"
            onClick={() => navigate("/settings/data-transfer/create")}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            Create Import
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Search + Filter Button */}
          <form onSubmit={handleFilter} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <i className="mgc_search_line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold rounded-lg text-sm transition-colors"
            >
              Filter
            </button>
          </form>

          {/* Right: Per Page & Pagination Controls */}
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="font-medium">
              {totalRecords === 0 ? "0 - 0 of 0" : `${startIndex} - ${endIndex} of ${totalRecords}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <i className="mgc_chevron_left_line text-base"></i>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <i className="mgc_chevron_right_line text-base"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Uploaded File</th>
                <th className="py-3 px-4">Error File</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4">Completed At</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mr-2"></div>
                    Loading import records...
                  </td>
                </tr>
              ) : paginatedImports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-gray-500 font-medium text-sm">
                    No Records Available.
                  </td>
                </tr>
              ) : (
                paginatedImports.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">#{item.id}</td>
                    <td className="py-3 px-4 capitalize font-semibold">{item.type}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        item.state === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : item.state === "partial"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-[#e0f2fe] text-[#0284c7]"
                      }`}>
                        {item.state || "Completed"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#0088cc] font-medium truncate max-w-[150px]">
                      {item.summary?.fileName || `${item.type}_import.csv`}
                    </td>
                    <td className="py-3 px-4 text-gray-400 italic">
                      {item.summary?.errors ? "error_log.csv" : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      Processed: {item.summary?.processed ?? 0} / Total: {item.summary?.total ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete record"
                      >
                        <i className="mgc_delete_2_line text-base"></i>
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

export default DataTransferPage;
