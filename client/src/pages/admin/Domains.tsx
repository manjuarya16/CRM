import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import { buildTenantUrl, getTenantDisplayDomain } from "@/utils/subdomain";
import Swal from "sweetalert2";
import { PageBreadcrumb, PaginationControls } from "../../components";
import { InvoiceModal } from "../../components/InvoiceModal";

interface OrganizationDomain {
  id: number;
  org_id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: boolean;
  computed_status: string;
  created_at: string;
  user_count: number;
  subscription_start_date: string | null;
  subscription_expiry_date: string | null;
  plan_name: string | null;
  plan_code: string | null;
  payment_status?: string | null;
  latest_payment_amount?: number | string | null;
  latest_payment_currency?: string | null;
  latest_payment_method?: string | null;
  payment_count?: number;
}

const SuperAdminDomains = () => {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrganizationDomain[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "slug" | "created" | "expiry">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Payment Details View Modal State
  const [viewPaymentOrg, setViewPaymentOrg] = useState<OrganizationDomain | null>(null);
  const [orgPayments, setOrgPayments] = useState<any[]>([]);
  const [loadingOrgPayments, setLoadingOrgPayments] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const handleOpenPaymentDetails = async (org: OrganizationDomain) => {
    setViewPaymentOrg(org);
    setLoadingOrgPayments(true);
    try {
      const res = await adminApi.get("/admin/payments", { params: { org_id: org.id } });
      if (res.data && res.data.success) {
        setOrgPayments(res.data.data);
      } else {
        setOrgPayments([]);
      }
    } catch (err: any) {
      console.error("Error fetching organization payment details:", err);
      setOrgPayments([]);
    } finally {
      setLoadingOrgPayments(false);
    }
  };

  // Fetch organizations
  const fetchDomains = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get("/admin/organizations");
      if (response.data && response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching organization domains:", err);
      Swal.fire("Error", "Failed to load organization domains.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  // Helper functions for Domain construction
  const getTenantDomain = (slug: string) => {
    return getTenantDisplayDomain(slug);
  };

  const getFullTenantUrl = (slug: string) => {
    return buildTenantUrl(slug, "/auth/login");
  };

  const getPaymentUrl = (slug: string) => {
    return buildTenantUrl(slug, "/subscription");
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    Swal.fire({
      title: "Copied! 📋",
      html: `<div class="text-xs text-left"><p>${label}:</p><p class="font-mono text-primary font-semibold break-all mt-1">${text}</p></div>`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Impersonate Login
  const handleImpersonateLogin = async (org: OrganizationDomain) => {
    try {
      const response = await adminApi.post(`/admin/organizations/${org.id}/impersonate`);
      if (response.data && response.data.success) {
        const { token, user, organization } = response.data;

        // Build organization workspace URL
        const slug = organization?.slug || org.slug || "";
        let targetUrl = "/dashboard";

        if (slug) {
          const queryParams: Record<string, string> = {
            impersonate_token: token,
            token: token,
            org_name: organization?.name || org.name || "",
            org_slug: slug,
            user: JSON.stringify(user),
          };
          targetUrl = buildTenantUrl(slug, "/dashboard", queryParams);
        }

        Swal.fire({
          title: "Logging in... 🚀",
          text: `Opening ${organization?.name || org.name} workspace in a new tab...`,
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });

        setTimeout(() => {
          window.open(targetUrl, "_blank");
        }, 300);
      }
    } catch (err: any) {
      console.error("Error during impersonation:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to log into organization", "error");
    }
  };

  // Filtered & Sorted Domains
  const filteredOrganizations = organizations.filter((org) => {
    // Search query match
    const domain = getTenantDomain(org.slug).toLowerCase();
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query) ||
      domain.includes(query) ||
      (org.email && org.email.toLowerCase().includes(query));

    // Status filter match
    const computedStatus = org.computed_status || (org.status ? "Active" : "Suspended");
    const matchesStatus = statusFilter === "All" || computedStatus.toLowerCase() === statusFilter.toLowerCase();

    // Plan filter match
    const matchesPlan =
      planFilter === "All" ||
      (planFilter === "Trial" && (computedStatus === "Trial" || org.plan_code === "free_trial")) ||
      (planFilter === "Starter" && org.plan_code === "starter") ||
      (planFilter === "Professional" && org.plan_code === "professional") ||
      (planFilter === "Enterprise" && org.plan_code === "enterprise");

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Sort
  const sortedOrganizations = [...filteredOrganizations].sort((a, b) => {
    let comp = 0;
    if (sortBy === "name") {
      comp = a.name.localeCompare(b.name);
    } else if (sortBy === "slug") {
      comp = a.slug.localeCompare(b.slug);
    } else if (sortBy === "created") {
      comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "expiry") {
      const expA = a.subscription_expiry_date ? new Date(a.subscription_expiry_date).getTime() : 0;
      const expB = b.subscription_expiry_date ? new Date(b.subscription_expiry_date).getTime() : 0;
      comp = expA - expB;
    }
    return sortOrder === "asc" ? comp : -comp;
  });

  // Pagination Calculations
  const totalItems = sortedOrganizations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrganizations = sortedOrganizations.slice(startIndex, endIndex);

  const isPaidStatus = (status?: string | null) => {
    if (!status) return false;
    const lower = status.trim().toLowerCase();
    return lower === "paid" || lower === "success" || lower === "completed" || lower === "captured";
  };

  const renderPaymentRowStatusBadge = (paymentStatus?: string | null) => {
    const rawStatus = (paymentStatus || "Unknown").trim();
    const lower = rawStatus.toLowerCase();

    if (lower === "paid" || lower === "success" || lower === "completed" || lower === "captured") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <i className="mgc_check_circle_fill text-xs text-emerald-600 dark:text-emerald-400"></i>
          <span>{rawStatus}</span>
        </span>
      );
    }

    if (lower === "pending" || lower === "processing" || lower === "created" || lower === "initiated") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <i className="mgc_time_fill text-xs text-amber-600 dark:text-amber-400"></i>
          <span>{rawStatus}</span>
        </span>
      );
    }

    if (lower === "failed" || lower === "cancelled" || lower === "canceled") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          <i className="mgc_alert_fill text-xs text-rose-600 dark:text-rose-400"></i>
          <span>{rawStatus}</span>
        </span>
      );
    }

    if (lower === "refunded") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          <i className="mgc_refresh_3_line text-xs text-purple-600 dark:text-purple-400"></i>
          <span>{rawStatus}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <span>{rawStatus}</span>
      </span>
    );
  };

  // Summary Metrics
  const totalDomainsCount = organizations.length;
  const activeDomainsCount = organizations.filter((o) => o.computed_status === "Active").length;
  const trialDomainsCount = organizations.filter((o) => o.computed_status === "Trial").length;
  const expiredDomainsCount = organizations.filter((o) => o.computed_status === "Expired" || o.computed_status === "Suspended").length;

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPlanFilter("All");
    setSortBy("name");
    setSortOrder("asc");
    setCurrentPage(1);
  };

  return (
    <>
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h4 className="text-slate-900 dark:text-slate-200 text-xl font-bold flex items-center gap-2">
            <i className="mgc_world_line text-primary text-2xl"></i> Organization Domains & Subdomains Directory
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Complete registry of tenant subdomain URLs, DNS routing, SSL certificates, and direct portal access links.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`${basePath}/organizations/create`}
            className="btn bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-600 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs transition"
          >
            <i className="mgc_add_line text-base"></i> Provision New Domain
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Total SaaS Domains</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">{totalDomainsCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
            <i className="mgc_world_line"></i>
          </div>
        </div>

        <div className="card p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider block">Active & Live</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{activeDomainsCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center text-xl">
            <i className="mgc_check_circle_line"></i>
          </div>
        </div>

        <div className="card p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider block">Trial Subdomains</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{trialDomainsCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center text-xl">
            <i className="mgc_time_line"></i>
          </div>
        </div>

        <div className="card p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider block">Expired / Inactive</span>
            <span className="text-2xl font-black text-rose-600 mt-1 block">{expiredDomainsCount}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center text-xl">
            <i className="mgc_alarm_1_line"></i>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="card mb-6 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs bg-white dark:bg-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Search Domain / Organization
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </div>
              <input
                type="text"
                className="form-input text-sm w-full !pl-10"
                placeholder="Domain, slug, org name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Domain Status
            </label>
            <select
              className="form-select text-sm w-full"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active (Live)</option>
              <option value="Trial">Free Trial</option>
              <option value="Expired">Expired</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Subscription Plan
            </label>
            <select
              className="form-select text-sm w-full"
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Plans</option>
              <option value="Starter">Starter Plan</option>
              <option value="Professional">Professional Plan</option>
              <option value="Enterprise">Enterprise Plan</option>
              <option value="Trial">Free Trial</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Sort By
            </label>
            <select
              className="form-select text-sm w-full"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
            >
              <option value="name">Organization Name</option>
              <option value="slug">Domain / Subdomain</option>
              <option value="created">Registration Date</option>
              <option value="expiry">Validity / Expiry</option>
            </select>
          </div>

          {/* Sort Direction & Reset */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center flex-1"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            >
              <i className={sortOrder === "asc" ? "mgc_arrow_up_line text-sm" : "mgc_arrow_down_line text-sm"}></i>
              <span className="ml-1 text-xs font-semibold">{sortOrder === "asc" ? "A-Z / Asc" : "Z-A / Desc"}</span>
            </button>
            <button
              type="button"
              className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              onClick={handleClearFilters}
              title="Reset Filters"
            >
              <i className="mgc_refresh_3_line text-base"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Domains Table Card */}
      <div className="card">
        <div className="card-header border-b border-gray-200 dark:border-gray-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h5 className="card-title text-slate-900 dark:text-slate-200 font-bold flex items-center gap-2">
            <span>Domains & Subdomains List</span>
            <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {filteredOrganizations.length} Total
            </span>
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-select form-select-sm text-xs py-1 px-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paginatedOrganizations.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              <i className="mgc_world_line text-4xl text-gray-300 mb-2 block"></i>
              No organization domains found matching the filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full min-w-[800px] divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/60 text-xs text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Sr. No.</th>
                    <th className="px-4 py-3 text-left">Domain / Tenant URL</th>
                    <th className="px-4 py-3 text-left">Organization</th>
                    <th className="px-3 py-3 text-left">Plan</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">SSL / Protocol</th>
                    <th className="px-3 py-3 text-left">Validity</th>
                    <th className="px-4 py-3 text-right">Domain Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                  {paginatedOrganizations.map((org, index) => {
                    const domainHost = getTenantDomain(org.slug);
                    const fullUrl = getFullTenantUrl(org.slug);
                    const paymentUrl = getPaymentUrl(org.slug);
                    const isSecure = window.location.protocol === "https:";

                    return (
                      <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                        <td className="px-3 py-3.5 text-center text-xs text-gray-500 dark:text-gray-400 font-mono font-medium w-16">
                          {startIndex + index + 1}
                        </td>
                        {/* Domain & Link */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                              <i className="mgc_world_line text-base"></i>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => void handleImpersonateLogin(org)}
                                className="font-mono font-bold text-primary hover:underline flex items-center gap-1 text-[13px] text-left"
                                title={`Log in to ${org.name}`}
                              >
                                <span>{domainHost}</span>
                                <i className="mgc_external_link_line text-xs"></i>
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400 font-mono">Slug: {org.slug}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(fullUrl, "Tenant Login URL")}
                                  className="text-[10px] text-gray-500 hover:text-primary transition flex items-center gap-0.5"
                                  title="Copy direct URL"
                                >
                                  <i className="mgc_copy_line text-[10px]"></i> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Organization */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{org.name}</div>
                          <div className="text-gray-400 text-[11px]">{org.email || "No email listed"}</div>
                        </td>

                        {/* Plan */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          <span className="font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs">
                            {org.plan_name || "Starter"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          {org.computed_status === "Active" ? (
                            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <i className="mgc_check_circle_fill text-xs text-emerald-600 dark:text-emerald-400"></i>
                              <span>Active</span>
                            </span>
                          ) : org.computed_status === "Trial" ? (
                            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              <i className="mgc_time_fill text-xs text-amber-600 dark:text-amber-400"></i>
                              <span>Active Trial</span>
                            </span>
                          ) : org.computed_status === "Expired" ? (
                            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                              <i className="mgc_alarm_1_fill text-xs text-rose-600 dark:text-rose-400"></i>
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                              <i className="mgc_close_circle_fill text-xs text-slate-600 dark:text-slate-400"></i>
                              <span>Suspended</span>
                            </span>
                          )}
                        </td>

                        {/* SSL / Protocol */}
                        <td className="px-3 py-3.5 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isSecure
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}>
                            <i className={isSecure ? "mgc_lock_line text-xs" : "mgc_unlock_line text-xs"}></i>
                            <span>{isSecure ? "HTTPS (SSL)" : "HTTP / Dev"}</span>
                          </span>
                        </td>

                        {/* Validity */}
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          {org.subscription_expiry_date ? (
                            <div className={`font-semibold ${new Date(org.subscription_expiry_date) < new Date() ? "text-rose-600" : "text-slate-700 dark:text-slate-300"}`}>
                              {new Date(org.subscription_expiry_date).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No expiry</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-medium">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Open Portal & Log In */}
                            <button
                              type="button"
                              onClick={() => void handleImpersonateLogin(org)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:bg-indigo-600 transition inline-flex items-center justify-center"
                              title="Log in to organization in new tab"
                            >
                              <i className="mgc_external_link_line text-base"></i>
                            </button>

                            {/* Copy Domain URL */}
                            <button
                              type="button"
                              onClick={() => handleCopy(fullUrl, "Tenant Login URL")}
                              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-600 hover:text-white dark:text-gray-400 dark:hover:bg-gray-600 transition inline-flex items-center justify-center"
                              title="Copy domain URL"
                            >
                              <i className="mgc_copy_line text-base"></i>
                            </button>

                            {/* Copy Payment Link */}
                            <button
                              type="button"
                              onClick={() => handleCopy(paymentUrl, "Payment & Subscription Portal URL")}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-600 transition inline-flex items-center justify-center"
                              title="Copy payment portal URL"
                            >
                              <i className="mgc_bank_card_line text-base"></i>
                            </button>

                            {/* View Payment Details */}
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentDetails(org)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:bg-indigo-600 transition inline-flex items-center justify-center"
                              title="View Payment Details & History"
                            >
                              <i className="mgc_bill_line text-base"></i>
                            </button>

                            {/* Impersonate */}
                            <button
                              type="button"
                              onClick={() => handleImpersonateLogin(org)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-600 hover:text-white dark:text-amber-400 dark:hover:bg-amber-600 transition inline-flex items-center justify-center"
                              title="Impersonate organization admin login"
                            >
                              <i className="mgc_key_1_line text-base"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && sortedOrganizations.length > 0 && (
          <div className="card-footer border-t border-gray-200 dark:border-gray-700 p-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Organization Payment Details View Modal */}
      {viewPaymentOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-xl">
                  <i className="mgc_bill_line text-2xl"></i>
                </span>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Payment Details & History</span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                      {viewPaymentOrg.name}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Tenant Subdomain: <span className="font-mono text-primary font-semibold">{viewPaymentOrg.slug}</span> • Plan: <strong>{viewPaymentOrg.plan_name || "Starter"}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold p-1"
                onClick={() => setViewPaymentOrg(null)}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Assigned Plan</span>
                  <strong className="text-base font-bold text-slate-900 dark:text-white mt-1 block">
                    {viewPaymentOrg.plan_name || "Starter"}
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Payment Status</span>
                  <strong className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                    {viewPaymentOrg.payment_status || "Unpaid"}
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Total Paid Revenue</span>
                  <strong className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
                    ₹{orgPayments.filter(p => isPaidStatus(p.payment_status)).reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Subscription Validity</span>
                  <strong className={`text-xs font-bold mt-1 block ${
                    viewPaymentOrg.subscription_expiry_date && new Date(viewPaymentOrg.subscription_expiry_date) < new Date()
                      ? "text-rose-600"
                      : "text-slate-800 dark:text-slate-200"
                  }`}>
                    {viewPaymentOrg.subscription_expiry_date
                      ? new Date(viewPaymentOrg.subscription_expiry_date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "No Expiry"}
                  </strong>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                    <i className="mgc_time_line text-base text-primary"></i>
                    <span>Recorded Transactions & Invoices ({orgPayments.length})</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => handleCopy(getPaymentUrl(viewPaymentOrg.slug), "Payment Portal URL")}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <i className="mgc_link_line text-xs"></i> Copy Direct Payment Link
                  </button>
                </div>

                {loadingOrgPayments ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : orgPayments.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <i className="mgc_bill_line text-4xl text-gray-300 dark:text-gray-600 mb-2 block"></i>
                    <p className="text-xs text-gray-500 font-medium">No payment records found for this organization.</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(getPaymentUrl(viewPaymentOrg.slug), "Payment Portal URL")}
                      className="mt-3 btn btn-sm bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                    >
                      <i className="mgc_link_line text-xs mr-1"></i> Send Payment Link to Customer
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700/60 uppercase text-gray-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Date</th>
                          <th className="px-3 py-2.5 text-left">Plan</th>
                          <th className="px-3 py-2.5 text-left">Amount</th>
                          <th className="px-3 py-2.5 text-center">Method</th>
                          <th className="px-3 py-2.5 text-left">Reference / ID</th>
                          <th className="px-3 py-2.5 text-center">Status</th>
                          <th className="px-3 py-2.5 text-left">Billing Period</th>
                          <th className="px-3 py-2.5 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {orgPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                              {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                              {p.plan_name}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-slate-100">
                              {p.currency === "USD" ? "$" : "₹"}{Number(p.amount).toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-center">
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {p.payment_method}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] text-gray-500">
                              {p.razorpay_payment_id || p.razorpay_order_id || "Direct"}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-center">
                              {renderPaymentRowStatusBadge(p.payment_status)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-gray-500">
                              {p.billing_start_date && p.billing_end_date ? (
                                `${new Date(p.billing_start_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })} - ${new Date(p.billing_end_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(p)}
                                className="btn btn-xs py-1 px-2.5 rounded bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-900/40 dark:text-indigo-300 font-bold transition flex items-center gap-1 ml-auto"
                                title="View / Print Tax Receipt"
                              >
                                <i className="mgc_bill_line text-xs"></i> Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                to={`${basePath}/payments?org_id=${viewPaymentOrg.id}`}
                className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
              >
                <span>View Full Filtered Payments Page</span>
                <i className="mgc_external_link_line text-xs"></i>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(getPaymentUrl(viewPaymentOrg.slug), "Payment Portal URL")}
                  className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs px-3 py-2 rounded-xl hover:bg-gray-100 font-bold flex items-center gap-1"
                >
                  <i className="mgc_link_line text-xs"></i> Copy Payment Link
                </button>
                <button
                  type="button"
                  className="btn bg-gray-800 hover:bg-gray-900 text-white text-xs px-4 py-2 rounded-xl font-bold"
                  onClick={() => setViewPaymentOrg(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <InvoiceModal
          invoice={selectedReceipt}
          org={viewPaymentOrg}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </>
  );
};

export default SuperAdminDomains;
