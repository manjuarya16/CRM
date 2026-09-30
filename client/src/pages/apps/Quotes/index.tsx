import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore } from "@/store";
import { IQuote } from "@/interface";
import API from "@/config";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
import { usePermission } from "@/hooks/usePermission";

const QuotesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("quotes.create");
  const canEdit = hasPermission("quotes.edit");
  const canDelete = hasPermission("quotes.delete");
  const canView = hasPermission("quotes.view");
  const { quotes, total, loading, fetchQuotes, deleteQuote } = useQuoteStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Send Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedQuoteForEmail, setSelectedQuoteForEmail] = useState<any | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // PDF / Print Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  const handleOpenPrintPreview = async (quote: IQuote) => {
    try {
      setLoadingPreview(true);
      setPreviewModalOpen(true);
      const res = await API.get(`/quotes/${quote.id}`);
      setPreviewQuote(res.data?.data || quote);
    } catch {
      setPreviewQuote(quote);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenSendEmail = async (quote: IQuote) => {
    try {
      const res = await API.get(`/quotes/${quote.id}`);
      const fullQuote = res.data?.data || quote;
      setSelectedQuoteForEmail(fullQuote);
      setEmailTo(fullQuote.person_email || "");
      setEmailSubject(`Quotation #${fullQuote.id} - ${fullQuote.subject}`);

      const lines = (fullQuote.items || []).map((it: any) => `- ${it.name} (${it.quantity}x @ $${it.price}) = $${it.total}`).join("\n");
      setEmailBody(
        `Dear Customer,\n\nPlease find attached the quotation details for "${fullQuote.subject}".\n\nGrand Total: $${Number(fullQuote.grand_total || 0).toFixed(2)}\n\nLine Items:\n${lines || "Details available in attachment."}\n\nBest regards,\nCRM Sales Team`
      );
      setEmailModalOpen(true);
    } catch {
      setSelectedQuoteForEmail(quote);
      setEmailTo("");
      setEmailSubject(`Quotation #${quote.id} - ${quote.subject}`);
      setEmailBody(`Dear Customer,\n\nPlease find the quotation for "${quote.subject}". Total: $${quote.grand_total}\n\nBest regards.`);
      setEmailModalOpen(true);
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim()) {
      Swal.fire("Warning", "Recipient email is required", "warning");
      return;
    }
    setSendingEmail(true);
    try {
      await API.post("/mail/send", {
        to: [emailTo.trim()],
        subject: emailSubject,
        reply: emailBody,
        quote_id: selectedQuoteForEmail?.id,
      });
      Swal.fire("Success", "Quote email sent successfully", "success");
      setEmailModalOpen(false);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to send email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Quotes</h1>
        {canCreate && (
          <Link
            to="/quotes/create"
            className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Create Quote
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Filter Bar */}
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
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
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
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* PDF Print Button */}
                      <button
                        onClick={() => handleOpenPrintPreview(quote)}
                        className="text-gray-500 hover:text-[#0088cc] p-1.5 inline-block hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Download / Print PDF"
                      >
                        <i className="mgc_pdf_line text-base"></i>
                      </button>

                      {/* Send Email Button */}
                      <button
                        onClick={() => handleOpenSendEmail(quote)}
                        className="text-gray-500 hover:text-emerald-600 p-1.5 inline-block hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Send Quote to Email"
                      >
                        <i className="mgc_send_line text-base"></i>
                      </button>

                      {/* Edit Button */}
                      <Link
                        to={`/quotes/edit/${quote.id}`}
                        className="text-gray-500 hover:text-[#0088cc] p-1.5 inline-block hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                        title="Edit Quote"
                      >
                        <i className="mgc_edit_line text-base"></i>
                      </Link>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(quote)}
                        className="text-gray-500 hover:text-red-600 p-1.5 inline-block hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
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

      {/* SEND EMAIL MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_send_line text-[#0088cc]"></i> Send Quote by Email
              </h2>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {sendingEmail ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / PDF PREVIEW MODAL */}
      {previewModalOpen && previewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 print:hidden">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_pdf_line text-red-500"></i> Quotation Invoice Preview
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <i className="mgc_print_line"></i> Print / Save as PDF
                </button>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6 text-gray-800 dark:text-gray-200 print:border-none print:p-0">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-[#0088cc] uppercase tracking-wider">QUOTATION</h1>
                  <p className="text-xs text-gray-500 font-mono mt-1">Quote #{previewQuote.id}</p>
                  <p className="text-xs text-gray-500">Subject: {previewQuote.subject}</p>
                </div>
                <div className="text-right text-xs text-gray-500 space-y-0.5">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Date: {new Date(previewQuote.created_at || Date.now()).toLocaleDateString()}</p>
                  <p>Valid Until: {previewQuote.expired_at ? new Date(previewQuote.expired_at).toLocaleDateString() : "30 Days"}</p>
                  <p>Sales Rep: {previewQuote.user_name || "Sales Department"}</p>
                </div>
              </div>

              {/* Addresses Grid */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Billing To:</p>
                  <p className="font-semibold">{previewQuote.person_name || "Customer"}</p>
                  <p>{previewQuote.billing_address?.street_address || "Standard Billing"}</p>
                  <p>{[previewQuote.billing_address?.city, previewQuote.billing_address?.state, previewQuote.billing_address?.postcode, previewQuote.billing_address?.country].filter(Boolean).join(", ")}</p>
                </div>
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Shipping To:</p>
                  <p className="font-semibold">{previewQuote.person_name || "Customer"}</p>
                  <p>{previewQuote.shipping_address?.street_address || previewQuote.billing_address?.street_address || "Same as Billing"}</p>
                  <p>{[previewQuote.shipping_address?.city || previewQuote.billing_address?.city, previewQuote.shipping_address?.state || previewQuote.billing_address?.state, previewQuote.shipping_address?.postcode || previewQuote.billing_address?.postcode, previewQuote.shipping_address?.country || previewQuote.billing_address?.country].filter(Boolean).join(", ")}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Discount</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewQuote.items || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-400">Standard Quotation Package</td>
                      </tr>
                    ) : (
                      (previewQuote.items || []).map((it: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-3 font-medium">{it.name} {it.sku ? `(${it.sku})` : ""}</td>
                          <td className="py-2 px-3 text-right">{it.quantity}</td>
                          <td className="py-2 px-3 text-right">${Number(it.price || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{it.discount_percent || 0}%</td>
                          <td className="py-2 px-3 text-right">{it.tax_percent || 0}%</td>
                          <td className="py-2 px-3 text-right font-semibold">${Number(it.total || (it.quantity * it.price)).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-3">
                <div className="w-64 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${Number(previewQuote.sub_total || previewQuote.grand_total || 0).toFixed(2)}</span>
                  </div>
                  {Number(previewQuote.discount_amount) > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Discount:</span>
                      <span>-${Number(previewQuote.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(previewQuote.tax_amount) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax:</span>
                      <span>+${Number(previewQuote.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(previewQuote.adjustment_amount) !== 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Adjustment:</span>
                      <span>${Number(previewQuote.adjustment_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-300 dark:border-gray-700">
                    <span>Grand Total:</span>
                    <span className="text-[#0088cc]">${Number(previewQuote.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotesPage;
