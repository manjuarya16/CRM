import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { ICampaign } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useCampaignStore } from "@/store";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";

const CampaignsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.campaigns.create");
  const canEdit = hasPermission("settings.campaigns.edit");
  const canDelete = hasPermission("settings.campaigns.delete");
  const canView = hasPermission("settings.campaigns.view");

  const [campaigns, setCampaigns] = useState<ICampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { viewMode, setViewMode, setHasUserToggled } = useResponsiveViewMode();

  const AVATAR_COLORS = [
    "bg-sky-600 text-white",
    "bg-blue-600 text-white",
    "bg-indigo-600 text-white",
    "bg-purple-600 text-white",
    "bg-teal-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-500 text-white",
  ];

  const getInitials = (name?: string, fallback = "CP") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const list = await useCampaignStore.getState().fetchCampaigns();
      setCampaigns(list || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (item: ICampaign) => {
    const res = await Swal.fire({
      title: "Delete Campaign?",
      text: `Are you sure you want to delete "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await useCampaignStore.getState().deleteCampaign(item.id);
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        fetchCampaigns();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || err.message || "Failed to delete" });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const res = await Swal.fire({
      title: "Delete Selected Campaigns?",
      text: `Are you sure you want to delete ${selectedIds.length} campaign(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: `Yes, delete (${selectedIds.length})`,
    });
    if (res.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useCampaignStore.getState().deleteCampaign(id)));
        Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
        setSelectedIds([]);
        fetchCampaigns();
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to delete selected campaigns" });
      }
    }
  };

  const handleSend = async (item: ICampaign) => {
    const res = await Swal.fire({
      title: "Launch Campaign?",
      text: `Do you want to send "${item.name}" to all ${item.mail_to === "leads" ? "Leads" : "Contacts"} now?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0e90d9",
      confirmButtonText: "Yes, Send Now",
    });
    if (res.isConfirmed) {
      try {
        Swal.fire({
          title: "Sending Campaign...",
          text: "Please wait while emails are being dispatched",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        const resp = await useCampaignStore.getState().sendCampaign(item.id);
        Swal.fire({
          icon: "success",
          title: "Campaign Dispatched!",
          text: resp?.message || "Emails sent successfully",
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Failed to Send",
          text: err.response?.data?.message || err.message || "Failed to send campaign emails",
        });
      }
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      Swal.fire("Export", "No campaigns to export", "info");
      return;
    }

    const headers = ["ID", "Campaign Name", "Subject", "Audience", "Status", "Template", "Event", "Created At"];
    const rows = filtered.map((c) => [
      c.id,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.subject || "").replace(/"/g, '""')}"`,
      c.mail_to || "",
      c.status ? "Active" : "Inactive",
      `"${(c.template_name || "").replace(/"/g, '""')}"`,
      `"${(c.event_name || "").replace(/"/g, '""')}"`,
      c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campaigns_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.subject || "").toLowerCase().includes(q) ||
        (c.mail_to || "").toLowerCase().includes(q) ||
        (c.template_name || "").toLowerCase().includes(q);

      const matchesAudience =
        audienceFilter === "all" || (c.mail_to || "").toLowerCase() === audienceFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(c.status)) ||
        (statusFilter === "inactive" && !c.status);

      return matchesSearch && matchesAudience && matchesStatus;
    });
  }, [campaigns, search, audienceFilter, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllSelected = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Responsive Full-Detail Campaign Card
  const renderCampaignCard = (item: ICampaign, idx: number) => {
    const isSelected = selectedIds.includes(item.id);
    const avatarColor = AVATAR_COLORS[(item.id || idx) % AVATAR_COLORS.length];

    return (
      <div
        key={item.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {canDelete && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectOne(item.id)}
                className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
              />
            )}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(item.name, "CP")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate leading-tight">
                  {item.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {item.status ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Inactive
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 capitalize">
                    <i className="mgc_user_3_line text-[11px]"></i>
                    {item.mail_to === "leads" ? "Leads" : item.mail_to === "contacts" ? "Contacts" : item.mail_to || "Audience"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #CMP-{item.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Subject & Associated Details */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
            <i className="mgc_mail_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] text-gray-400 block font-medium">Subject</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                {item.subject || <span className="text-gray-400 font-normal italic">No subject specified</span>}
              </span>
            </div>
          </div>

          {(item.template_name || item.event_name) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              {item.template_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200/80">
                  <i className="mgc_file_text_line text-[11px]"></i>
                  {item.template_name}
                </span>
              )}
              {item.event_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/80">
                  <i className="mgc_calendar_line text-[11px]"></i>
                  Trigger: {item.event_name}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-gray-400 text-[11px] pt-0.5">
            <span className="flex items-center gap-1">
              <i className="mgc_time_line text-xs"></i>
              <span>Created {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
            </span>
            <span className="font-mono">
              ID: {item.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => handleSend(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 font-semibold text-xs rounded-xl transition"
            title="Launch / Send Campaign Now"
          >
            <i className="mgc_send_line text-sm"></i>
            <span>Send Now</span>
          </button>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canEdit && (
              <Link
                to={`/settings/campaigns/${item.id}/edit`}
                className="p-1.5 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                title="Edit Campaign"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1.5 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Delete Campaign"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0e90d9] hover:underline">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Campaigns</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Marketing Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Automate and broadcast marketing emails to leads and customers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-base"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-base text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <Link
              to="/settings/campaigns/create"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Campaign</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, Filters, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                placeholder="Search campaigns by name or subject..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-52 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>

            <select
              value={audienceFilter}
              onChange={(e) => {
                setAudienceFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200"
            >
              <option value="all">All Audiences</option>
              <option value="leads">Leads</option>
              <option value="contacts">Contacts</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <ViewModeSwitcher
              viewMode={viewMode}
              onViewModeChange={(m) => {
                setHasUserToggled(true);
                setViewMode(m);
              }}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 pl-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc] cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Quick pagination arrows in toolbar */}
            <div className="h-8 flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-2xs shrink-0">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="h-full px-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <i className="mgc_left_line text-xs"></i>
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="h-full px-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Page"
              >
                <i className="mgc_right_line text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <div>
            Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{paginated.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> campaigns
            {total > 0 && ` (${startIndex} - ${endIndex} of ${total})`}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-[#0088cc] font-medium">
              {selectedIds.length} campaign(s) selected
            </div>
          )}
        </div>

        {/* 📦 View Modes Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading campaigns...</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <i className="mgc_megaphone_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No marketing campaigns found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginated.map((item, idx) => renderCampaignCard(item, idx))}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                    {canDelete && (
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 font-semibold">Campaign Name</th>
                    <th className="py-3.5 px-4 font-semibold">Subject</th>
                    <th className="py-3.5 px-4 font-semibold">Audience</th>
                    <th className="py-3.5 px-4 font-semibold">Template / Trigger</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginated.map((item, idx) => {
                    const isSelected = selectedIds.includes(item.id);
                    const avatarColor = AVATAR_COLORS[(item.id || idx) % AVATAR_COLORS.length];

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        {canDelete && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(item.id)}
                              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(item.name, "CP")}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {item.name}
                              </p>
                              <span className="font-mono text-xs text-[#0088cc] dark:text-[#38bdf8]">
                                #CMP-{item.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {item.subject || <span className="text-gray-400 italic">No subject</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 capitalize">
                            <i className="mgc_user_3_line text-xs"></i>
                            {item.mail_to === "leads" ? "Leads" : item.mail_to === "contacts" ? "Contacts" : item.mail_to || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-300">
                          {item.template_name || item.event_name ? (
                            <div className="space-y-0.5">
                              {item.template_name && <p className="font-medium">{item.template_name}</p>}
                              {item.event_name && <p className="text-[11px] text-gray-400">Trigger: {item.event_name}</p>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {item.status ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSend(item)}
                              className="p-1.5 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition inline-flex items-center"
                              title="Launch / Send Campaign Now"
                            >
                              <i className="mgc_send_line text-base"></i>
                            </button>
                            {canEdit && (
                              <Link
                                to={`/settings/campaigns/${item.id}/edit`}
                                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                                title="Edit"
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </Link>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition inline-flex items-center"
                                title="Delete"
                              >
                                <i className="mgc_delete_line text-base"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {startIndex} to {endIndex} of {total} campaigns
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
