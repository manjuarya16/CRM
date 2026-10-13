import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "@/components";
import { IGoogleContactAccount, IContactExportBatch } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useGoogleContactStore } from "@/store";

const avatarColors = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800",
];

const GoogleContactsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.google_contacts.create") || hasPermission("google_contacts.create");
  const canExport = hasPermission("settings.google_contacts.export") || hasPermission("google_contacts.export") || canCreate;
  const canSync = hasPermission("settings.google_contacts.sync") || hasPermission("google_contacts.sync") || hasPermission("settings.google_contacts.edit") || hasPermission("google_contacts.edit");
  const canDelete = hasPermission("settings.google_contacts.delete") || hasPermission("google_contacts.delete");

  const [accounts, setAccounts] = useState<IGoogleContactAccount[]>([]);
  const [batches, setBatches] = useState<IContactExportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const fetchAccountsAndBatches = async () => {
    try {
      setLoading(true);
      const res = await useGoogleContactStore.getState().fetchAccountsAndBatches();
      setAccounts(res.accounts || []);
      setBatches(res.batches || []);
    } catch {
      setAccounts([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndBatches();
  }, []);

  const handleConnectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await useGoogleContactStore.getState().createAccount({
        google_email: googleEmail,
        access_token: accessToken || "mock_oauth_token_" + Date.now(),
      });
      Swal.fire({
        icon: "success",
        title: "Connected!",
        text: "Google account connected successfully",
        timer: 1500,
        showConfirmButton: false,
      });
      setIsConnectModalOpen(false);
      setGoogleEmail("");
      setAccessToken("");
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || err.message || "Failed to connect Google account",
      });
    }
  };

  const handleDisconnect = async (id: number) => {
    const res = await Swal.fire({
      title: "Disconnect Account?",
      text: "Do you want to disconnect this Google account from CRM?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, disconnect",
    });
    if (res.isConfirmed) {
      try {
        await useGoogleContactStore.getState().deleteAccount(id);
        Swal.fire({ icon: "success", title: "Disconnected", timer: 1200, showConfirmButton: false });
        fetchAccountsAndBatches();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed" });
      }
    }
  };

  const handleSyncContacts = async (account: IGoogleContactAccount) => {
    try {
      setSyncingId(account.id);
      const resData = await useGoogleContactStore.getState().syncAccount(account.id);
      Swal.fire({
        icon: "success",
        title: "Synchronized!",
        text: resData?.message || "Google contacts imported into CRM Persons.",
      });
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Sync Failed",
        text: err.response?.data?.message || err.message || "Sync failed",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreateExportBatch = async () => {
    try {
      setExporting(true);
      const resData = await useGoogleContactStore.getState().exportContacts();
      Swal.fire({
        icon: "success",
        title: "Export Batch Queued!",
        text: resData?.message || "CRM contacts queued for export to Google Contacts.",
      });
      fetchAccountsAndBatches();
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to queue export" });
    } finally {
      setExporting(false);
    }
  };

  const totalExportedContacts = useMemo(() => {
    return batches.reduce((sum, b) => sum + (Number(b.exported_count) || 0), 0);
  }, [batches]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: batches.length };
    batches.forEach((b) => {
      const s = (b.status || "").toLowerCase();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [batches]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.status) set.add(b.status.toLowerCase());
    });
    return Array.from(set);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    let result = batches;
    if (statusFilter !== "all") {
      result = result.filter((b) => (b.status || "").toLowerCase() === statusFilter);
    }
    if (batchSearch.trim()) {
      const q = batchSearch.toLowerCase().trim();
      result = result.filter(
        (b) =>
          String(b.id).includes(q) ||
          (b.status && b.status.toLowerCase().includes(q)) ||
          (b.google_email && b.google_email.toLowerCase().includes(q))
      );
    }
    return result;
  }, [batches, statusFilter, batchSearch]);

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "success" || s === "done") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="capitalize">{status}</span>
        </span>
      );
    }
    if (s === "pending" || s === "queued" || s === "processing" || s === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="capitalize">{status}</span>
        </span>
      );
    }
    if (s === "failed" || s === "error") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span className="capitalize">{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-750 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shrink-0">
        <span className="capitalize">{status || "Unknown"}</span>
      </span>
    );
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      <PageBreadcrumb title="Google Contacts" breadCrumbItems={["Settings", "Google Contacts"]} />

      {/* Breadcrumb Navigation */}
      <nav className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
        <Link to="/dashboard" className="text-[#0088cc] hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0088cc] hover:underline">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-normal">Google Contacts</span>
      </nav>

      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Google Contacts Integration
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Connect Google accounts, sync contacts seamlessly, and manage batch exports.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <button
            onClick={fetchAccountsAndBatches}
            disabled={loading}
            title="Refresh data"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors disabled:opacity-60"
          >
            <i className={`mgc_refresh_2_line text-base ${loading ? "animate-spin" : ""}`}></i>
            <span>Refresh</span>
          </button>

          {canExport && (
            <button
              onClick={handleCreateExportBatch}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors disabled:opacity-60"
            >
              <i className={`mgc_upload_line text-base text-gray-500 ${exporting ? "animate-bounce" : ""}`}></i>
              <span>{exporting ? "Queuing Export..." : "Export CRM Contacts"}</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-xs transition-colors"
            >
              <i className="mgc_google_line text-base sm:text-lg"></i>
              <span>Connect Google Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 text-xl font-bold">
            <i className="mgc_google_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Connected Accounts
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {accounts.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] dark:text-blue-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_box_3_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Export Batches
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {batches.length}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_user_3_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Exported
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {totalExportedContacts}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <i className="mgc_google_line text-red-500 text-lg"></i>
            <span>Connected Google Accounts</span>
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
          </span>
        </div>

        {loading && accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs sm:text-sm flex items-center justify-center gap-2">
            <i className="mgc_loading_3_line animate-spin text-lg text-[#0088cc]"></i>
            <span>Loading connected accounts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center mx-auto text-lg font-bold">
              G
            </div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
              No Google accounts connected yet
            </p>
            <p className="text-xs text-gray-400">
              Link your Google account to enable contact synchronization with CRM.
            </p>
            {canCreate && (
              <div className="pt-1">
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="text-xs font-bold text-[#0088cc] hover:underline"
                >
                  Click here to connect your Google account
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Cards identical to Leads card format */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
            {accounts.map((acc, index) => {
              return (
                <div
                  key={acc.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2 group"
                >
                  {/* Top Row: Initial Avatar + Title + Subtitle + Active Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800">
                        G
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight transition-colors"
                            title={acc.google_email}
                          >
                            {acc.google_email}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          Google People API • OAuth 2.0
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Middle: Details pills like Leads */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs">
                      <i className="mgc_shield_line text-[11px] text-gray-400"></i>
                      Account #{acc.id}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs">
                      <i className="mgc_check_line text-[11px] text-emerald-500"></i>
                      Connected
                    </span>
                  </div>

                  {/* Bottom Row: Sync Contacts button + Owner/Date + Disconnect */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                    {canSync ? (
                      <button
                        onClick={() => handleSyncContacts(acc)}
                        disabled={syncingId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-blue-50 text-[#0088cc] dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                      >
                        <i className={`mgc_refresh_2_line text-xs ${syncingId === acc.id ? "animate-spin" : ""}`}></i>
                        <span>{syncingId === acc.id ? "Syncing..." : "Sync Contacts"}</span>
                      </button>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                      {acc.created_at && (
                        <span className="flex items-center gap-1">
                          <i className="mgc_calendar_line text-xs"></i>
                          <span>{new Date(acc.created_at).toLocaleDateString()}</span>
                        </span>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDisconnect(acc.id)}
                          className="p-1 hover:text-red-500 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Disconnect Account"
                        >
                          <i className="mgc_delete_line text-sm"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Batches Section */}
      <div className="space-y-3">
        {/* Top Control Bar: Title, Search, View Toggle like Leads */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              Export Batches
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300">
              {filteredBatches.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                placeholder="Search batches..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              />
            </div>

            {/* View Toggle Buttons like Leads */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_layout_grid_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_list_check_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Status Filter Pills like Leads Mobile Stage Pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                statusFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {batches.length}
            </span>
          </button>

          {uniqueStatuses.map((st) => {
            const count = statusCounts[st] || 0;
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 capitalize ${
                  isActive
                    ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
                }`}
              >
                <span>{st}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Header like Leads */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredBatches.length}</strong>{" "}
            {filteredBatches.length === 1 ? "batch" : "batches"}
          </span>
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="text-xs text-[#0088cc] hover:underline font-semibold"
            >
              Show All Batches
            </button>
          )}
        </div>

        {/* CARDS VIEW (matching Leads High-Density Compact Cards List) */}
        {viewMode === "cards" && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <i className="mgc_loading_3_line animate-spin text-base text-[#0088cc]"></i>
                <span>Loading batches...</span>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  No Export Batches Found
                </p>
                <p className="text-xs text-gray-400">
                  {statusFilter !== "all"
                    ? "No batches match the selected status filter."
                    : "Try queuing an export or connecting a Google account."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredBatches.map((batch, idx) => {
                  const avatarColor = avatarColors[idx % avatarColors.length];
                  const percent =
                    batch.total_contacts > 0
                      ? Math.min(
                          100,
                          Math.round((Number(batch.exported_count) / Number(batch.total_contacts)) * 100)
                        )
                      : 0;

                  return (
                    <div
                      key={batch.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2 group"
                    >
                      {/* Top Row: Initial Avatar + Title + Subtitle + Value (Exported count like Deal value in Leads) */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}
                          >
                            #{batch.id}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight transition-colors">
                                Export Batch #{batch.id}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {batch.google_email ? (
                                <>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {batch.google_email}
                                  </span>
                                  <span> • Google Contacts</span>
                                </>
                              ) : (
                                "CRM Contacts Export"
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: Deal Value style for contacts */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-[#0088cc] dark:text-[#38bdf8] whitespace-nowrap">
                            {batch.exported_count} / {batch.total_contacts}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">contacts</p>
                        </div>
                      </div>

                      {/* Middle: Info Pills matching Leads */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStatusBadge(batch.status)}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs">
                          <i className="mgc_user_3_line text-[11px] text-gray-400"></i>
                          {batch.total_contacts} Total
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs">
                          <i className="mgc_check_line text-[11px] text-emerald-500"></i>
                          {batch.exported_count} Exported
                        </span>
                      </div>

                      {/* Progress Bar */}
                      {batch.total_contacts > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>Export Progress</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{percent}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0088cc] h-full rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Date & Time + Details */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
                          <span className="inline-flex items-center gap-1">
                            <i className="mgc_calendar_line text-xs"></i>
                            <span>{batch.created_at ? new Date(batch.created_at).toLocaleDateString() : "-"}</span>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <i className="mgc_time_line text-xs"></i>
                            <span>
                              {batch.created_at
                                ? new Date(batch.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-[#0088cc] dark:text-[#38bdf8] flex items-center gap-1">
                            <i className="mgc_download_2_line text-xs"></i>
                            <span>Synced</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TABLE GRID VIEW (when table view selected) */}
        {viewMode === "table" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Total Contacts</th>
                    <th className="py-3 px-4">Exported Count</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        <div className="inline-flex items-center gap-2">
                          <i className="mgc_loading_3_line animate-spin text-base text-[#0088cc]"></i>
                          <span>Loading batches...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        {batchSearch ? "No batches match your search." : "No export batches recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-gray-500">#{batch.id}</td>
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-100">{batch.total_contacts}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">{batch.exported_count}</td>
                        <td className="py-3 px-4">{renderStatusBadge(batch.status)}</td>
                        <td className="py-3 px-4 text-xs text-gray-400 text-right whitespace-nowrap">
                          {batch.created_at ? new Date(batch.created_at).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {isConnectModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsConnectModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden my-auto">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm shrink-0 border border-red-200 dark:border-red-800">
                  G
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                  Connect Google Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl font-bold transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConnectAccount} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Google Account Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sales@company.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] dark:bg-gray-700 dark:text-gray-100 transition-colors"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Enter the Gmail or Google Workspace email to sync contacts with.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  OAuth Token <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Optional custom access token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] dark:bg-gray-700 dark:text-gray-100 transition-colors"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Leave blank to auto-generate a secure session token.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors"
                >
                  <i className="mgc_check_line text-base"></i>
                  <span>Authorize & Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleContactsPage;
