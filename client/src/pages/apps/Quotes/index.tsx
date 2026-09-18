import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";

export interface IQuote {
  id: number;
  subject: string;
  sales_person_name?: string;
  person_name?: string;
  sub_total?: number;
  discount_amount?: number;
  tax_amount?: number;
  adjustment_amount?: number;
  grand_total?: number;
  expired_at?: string;
  created_at?: string;
}

const QuotesPage: React.FC = () => {
  const [quotes, setQuotes] = useState<IQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    fetchQuotes();
  }, [page, perPage]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/quotes?page=${page}&per_page=${perPage}&search=${search}`).catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setQuotes(list);
      setTotal(res.data?.total || list.length);
    } catch {
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Quotes
        </h1>
        <Link
          to="/quotes/create"
          className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          Create Quote
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-48 dark:text-gray-200"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg transition-colors border border-[#bae6fd]"
            >
              Filter
            </button>
          </form>

          {/* Pagination Toolbar */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span>
              {quotes.length > 0 ? `${(page - 1) * perPage + 1} - ${Math.min(page * perPage, total)} of ${total}` : `0 - 0 of ${total}`}
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
              >
                <i className="mgc_left_line text-lg"></i>
              </button>
              <button
                disabled={quotes.length < perPage || page * perPage >= total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500"
              >
                <i className="mgc_right_line text-lg"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <th className="py-3 px-4 font-semibold">Subject</th>
                <th className="py-3 px-4 font-semibold">Sales Person</th>
                <th className="py-3 px-4 font-semibold">Person</th>
                <th className="py-3 px-4 font-semibold">Subtotal</th>
                <th className="py-3 px-4 font-semibold">Discount</th>
                <th className="py-3 px-4 font-semibold">Tax</th>
                <th className="py-3 px-4 font-semibold">Adjustment</th>
                <th className="py-3 px-4 font-semibold">Grand Total</th>
                <th className="py-3 px-4 font-semibold">Expired At</th>
                <th className="py-3 px-4 font-semibold">Created At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                    <p className="mt-2 text-xs">Loading quotes...</p>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium"
                  >
                    No Records Available.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors text-gray-700 dark:text-gray-200"
                  >
                    <td className="py-3 px-4 font-medium text-[#0088cc] hover:underline cursor-pointer">
                      {quote.subject}
                    </td>
                    <td className="py-3 px-4">{quote.sales_person_name || "-"}</td>
                    <td className="py-3 px-4">{quote.person_name || "-"}</td>
                    <td className="py-3 px-4">${Number(quote.sub_total || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">${Number(quote.discount_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">${Number(quote.tax_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">${Number(quote.adjustment_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold">${Number(quote.grand_total || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500">{quote.expired_at || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">{quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button className="text-gray-500 hover:text-[#0088cc] p-1">
                        <i className="mgc_edit_line text-base"></i>
                      </button>
                      <button className="text-gray-500 hover:text-red-500 p-1">
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

export default QuotesPage;
