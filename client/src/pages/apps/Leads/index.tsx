import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    fetchLeads();
  }, [page, perPage]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/leads?page=${page}&per_page=${perPage}&search=${search}`).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setLeads(list);
      setTotal(res.data?.total || list.length);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Leads</h1>
        <Link
          to="/leads/create"
          className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          Create Lead
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={(e) => { e.preventDefault(); fetchLeads(); }} className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-48 dark:text-gray-200"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd]"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span>{leads.length > 0 ? `${(page - 1) * perPage + 1} - ${Math.min(page * perPage, total)} of ${total}` : `0 - 0 of ${total}`}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <th className="py-3 px-4 font-semibold">Title</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Value</th>
                <th className="py-3 px-4 font-semibold">Contact Person</th>
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Stage</th>
                <th className="py-3 px-4 font-semibold">Created At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                    No Records Available.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-medium text-[#0088cc]">{lead.title}</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-600">{lead.status ? "Active" : "Closed"}</span></td>
                    <td className="py-3 px-4">${Number(lead.lead_value || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">{lead.person_name || "-"}</td>
                    <td className="py-3 px-4">{lead.source_name || "-"}</td>
                    <td className="py-3 px-4">{lead.stage_name || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button className="text-gray-500 hover:text-[#0088cc] p-1"><i className="mgc_edit_line text-base"></i></button>
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

export default LeadsPage;
