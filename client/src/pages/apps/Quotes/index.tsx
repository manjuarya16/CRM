import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore } from "@/store";
import { IQuote } from "@/interface";

const QuotesPage: React.FC = () => {
  const { quotes, total, loading, fetchQuotes, deleteQuote } = useQuoteStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    fetchQuotes(page, perPage, search);
  }, [page, perPage]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuotes(1, perPage, search);
  };

  const handleDelete = async (quote: IQuote) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete quote "${quote.subject}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteQuote(quote.id);
        fetchQuotes(page, perPage, search);
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to delete quote", "error");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Quotes</h1>
        <Link
          to="/quotes/create"
          className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          + Create Quote
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-56 dark:text-gray-200"
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
          </div>
        </div>

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
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                    No Records Available.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-medium text-[#0088cc]">
                      <Link to={`/quotes/edit/${quote.id}`} className="hover:underline">
                        {quote.subject}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{quote.user_name || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{quote.person_name || "-"}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">${Number(quote.sub_total || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">${Number(quote.discount_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">${Number(quote.tax_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">${Number(quote.adjustment_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">${Number(quote.grand_total || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {quote.expired_at ? new Date(quote.expired_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Link
                        to={`/quotes/edit/${quote.id}`}
                        className="text-gray-500 hover:text-[#0088cc] p-1 inline-block"
                        title="Edit Quote"
                      >
                        <i className="mgc_edit_line text-base"></i>
                      </Link>
                      <button
                        onClick={() => handleDelete(quote)}
                        className="text-gray-500 hover:text-red-600 p-1 inline-block"
                        title="Delete Quote"
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

        {/* Pagination */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>
              {quotes.length > 0
                ? `${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total}`
                : `0 of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                {page} / {Math.ceil(total / perPage)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                disabled={page >= Math.ceil(total / perPage)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotesPage;
