import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore, useMailStore } from "@/store";
import { IQuote, IQuoteItem } from "@/interface";
import { API } from "@/config";
import { usePermission } from "@/hooks/usePermission";

const formatAmount = (val?: number | string | null) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getInitials = (name?: string) => {
  if (!name) return "C";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name?: string) => {
  const colors = [
    "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  ];
  if (!name) return colors[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

const getQuoteStatus = (expiredAt?: string | null) => {
  if (!expiredAt) {
    return {
      status: "active" as const,
      label: "Active",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      daysText: "No expiry set",
    };
  }
  const exp = new Date(expiredAt);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "expired" as const,
      label: "Expired",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dotClass: "bg-rose-500",
      daysText: `${Math.abs(diffDays)}d ago`,
    };
  } else if (diffDays <= 3) {
    return {
      status: "expiring" as const,
      label: "Expiring Soon",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
      dotClass: "bg-amber-500",
      daysText: diffDays === 0 ? "Expires today" : `${diffDays}d left`,
    };
  } else {
    return {
      status: "active" as const,
      label: "Active",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dotClass: "bg-emerald-500",
      daysText: `${diffDays}d left`,
    };
  }
};

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
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring" | "expired">("all");

  // Expandable row state for separate product entries
  const [expandedQuoteIds, setExpandedQuoteIds] = useState<Record<number, boolean>>({});
  const [quoteItemsMap, setQuoteItemsMap] = useState<Record<number, IQuoteItem[]>>({});
  const [loadingItemsMap, setLoadingItemsMap] = useState<Record<number, boolean>>({});

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

  // Metrics computation
  const stats = useMemo(() => {
    let pipelineTotal = 0;
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    quotes.forEach((q) => {
      pipelineTotal += Number(q.grand_total || 0);
      const st = getQuoteStatus(q.expired_at).status;
      if (st === "active") activeCount++;
      else if (st === "expiring") expiringCount++;
      else if (st === "expired") expiredCount++;
    });

    return {
      totalCount: total,
      pipelineTotal,
      activeCount,
      expiringCount,
      expiredCount,
    };
  }, [quotes, total]);

  // Status Filtered Quotes
  const displayedQuotes = useMemo(() => {
    if (statusFilter === "all") return quotes;
    return quotes.filter((q) => getQuoteStatus(q.expired_at).status === statusFilter);
  }, [quotes, statusFilter]);

  // Separate line item fetching & toggle
  const toggleExpandQuote = async (quoteId: number) => {
    const isCurrentlyExpanded = !!expandedQuoteIds[quoteId];
    setExpandedQuoteIds((prev) => ({ ...prev, [quoteId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !quoteItemsMap[quoteId]) {
      setLoadingItemsMap((prev) => ({ ...prev, [quoteId]: true }));
      try {
        const res = await API.get(`/quotes/${quoteId}/items`);
        if (res.data?.success) {
          setQuoteItemsMap((prev) => ({ ...prev, [quoteId]: res.data.data || [] }));
        }
      } catch (err) {
        console.error("Failed to load items for quote", quoteId, err);
      } finally {
        setLoadingItemsMap((prev) => ({ ...prev, [quoteId]: false }));
      }
    }
  };

  const getItemsForQuote = (quote: IQuote): IQuoteItem[] => {
    if (quoteItemsMap[quote.id]) return quoteItemsMap[quote.id];
    if (quote.items && quote.items.length > 0) return quote.items;
    return [];
  };

  const allExpanded =
    displayedQuotes.length > 0 && displayedQuotes.every((q) => !!expandedQuoteIds[q.id]);

  const toggleExpandAll = async () => {
    if (allExpanded) {
      setExpandedQuoteIds({});
    } else {
      const newExpanded: Record<number, boolean> = {};
      const toFetch: number[] = [];
      displayedQuotes.forEach((q) => {
        newExpanded[q.id] = true;
        if (!quoteItemsMap[q.id] && (!q.items || q.items.length === 0)) {
          toFetch.push(q.id);
        }
      });
      setExpandedQuoteIds(newExpanded);
      if (toFetch.length > 0) {
        await Promise.all(
          toFetch.map(async (id) => {
            try {
              const res = await API.get(`/quotes/${id}/items`);
              if (res.data?.success) {
                setQuoteItemsMap((prev) => ({ ...prev, [id]: res.data.data || [] }));
              }
            } catch (e) {}
          })
        );
      }
    }
  };

  const handleDelete = async (quote: IQuote) => {
    const result = await Swal.fire({
      title: "Delete Quotation?",
      text: `Are you sure you want to delete quote "${quote.subject}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#e11d48",
      confirmButtonText: "Yes, delete it",
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
      const fullQuote = await useQuoteStore.getState().fetchQuoteById(quote.id);
      setPreviewQuote(fullQuote || quote);
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
      const fullQuote = (await useQuoteStore.getState().fetchQuoteById(quote.id)) || quote;
      setSelectedQuoteForEmail(fullQuote);
      setEmailTo(fullQuote.person_email || "");
      setEmailSubject(`Quotation #${fullQuote.id} - ${fullQuote.subject}`);

      const lines = (fullQuote.items || []).map((it: any) => `- ${it.name} (${it.quantity}x @ ₹${it.price}) = ₹${it.total}`).join("\n");
      setEmailBody(
        `Dear Customer,\n\nPlease find attached the quotation details for "${fullQuote.subject}".\n\nGrand Total: ₹${Number(fullQuote.grand_total || 0).toFixed(2)}\n\nLine Items:\n${lines || "Details available in attachment."}\n\nBest regards,\nCRM Sales Team`
      );
      setEmailModalOpen(true);
    } catch {
      setSelectedQuoteForEmail(quote);
      setEmailTo("");
      setEmailSubject(`Quotation #${quote.id} - ${quote.subject}`);
      setEmailBody(`Dear Customer,\n\nPlease find the quotation for "${quote.subject}". Total: ₹${quote.grand_total}\n\nBest regards.`);
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
      const formData = new FormData();
      formData.append("to", JSON.stringify([emailTo.trim()]));
      formData.append("subject", emailSubject);
      formData.append("reply", emailBody);
      if (selectedQuoteForEmail?.id) {
        formData.append("quote_id", String(selectedQuoteForEmail.id));
      }
      await useMailStore.getState().sendEmail(formData);
      Swal.fire("Success", "Quote email sent successfully", "success");
      setEmailModalOpen(false);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to send email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Quotes & Proposals</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0088cc] border border-sky-200 dark:border-sky-800">
              {total} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage customer quotations, track deal validity, and expand separate product entries
          </p>
        </div>

        {canCreate && (
          <Link
            to="/quotes/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all hover:shadow active:scale-98 w-full sm:w-auto shrink-0"
          >
            <i className="mgc_add_line text-base"></i>
            <span>Create New Quote</span>
          </Link>
        )}
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quotes */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-gray-800 transition-all ${
            statusFilter === "all"
              ? "border-[#0088cc] ring-2 ring-[#0088cc]/20 shadow-sm"
              : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Quotes</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-[#0088cc] flex items-center justify-center">
              <i className="mgc_document_line text-base"></i>
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100 mt-2">{stats.totalCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All created quotations</p>
        </div>

        {/* Pipeline Value */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Page Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <i className="mgc_wallet_line text-base"></i>
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 truncate">
            {formatAmount(stats.pipelineTotal)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Sum of current page quotes</p>
        </div>

        {/* Active & Valid */}
        <div
          onClick={() => setStatusFilter("active")}
          className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-gray-800 transition-all ${
            statusFilter === "active"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
              : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Quotes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <i className="mgc_check_circle_line text-base"></i>
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100 mt-2">{stats.activeCount}</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Within validity period</p>
        </div>

        {/* Expiring / Expired */}
        <div
          onClick={() => setStatusFilter(stats.expiringCount > 0 ? "expiring" : "expired")}
          className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-gray-800 transition-all ${
            statusFilter === "expiring" || statusFilter === "expired"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Expiring / Expired</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <i className="mgc_time_line text-base"></i>
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-gray-100 mt-2">
            {stats.expiringCount + stats.expiredCount}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            <span className="text-amber-600 font-medium">{stats.expiringCount} expiring</span> ·{" "}
            <span className="text-rose-500 font-medium">{stats.expiredCount} expired</span>
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        {/* Navigation & Controls Toolbar */}
        <div className="p-3 sm:p-4 border-b border-gray-200/80 dark:border-gray-700 space-y-3">
          {/* Top Row: Status Filter Tabs & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="inline-flex p-1 bg-gray-100/80 dark:bg-gray-900/60 rounded-xl text-xs font-semibold gap-1 overflow-x-auto max-w-full no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <span>All</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {quotes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === "active"
                    ? "bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Active</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {stats.activeCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("expiring")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === "expiring"
                    ? "bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Expiring Soon</span>
                {stats.expiringCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    {stats.expiringCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("expired")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === "expired"
                    ? "bg-white dark:bg-gray-800 text-rose-700 dark:text-rose-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Expired</span>
                {stats.expiredCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    {stats.expiredCount}
                  </span>
                )}
              </button>
            </div>

            {/* View Mode Toggle & Expand All Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleExpandAll}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-2xs flex items-center gap-1.5"
                title={allExpanded ? "Collapse all separate entries" : "Expand all separate entries"}
              >
                <i className={`mgc_down_line text-sm transition-transform ${allExpanded ? "rotate-180 text-[#0088cc]" : ""}`}></i>
                <span className="hidden sm:inline">{allExpanded ? "Collapse All Entries" : "Expand All Entries"}</span>
                <span className="sm:hidden">{allExpanded ? "Collapse" : "Expand"}</span>
              </button>

              <div className="inline-flex p-1 bg-gray-100/80 dark:bg-gray-900/60 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === "table"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                  title="Table View"
                >
                  <i className="mgc_table_line text-base"></i>
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                  title="Grid Cards View"
                >
                  <i className="mgc_grid_2_line text-base"></i>
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Search, Clear & Per-page */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <form onSubmit={handleFilter} className="flex items-center gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <i className="mgc_search_line text-base"></i>
                </span>
                <input
                  type="text"
                  placeholder="Search by quote subject, customer or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] dark:text-gray-200 transition-all placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                      fetchQuotes(1, perPage, "");
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <i className="mgc_close_line text-sm"></i>
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm transition-all shrink-0"
              >
                Search
              </button>
            </form>

            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs text-gray-500 dark:text-gray-400">
              <span>
                Showing <strong className="text-gray-800 dark:text-gray-200">{displayedQuotes.length}</strong> of{" "}
                <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <span>Per Page:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading quotations...</p>
          </div>
        ) : displayedQuotes.length === 0 ? (
          /* EMPTY STATE */
          <div className="p-12 sm:p-16 text-center max-w-sm mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
              <i className="mgc_document_line text-2xl"></i>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">No Quotations Found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {statusFilter !== "all"
                ? `There are no quotes matching the "${statusFilter}" filter right now.`
                : search
                ? `No quotes match the search term "${search}".`
                : "Get started by generating your first customer quotation."}
            </p>
            {statusFilter !== "all" ? (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="mt-2 text-xs font-semibold text-[#0088cc] hover:underline"
              >
                Clear Status Filter
              </button>
            ) : canCreate ? (
              <Link
                to="/quotes/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 mt-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <i className="mgc_add_line text-sm"></i>
                <span>Create Quote</span>
              </Link>
            ) : null}
          </div>
        ) : viewMode === "cards" ? (
          /* CARDS / GRID VIEW (With Crystal-Clear Standalone Cards) */
          <div className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-gray-100/60 dark:bg-gray-900/40">
            {displayedQuotes.map((quote) => {
              const statusInfo = getQuoteStatus(quote.expired_at);
              const avatarCls = getAvatarColor(quote.person_name);
              const isExpanded = !!expandedQuoteIds[quote.id];
              const items = getItemsForQuote(quote);
              const loadingItems = !!loadingItemsMap[quote.id];

              return (
                <div
                  key={quote.id}
                  className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden flex flex-col justify-between hover:shadow-lg hover:border-[#0088cc]/60 transition-all duration-200"
                >
                  {/* 🟢 CARD START: Distinct Header Banner */}
                  <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 border-b-2 border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#0088cc] text-white shadow-2xs">
                        #QT-{quote.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      {formatAmount(quote.grand_total)}
                    </span>
                  </div>

                  {/* 📄 CARD BODY */}
                  <div className="p-4 space-y-3.5 flex-1">
                    {/* Subject */}
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white hover:text-[#0088cc] transition-colors line-clamp-2">
                        <Link to={`/quotes/edit/${quote.id}`}>{quote.subject}</Link>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <i className="mgc_calendar_line text-xs"></i>
                        <span>Created {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "Recently"}</span>
                      </p>
                    </div>

                    {/* Customer Row */}
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${avatarCls} shrink-0`}
                      >
                        {getInitials(quote.person_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">
                          {quote.person_name || "Unassigned Client"}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {quote.person_email || "No email registered"}
                        </p>
                      </div>
                    </div>

                    {/* Financial Highlight Box */}
                    <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                        <span>Subtotal:</span>
                        <strong className="text-gray-900 dark:text-white">{formatAmount(quote.sub_total)}</strong>
                      </div>
                      {Number(quote.discount_amount) > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-rose-500">
                          <span>Discount:</span>
                          <span>-{formatAmount(quote.discount_amount)}</span>
                        </div>
                      )}
                      {Number(quote.tax_amount) > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                          <span>Tax:</span>
                          <span>+{formatAmount(quote.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                        <span className="flex items-center gap-1">
                          <i className="mgc_user_star_line text-amber-500"></i>
                          <span>{quote.user_name || "Sales Rep"}</span>
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <i className="mgc_time_line"></i>
                          <span>{statusInfo.daysText}</span>
                        </span>
                      </div>
                    </div>

                    {/* Separate Line Items Button & Expandable Details */}
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleExpandQuote(quote.id)}
                        className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                          isExpanded
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-[#0088cc]"
                            : "bg-gray-50 dark:bg-gray-900/50 border-gray-200/80 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <i className="mgc_box_line text-sm"></i>
                          <span>Separate Product Entries</span>
                          {items.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0088cc]/10 text-[#0088cc]">
                              {items.length}
                            </span>
                          )}
                        </span>
                        <i
                          className={`mgc_down_line text-xs transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        ></i>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/70 dark:border-gray-700/70 space-y-2 animate-in fade-in">
                          {loadingItems ? (
                            <div className="py-2 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                              <div className="w-3.5 h-3.5 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
                              <span>Loading items...</span>
                            </div>
                          ) : items.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-1 text-center">
                              No separate line items registered.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs space-y-1"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                        {item.name || `Item ${idx + 1}`}
                                      </p>
                                      {item.sku && (
                                        <span className="text-[10px] font-mono text-gray-400">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white shrink-0">
                                      {formatAmount(
                                        item.total || Number(item.quantity || 1) * Number(item.price || 0)
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-0.5 border-t border-gray-100 dark:border-gray-700/60">
                                    <span>
                                      {item.quantity}x @ {formatAmount(item.price)}
                                    </span>
                                    {Number(item.discount_amount || 0) > 0 && (
                                      <span className="text-rose-500">-{formatAmount(item.discount_amount)}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 🔴 CARD END: Actions Toolbar (No text truncation) */}
                  <div className="bg-slate-50/90 dark:bg-slate-900/60 p-3 sm:px-4 sm:py-2.5 border-t-2 border-gray-100 dark:border-gray-700/80">
                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPrintPreview(quote)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 active:scale-95 transition shadow-2xs whitespace-nowrap"
                        title="Download / Print PDF"
                      >
                        <i className="mgc_pdf_line text-red-500 text-sm shrink-0"></i>
                        <span>View PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSendEmail(quote)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                        title="Send Quote to Email"
                      >
                        <i className="mgc_send_line text-emerald-600 text-sm shrink-0"></i>
                        <span>Send Email</span>
                      </button>

                      {canEdit && (
                        <Link
                          to={`/quotes/edit/${quote.id}`}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                          title="Edit Quote"
                        >
                          <i className="mgc_edit_line text-sky-600 text-sm shrink-0"></i>
                          <span>Edit Quote</span>
                        </Link>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(quote)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                          title="Delete Quote"
                        >
                          <i className="mgc_delete_line text-sm shrink-0"></i>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* STREAMLINED TABLE VIEW WITH CRYSTAL-CLEAR MOBILE CARDS */
          <>
            {/* 📱 MOBILE CARDS (Unmistakable Start & End Boundaries with 16px Gaps) */}
            <div className="block md:hidden p-3.5 sm:p-4 space-y-5 bg-gray-100/70 dark:bg-gray-900/50">
              {displayedQuotes.map((quote) => {
                const statusInfo = getQuoteStatus(quote.expired_at);
                const avatarCls = getAvatarColor(quote.person_name);
                const isExpanded = !!expandedQuoteIds[quote.id];
                const items = getItemsForQuote(quote);
                const loadingItems = !!loadingItemsMap[quote.id];

                return (
                  <div
                    key={quote.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200/90 dark:border-gray-700 shadow-md overflow-hidden transition-all"
                  >
                    {/* 🟢 CARD START: Distinct Header Banner */}
                    <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-3 border-b-2 border-gray-100 dark:border-gray-700/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#0088cc] text-white shadow-2xs">
                          #QT-{quote.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 inline-block shadow-2xs">
                          {formatAmount(quote.grand_total)}
                        </span>
                      </div>
                    </div>

                    {/* 📄 CARD BODY */}
                    <div className="p-4 space-y-3.5">
                      {/* Subject */}
                      <div>
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 break-words line-clamp-2">
                          <Link to={`/quotes/edit/${quote.id}`} className="hover:text-[#0088cc] transition-colors">
                            {quote.subject}
                          </Link>
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <i className="mgc_calendar_line text-xs"></i>
                          <span>Created {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : "Recently"}</span>
                        </p>
                      </div>

                      {/* Customer & Rep Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Customer</span>
                          <div className="flex items-center gap-1.5 truncate">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border ${avatarCls} shrink-0`}
                            >
                              {getInitials(quote.person_name)}
                            </div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {quote.person_name || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Sales Rep</span>
                          <p className="font-medium text-gray-700 dark:text-gray-300 truncate flex items-center gap-1">
                            <i className="mgc_user_star_line text-xs text-amber-500 shrink-0"></i>
                            <span className="truncate">{quote.user_name || "Admin"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Subtotal & Expiry */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-0.5">
                        <div className="flex items-center gap-2">
                          <span>Subtotal: <strong className="text-gray-700 dark:text-gray-300">{formatAmount(quote.sub_total)}</strong></span>
                          {Number(quote.discount_amount) > 0 && (
                            <span className="text-rose-500 font-semibold">-{formatAmount(quote.discount_amount)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 font-medium text-[11px]">
                          <i className="mgc_time_line text-xs"></i>
                          <span>{statusInfo.daysText}</span>
                        </div>
                      </div>

                      {/* Separate Line Items Accordion */}
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleExpandQuote(quote.id)}
                          className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                            isExpanded
                              ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-[#0088cc]"
                              : "bg-gray-50 dark:bg-gray-900/50 border-gray-200/80 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <i className="mgc_box_line text-sm text-[#0088cc]"></i>
                            <span>Separate Product Line Entries</span>
                            {items.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#0088cc]/10 text-[#0088cc] font-bold">
                                {items.length}
                              </span>
                            )}
                          </span>
                          <i
                            className={`mgc_down_line text-xs transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-[#0088cc]" : "text-gray-400"
                            }`}
                          ></i>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 space-y-2 animate-in fade-in">
                            {loadingItems ? (
                              <div className="py-2 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                                <div className="w-3.5 h-3.5 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading items...</span>
                              </div>
                            ) : items.length === 0 ? (
                              <p className="text-xs text-gray-400 italic text-center py-1">
                                No separate line items registered.
                              </p>
                            ) : (
                              items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 text-xs space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                        {item.name || `Item ${idx + 1}`}
                                      </p>
                                      {item.sku && (
                                        <span className="text-[10px] font-mono text-gray-400">
                                          SKU: {item.sku}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white shrink-0">
                                      {formatAmount(
                                        item.total || Number(item.quantity || 1) * Number(item.price || 0)
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                    <span>
                                      {item.quantity}x @ {formatAmount(item.price)}
                                    </span>
                                    {Number(item.discount_amount || 0) > 0 && (
                                      <span className="text-rose-500">-{formatAmount(item.discount_amount)}</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 🔴 CARD END: Actions Toolbar (No text truncation) */}
                    <div className="bg-slate-50/90 dark:bg-slate-900/60 p-3 sm:px-4 sm:py-2.5 border-t-2 border-gray-100 dark:border-gray-700/80">
                      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintPreview(quote)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 active:scale-95 transition shadow-2xs whitespace-nowrap"
                          title="Download / Print PDF"
                        >
                          <i className="mgc_pdf_line text-red-500 text-sm shrink-0"></i>
                          <span>View PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenSendEmail(quote)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                          title="Send Quote to Email"
                        >
                          <i className="mgc_send_line text-emerald-600 text-sm shrink-0"></i>
                          <span>Send Email</span>
                        </button>

                        {canEdit && (
                          <Link
                            to={`/quotes/edit/${quote.id}`}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                            title="Edit Quote"
                          >
                            <i className="mgc_edit_line text-blue-600 text-sm shrink-0"></i>
                            <span>Edit Quote</span>
                          </Link>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(quote)}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100 active:scale-95 transition shadow-2xs whitespace-nowrap"
                            title="Delete Quote"
                          >
                            <i className="mgc_delete_line text-sm shrink-0"></i>
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 💻 DESKTOP TABLE VIEW (>= md screens) with Expandable Separate Entries */}
            <div className="hidden md:block overflow-x-auto no-scrollbar scroll-smooth">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200/80 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleExpandAll}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition"
                        title={allExpanded ? "Collapse All Entries" : "Expand All Separate Entries"}
                      >
                        <i className={`mgc_down_line text-xs font-bold transition-transform ${allExpanded ? "rotate-180" : ""}`}></i>
                      </button>
                    </th>
                    <th className="py-3 px-4">Quote & Subject</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Sales Rep</th>
                    <th className="py-3 px-4">Validity & Status</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {displayedQuotes.map((quote) => {
                    const statusInfo = getQuoteStatus(quote.expired_at);
                    const avatarCls = getAvatarColor(quote.person_name);
                    const isExpanded = !!expandedQuoteIds[quote.id];
                    const items = getItemsForQuote(quote);
                    const loadingItems = !!loadingItemsMap[quote.id];

                    return (
                      <React.Fragment key={quote.id}>
                        {/* Parent Quote Row */}
                        <tr
                          className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group ${
                            isExpanded ? "bg-sky-50/30 dark:bg-sky-950/20" : ""
                          }`}
                        >
                          {/* Expand Toggle Chevron */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandQuote(quote.id)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                isExpanded
                                  ? "bg-[#0088cc] text-white shadow-2xs rotate-180"
                                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                              }`}
                              title={isExpanded ? "Collapse quote entries" : "Expand separate line item entries"}
                            >
                              <i className="mgc_down_line text-sm"></i>
                            </button>
                          </td>

                          {/* Quote & Subject */}
                          <td className="py-3.5 px-4 min-w-[200px] max-w-[320px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                  #QT-{quote.id}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {quote.created_at ? new Date(quote.created_at).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] transition-colors truncate">
                                <Link to={`/quotes/edit/${quote.id}`}>{quote.subject}</Link>
                              </h4>
                            </div>
                          </td>

                          {/* Customer Info */}
                          <td className="py-3.5 px-4 min-w-[180px]">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${avatarCls} shrink-0`}
                              >
                                {getInitials(quote.person_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-gray-200 truncate text-xs">
                                  {quote.person_name || "Unassigned"}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">
                                  {quote.person_email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Sales Rep */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100/80 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 font-medium">
                              <i className="mgc_user_star_line text-amber-500 text-xs"></i>
                              <span>{quote.user_name || "Admin"}</span>
                            </span>
                          </td>

                          {/* Validity & Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                                <span>{statusInfo.label}</span>
                              </span>
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <i className="mgc_time_line text-xs"></i>
                                <span>
                                  {quote.expired_at
                                    ? `${new Date(quote.expired_at).toLocaleDateString()} (${statusInfo.daysText})`
                                    : "Open validity"}
                                </span>
                              </p>
                            </div>
                          </td>

                          {/* Grand Total & Financial Breakdown */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div>
                              <span className="text-sm font-black text-gray-900 dark:text-white">
                                {formatAmount(quote.grand_total)}
                              </span>
                              <div className="text-[11px] text-gray-400 space-x-1">
                                <span>Sub: {formatAmount(quote.sub_total)}</span>
                                {Number(quote.tax_amount) > 0 && <span>· Tax: +{formatAmount(quote.tax_amount)}</span>}
                                {Number(quote.discount_amount) > 0 && (
                                  <span className="text-rose-500 font-semibold">
                                    · Disc: -{formatAmount(quote.discount_amount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              {/* PDF Print Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPrintPreview(quote)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                title="Print / Save PDF"
                              >
                                <i className="mgc_pdf_line text-base"></i>
                              </button>

                              {/* Send Email Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenSendEmail(quote)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                                title="Email to Client"
                              >
                                <i className="mgc_send_line text-base"></i>
                              </button>

                              {/* Edit Button */}
                              {canEdit && (
                                <Link
                                  to={`/quotes/edit/${quote.id}`}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#0088cc] hover:bg-sky-50 dark:hover:bg-sky-950/30 transition"
                                  title="Edit Quote"
                                >
                                  <i className="mgc_edit_line text-base"></i>
                                </Link>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(quote)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                  title="Delete Quote"
                                >
                                  <i className="mgc_delete_line text-base"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDABLE SEPARATE LINE ITEM ENTRIES ROW */}
                        {isExpanded && (
                          <tr className="bg-sky-50/20 dark:bg-sky-950/15 border-b border-gray-200/80 dark:border-gray-700">
                            <td colSpan={7} className="p-0">
                              <div className="p-4 sm:p-5 sm:pl-14 bg-gradient-to-r from-gray-50/90 via-sky-50/15 to-white dark:from-gray-900/90 dark:via-sky-950/15 dark:to-gray-900/60 border-l-4 border-[#0088cc] space-y-3">
                                {/* Sub-header */}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#0088cc]"></span>
                                    <h5 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                      Quotation Line Items & Separate Product Entries
                                    </h5>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-[#0088cc]">
                                      {items.length} {items.length === 1 ? "entry" : "entries"}
                                    </span>
                                  </div>
                                  {canEdit && (
                                    <Link
                                      to={`/quotes/edit/${quote.id}`}
                                      className="text-xs text-[#0088cc] hover:underline flex items-center gap-1 font-semibold"
                                    >
                                      <i className="mgc_edit_line text-xs"></i>
                                      <span>Edit Line Items</span>
                                    </Link>
                                  )}
                                </div>

                                {/* Items Sub-table */}
                                {loadingItems ? (
                                  <div className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
                                    <span>Loading separate line item entries...</span>
                                  </div>
                                ) : items.length === 0 ? (
                                  <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 text-xs text-gray-500 italic">
                                    No individual product entries recorded for this quotation.
                                  </div>
                                ) : (
                                  <div className="overflow-x-auto rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/70 border-b border-gray-200/80 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px] tracking-wider">
                                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                                          <th className="py-2.5 px-3">Product / Service</th>
                                          <th className="py-2.5 px-3 text-center">Qty</th>
                                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                                          <th className="py-2.5 px-3 text-right">Discount</th>
                                          <th className="py-2.5 px-3 text-right">Tax</th>
                                          <th className="py-2.5 px-3 text-right font-bold">Line Total</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {items.map((item, idx) => (
                                          <tr key={item.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                                            <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">
                                              <span>{item.name || "Item"}</span>
                                              {item.sku && (
                                                <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                                                  {item.sku}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                                              {item.quantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-400">
                                              {formatAmount(item.price)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-400">
                                              {Number(item.discount_amount || 0) > 0
                                                ? `-${formatAmount(item.discount_amount)}`
                                                : item.discount_percent
                                                ? `${item.discount_percent}%`
                                                : "—"}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-gray-600 dark:text-gray-400">
                                              {Number(item.tax_amount || 0) > 0
                                                ? `+${formatAmount(item.tax_amount)}`
                                                : item.tax_percent
                                                ? `${item.tax_percent}%`
                                                : "—"}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                                              {formatAmount(item.total || Number(item.quantity || 1) * Number(item.price || 0))}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Toolbar */}
        {total > perPage && (
          <div className="p-3 sm:p-4 border-t border-gray-200/80 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 bg-gray-50/40 dark:bg-gray-900/30">
            <span className="text-xs text-gray-500">
              {quotes.length > 0
                ? `${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total} quotations`
                : `0 of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                ← Prev
              </button>
              <span className="px-2 font-bold text-gray-800 dark:text-gray-200 text-xs">
                Page {page} of {Math.ceil(total / perPage)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                disabled={page >= Math.ceil(total / perPage)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEND EMAIL MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_send_line text-[#0088cc]"></i> Send Quote by Email
              </h2>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-semibold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="customer@example.com"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Message Body
                </label>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl w-full p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 print:hidden">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_pdf_line text-red-500"></i> Quotation Invoice Preview
              </h2>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <i className="mgc_print_line"></i> Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold ml-1"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-5 text-gray-800 dark:text-gray-200 print:border-none print:p-0">
              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#0088cc] uppercase tracking-wider">QUOTATION</h1>
                  <p className="text-xs text-gray-500 font-mono mt-1">Quote #{previewQuote.id}</p>
                  <p className="text-xs text-gray-500 break-words">Subject: {previewQuote.subject}</p>
                </div>
                <div className="sm:text-right text-xs text-gray-500 space-y-0.5">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Date: {new Date(previewQuote.created_at || Date.now()).toLocaleDateString()}
                  </p>
                  <p>Valid Until: {previewQuote.expired_at ? new Date(previewQuote.expired_at).toLocaleDateString() : "30 Days"}</p>
                  <p>Sales Rep: {previewQuote.user_name || "Sales Department"}</p>
                </div>
              </div>

              {/* Addresses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs">
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Billing To:</p>
                  <p className="font-semibold">{previewQuote.person_name || "Customer"}</p>
                  <p>{previewQuote.billing_address?.street_address || "Standard Billing"}</p>
                  <p>
                    {[
                      previewQuote.billing_address?.city,
                      previewQuote.billing_address?.state,
                      previewQuote.billing_address?.postcode,
                      previewQuote.billing_address?.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Shipping To:</p>
                  <p className="font-semibold">{previewQuote.person_name || "Customer"}</p>
                  <p>
                    {previewQuote.shipping_address?.street_address ||
                      previewQuote.billing_address?.street_address ||
                      "Same as Billing"}
                  </p>
                  <p>
                    {[
                      previewQuote.shipping_address?.city || previewQuote.billing_address?.city,
                      previewQuote.shipping_address?.state || previewQuote.billing_address?.state,
                      previewQuote.shipping_address?.postcode || previewQuote.billing_address?.postcode,
                      previewQuote.shipping_address?.country || previewQuote.billing_address?.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-2 overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
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
                        <td colSpan={6} className="py-4 text-center text-gray-400">
                          Standard Quotation Package
                        </td>
                      </tr>
                    ) : (
                      (previewQuote.items || []).map((it: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 px-3 font-medium">
                            {it.name} {it.sku ? `(${it.sku})` : ""}
                          </td>
                          <td className="py-2 px-3 text-right">{it.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatAmount(it.price)}</td>
                          <td className="py-2 px-3 text-right">{it.discount_percent || 0}%</td>
                          <td className="py-2 px-3 text-right">{it.tax_percent || 0}%</td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatAmount(it.total || it.quantity * it.price)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-3">
                <div className="w-full sm:w-64 space-y-1.5 text-xs sm:text-right">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Subtotal:</span>
                    <span>{formatAmount(previewQuote.sub_total || previewQuote.grand_total)}</span>
                  </div>
                  {Number(previewQuote.discount_amount) > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Discount:</span>
                      <span>-{formatAmount(previewQuote.discount_amount)}</span>
                    </div>
                  )}
                  {Number(previewQuote.tax_amount) > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Tax:</span>
                      <span>+{formatAmount(previewQuote.tax_amount)}</span>
                    </div>
                  )}
                  {Number(previewQuote.adjustment_amount) !== 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>Adjustment:</span>
                      <span>{formatAmount(previewQuote.adjustment_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-300 dark:border-gray-700">
                    <span>Grand Total:</span>
                    <span className="text-[#0088cc]">{formatAmount(previewQuote.grand_total)}</span>
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
