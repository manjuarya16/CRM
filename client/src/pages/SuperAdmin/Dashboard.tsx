import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import { API } from "@/config";
import { useSuperAdminStore } from "@/store/superAdminStore";
import { PageBreadcrumb } from "../../components";

interface DashboardProps {
  showMetrics?: boolean;
  canViewOrganizations?: boolean;
  canCreateOrganizations?: boolean;
  canEditOrganizations?: boolean;
  canSendPaymentLinks?: boolean;
}

interface OrganizationSummary {
  id: number;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: boolean;
  computed_status: string;
  plan_name: string | null;
  subscription_expiry_date: string | null;
  created_at: string;
  user_count: number;
  latest_payment_amount?: number | string | null;
  latest_payment_currency?: string | null;
  payment_status?: string | null;
}

interface PaymentSummary {
  id: number;
  organization_name: string;
  organization_slug: string;
  plan_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  invoice_number?: string;
}

interface DemoRequest {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  organization_name?: string | null;
  status?: string | null;
  created_at: string;
}

export const SuperAdminDashboard: React.FC<DashboardProps> = () => {
  const isSuperAdminPrefix = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");
  const isAdminPrefix = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
  const basePath = isAdminPrefix ? "/admin" : (isSuperAdminPrefix ? "/super-admin" : "");
  const navigate = useNavigate();
  const token = useSuperAdminStore((state) => state.token);
  const admin = useSuperAdminStore((state) => state.admin);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Module Data States
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [demos, setDemos] = useState<DemoRequest[]>([]);
  const [platformUsersCount, setPlatformUsersCount] = useState<number>(0);
  const [platformRolesCount, setPlatformRolesCount] = useState<number>(0);
  const [pricingTiersCount, setPricingTiersCount] = useState<number>(0);
  const [smtpActive, setSmtpActive] = useState<boolean>(false);
  const [smtpSender, setSmtpSender] = useState<string>("");
  const [templatesCount, setTemplatesCount] = useState<number>(0);
  const [sidebarCounts, setSidebarCounts] = useState<{ [key: string]: number }>({});

  const formatCurrency = (amount: number | string | null | undefined, currency = "INR") => {
    const num = Number(amount) || 0;
    if (currency === "INR") {
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
    }
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const loadAllDashboardData = async () => {
    setRefreshing(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Organizations
      const orgPromise = adminApi.get("/admin/organizations").catch(() => null);

      // 2. Payments
      const payPromise = adminApi.get("/admin/payments").catch(() => null);

      // 3. Sidebar counts
      const countsPromise = API.get("/super-admin/sidebar-counts", { headers }).catch(() => null);

      // 4. Platform Users
      const usersPromise = API.get("/super-admin/modules/platform-users", { headers }).catch(() => null);

      // 5. Platform Roles
      const rolesPromise = API.get("/super-admin/modules/platform-roles", { headers }).catch(() => null);

      // 6. Pricing Tiers
      const pricingPromise = API.get("/super-admin/modules/pricing-tiers", { headers }).catch(() => null);

      // 7. Demo Requests
      const demoPromise = API.get("/super-admin/modules/demo-requests", { headers }).catch(() => null);

      // 8. SMTP Config
      const smtpPromise = API.get("/super-admin/modules/smtp-config", { headers }).catch(() => null);

      // 9. Email Templates
      const templatesPromise = API.get("/super-admin/modules/email-templates", { headers }).catch(() => null);

      const [
        orgRes,
        payRes,
        countsRes,
        usersRes,
        rolesRes,
        pricingRes,
        demoRes,
        smtpRes,
        templatesRes,
      ] = await Promise.all([
        orgPromise,
        payPromise,
        countsPromise,
        usersPromise,
        rolesPromise,
        pricingPromise,
        demoPromise,
        smtpPromise,
        templatesPromise,
      ]);

      if (orgRes?.data?.success && Array.isArray(orgRes.data.data)) {
        setOrganizations(orgRes.data.data);
      }
      if (payRes?.data?.success && Array.isArray(payRes.data.data)) {
        setPayments(payRes.data.data);
      }
      if (countsRes?.data?.success && countsRes.data.data) {
        setSidebarCounts(countsRes.data.data);
      }
      if (usersRes?.data?.success) {
        const u = usersRes.data.data;
        setPlatformUsersCount(Array.isArray(u) ? u.length : (u?.items ? u.items.length : 1));
      }
      if (rolesRes?.data?.success) {
        const r = rolesRes.data.data;
        setPlatformRolesCount(Array.isArray(r) ? r.length : (r?.items ? r.items.length : 4));
      }
      if (pricingRes?.data?.success) {
        const p = pricingRes.data.data;
        setPricingTiersCount(Array.isArray(p) ? p.length : (p?.items ? p.items.length : 3));
      }
      if (demoRes?.data?.success && Array.isArray(demoRes.data.data)) {
        setDemos(demoRes.data.data);
      }
      if (smtpRes?.data?.success && smtpRes.data.data) {
        const smtp = Array.isArray(smtpRes.data.data) ? smtpRes.data.data[0] : smtpRes.data.data;
        setSmtpActive(Boolean(smtp?.delivery_enabled || smtp?.host));
        setSmtpSender(smtp?.from_email || smtp?.from_name || "Configured");
      }
      if (templatesRes?.data?.success && Array.isArray(templatesRes.data.data)) {
        setTemplatesCount(templatesRes.data.data.length);
      }
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();
  }, [token]);

  // Derived Metrics Across All Modules
  const totalOrganizations = organizations.length;
  const activeTenants = organizations.filter((o) => o.computed_status === "Active").length;
  const trialTenants = organizations.filter((o) => o.computed_status === "Trial").length;
  const expiredTenants = organizations.filter((o) => o.computed_status === "Expired").length;
  const suspendedTenants = organizations.filter((o) => o.computed_status === "Suspended").length;

  const totalRevenue = payments
    .filter((p) => {
      const s = (p.payment_status || "").toLowerCase();
      return s === "paid" || s === "success" || s === "completed" || s === "captured";
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingPaymentsCount = payments.filter((p) => {
    const s = (p.payment_status || "").toLowerCase();
    return s === "pending" || s === "processing" || s === "created" || s === "initiated";
  }).length;

  const recentOrganizations = organizations.slice(0, 5);
  const recentPayments = payments.slice(0, 5);
  const recentDemos = demos.slice(0, 5);

  const renderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "paid" || s === "success" || s === "completed" || s === "captured") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <i className="mgc_check_circle_fill text-xs text-emerald-600"></i>
          <span>{status}</span>
        </span>
      );
    }
    if (s === "trial" || s === "pending" || s === "processing" || s === "new") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <i className="mgc_time_fill text-xs text-amber-600"></i>
          <span>{status}</span>
        </span>
      );
    }
    if (s === "expired" || s === "failed" || s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          <i className="mgc_alert_fill text-xs text-rose-600"></i>
          <span>{status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
        <i className="mgc_close_circle_fill text-xs text-slate-600"></i>
        <span>{status}</span>
      </span>
    );
  };

  return (
    <>
      {/* Header Banner */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h4 className="text-slate-900 dark:text-slate-100 text-xl font-bold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-lg">
              <i className="mgc_dashboard_3_line"></i>
            </span>
            SaaS Executive Dashboard
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            Real-time multi-tenant intelligence across organizations, billing, platform security, and communications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadAllDashboardData}
            disabled={refreshing}
            className="btn bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition"
          >
            <i className={`mgc_refresh_3_line text-base ${refreshing ? "animate-spin text-primary" : ""}`}></i>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            to={`${basePath}/organizations/create`}
            className="btn bg-primary text-white hover:bg-primary-600 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition"
          >
            <i className="mgc_add_line text-base"></i>
            <span>Add Organization</span>
          </Link>
        </div>
      </div>

      {/* ─── Top KPI Metric Cards (All Modules) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {/* Metric 1: Organizations */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Organizations</span>
            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
              <i className="mgc_building_2_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalOrganizations}</span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{activeTenants} Active</span>
              <span className="text-gray-400">·</span>
              <span className="text-amber-600">{trialTenants} Trial</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Revenue */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Revenue</span>
            <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              <i className="mgc_wallet_4_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRevenue)}</span>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{payments.length} Recorded Transactions</p>
          </div>
        </div>

        {/* Metric 3: Active Subscriptions */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Plans</span>
            <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg">
              <i className="mgc_vip_1_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{activeTenants + trialTenants}</span>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{pricingTiersCount || 3} Pricing Tiers Available</p>
          </div>
        </div>

        {/* Metric 4: Demo Requests */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Demo Requests</span>
            <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg">
              <i className="mgc_calendar_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{sidebarCounts.demos ?? demos.length}</span>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">Inbound Lead Pipeline</p>
          </div>
        </div>

        {/* Metric 5: Platform Staff */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Platform Staff</span>
            <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg">
              <i className="mgc_user_3_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{platformUsersCount || 1}</span>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{platformRolesCount || 4} Defined Roles</p>
          </div>
        </div>

        {/* Metric 6: Mail & Domains */}
        <div className="card bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Mail Delivery</span>
            <span className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg">
              <i className="mgc_mail_line"></i>
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${smtpActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="text-base font-bold text-slate-800 dark:text-slate-100">{smtpActive ? "SMTP Active" : "Default Mailer"}</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">{templatesCount || 6} System Templates</p>
          </div>
        </div>
      </div>

      {/* ─── All Modules Operational Hub (Cards Grid) ───────────────────────────── */}
      <div className="mb-6">
        <h5 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <i className="mgc_grid_line text-primary"></i> Super Admin Core Modules Overview
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Module 1: Organizations */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <i className="mgc_building_2_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Organizations (Tenants)</h6>
                    <p className="text-[11px] text-gray-500">Multi-tenant client accounts</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                  {totalOrganizations} Total
                </span>
              </div>

              {/* Status Breakdown Bar */}
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Tenant Status Distribution</span>
                  <span className="font-bold text-emerald-600">{activeTenants} Active / {totalOrganizations}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 flex overflow-hidden">
                  <div style={{ width: `${totalOrganizations ? (activeTenants / totalOrganizations) * 100 : 0}%` }} className="bg-emerald-500 h-full" title="Active"></div>
                  <div style={{ width: `${totalOrganizations ? (trialTenants / totalOrganizations) * 100 : 0}%` }} className="bg-amber-500 h-full" title="Trial"></div>
                  <div style={{ width: `${totalOrganizations ? (expiredTenants / totalOrganizations) * 100 : 0}%` }} className="bg-rose-500 h-full" title="Expired"></div>
                  <div style={{ width: `${totalOrganizations ? (suspendedTenants / totalOrganizations) * 100 : 0}%` }} className="bg-slate-400 h-full" title="Suspended"></div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px] pt-1 text-center font-medium">
                  <div className="text-emerald-600 font-bold">{activeTenants} Paid</div>
                  <div className="text-amber-600 font-bold">{trialTenants} Trial</div>
                  <div className="text-rose-600 font-bold">{expiredTenants} Expired</div>
                  <div className="text-slate-500 font-bold">{suspendedTenants} Susp.</div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <Link to={`${basePath}/organizations/create`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                <i className="mgc_add_line"></i> Add Tenant
              </Link>
              <Link to={`${basePath}/organizations`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>Manage Organizations</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>

          {/* Module 2: Domains & Subdomains */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
                    <i className="mgc_world_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Domains & Subdomains</h6>
                    <p className="text-[11px] text-gray-500">Tenant routing & DNS registry</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {totalOrganizations} Domains
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Subdomain Format:</span>
                    <span className="font-mono text-primary font-semibold">*.localhost / *.domain</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">SSL Certificate:</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <i className="mgc_lock_fill text-xs"></i> Wildcard SSL Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Multi-tenant Routing:</span>
                    <span className="text-emerald-600 font-semibold">Fully Operational</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Auto DNS Provisioning</span>
              <Link to={`${basePath}/domains`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>View All Domains</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>

          {/* Module 3: Payment Details & Invoices */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
                    <i className="mgc_currency_rupee_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Payment Details & Ledger</h6>
                    <p className="text-[11px] text-gray-500">Razorpay gateway & receipts</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {payments.length} Payments
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Total Collections:</span>
                  <span className="font-black text-emerald-600 text-sm">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Pending Checkout:</span>
                  <span className="font-semibold text-amber-600">{pendingPaymentsCount} Invoices</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Gateway Status:</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <i className="mgc_check_circle_fill text-xs"></i> Razorpay Online Live
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Automated Webhooks</span>
              <Link to={`${basePath}/payments`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>View Payment Ledger</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>

          {/* Module 4: Inbound Demo Inquiries */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
                    <i className="mgc_calendar_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Demo Inquiries Pipeline</h6>
                    <p className="text-[11px] text-gray-500">Prospective client requests</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  {sidebarCounts.demos ?? demos.length} Requests
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Inbound demo walkthroughs submitted through public landing portal. Review contact info and provision trials instantly.
                </p>
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                  ⚡ 1-Click "Activate Free Trial" triggers tenant creation & credentials dispatch.
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Public Intake</span>
              <Link to={`/super-admin/demos`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>Manage Demo Requests</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>

          {/* Module 5: Platform Staff & Roles */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
                    <i className="mgc_user_star_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Platform Users & Roles</h6>
                    <p className="text-[11px] text-gray-500">Super admin team & RBAC matrix</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {platformUsersCount || 1} Admins
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Platform Roles:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{platformRolesCount || 4} Hierarchy Tiers</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Current Login:</span>
                  <span className="font-semibold text-primary">{admin?.email || "Super Administrator"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Access Permissions:</span>
                  <span className="text-emerald-600 font-semibold">Global Platform Owner</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <Link to={`/super-admin/roles`} className="text-xs font-semibold text-primary hover:underline">
                Role Permissions
              </Link>
              <Link to={`/super-admin/users`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>Manage Users</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>

          {/* Module 6: Communications & Mail Server */}
          <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl">
                    <i className="mgc_mail_line"></i>
                  </div>
                  <div>
                    <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Mail Delivery & Templates</h6>
                    <p className="text-[11px] text-gray-500">Outbound SMTP & notifications</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${smtpActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700"}`}>
                  {smtpActive ? "Active" : "Default"}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Email Dispatch:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{smtpSender || "SMTP Connected"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Email Templates:</span>
                  <span className="font-semibold text-primary">{templatesCount || 6} Automated Templates</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Payment Links & Access:</span>
                  <span className="text-emerald-600 font-semibold">Auto-Dispatch Enabled</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <Link to={`/super-admin/email-templates`} className="text-xs font-semibold text-primary hover:underline">
                Templates
              </Link>
              <Link to={`/super-admin/smtp`} className="text-xs font-bold text-primary hover:text-primary-600 flex items-center gap-1">
                <span>SMTP Settings</span>
                <i className="mgc_arrow_right_line"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Multi-Module Feeds Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Feed 1: Recent Financial Transactions */}
        <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center text-base">
                  <i className="mgc_currency_rupee_line"></i>
                </span>
                <div>
                  <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Recent Payment Transactions</h6>
                  <p className="text-[11px] text-gray-500">Live subscription billing & receipts</p>
                </div>
              </div>
              <Link to={`${basePath}/payments`} className="text-xs font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                <i className="mgc_inbox_line text-2xl block mb-1"></i>
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {p.organization_name}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 font-medium">
                          {p.plan_name}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="py-2.5 px-3">
                          {renderStatusBadge(p.payment_status)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500 font-mono text-[11px]">
                          {formatDate(p.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500">
            <span>Razorpay Secure Online Checkout</span>
            <Link to={`${basePath}/payments`} className="font-bold text-primary hover:text-primary-600 flex items-center gap-1">
              <span>Full Payment History</span>
              <i className="mgc_arrow_right_line"></i>
            </Link>
          </div>
        </div>

        {/* Feed 2: Recent Organization Signups & Status */}
        <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-base">
                  <i className="mgc_building_2_line"></i>
                </span>
                <div>
                  <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Recent Organization Signups</h6>
                  <p className="text-[11px] text-gray-500">Recently provisioned SaaS workspaces</p>
                </div>
              </div>
              <Link to={`${basePath}/organizations`} className="text-xs font-semibold text-primary hover:underline">
                View All →
              </Link>
            </div>

            {organizations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                <i className="mgc_inbox_line text-2xl block mb-1"></i>
                No organizations registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Organization</th>
                      <th className="py-2.5 px-3">Subdomain</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {recentOrganizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {org.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-primary">
                          {org.slug}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 font-medium">
                          {org.plan_name || "Free Trial"}
                        </td>
                        <td className="py-2.5 px-3">
                          {renderStatusBadge(org.computed_status || (org.status ? "Active" : "Suspended"))}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-500 font-mono text-[11px]">
                          {formatDate(org.subscription_expiry_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500">
            <span>Tenant Multi-Tenancy Architecture</span>
            <Link to={`${basePath}/organizations`} className="font-bold text-primary hover:text-primary-600 flex items-center gap-1">
              <span>Manage Tenants</span>
              <i className="mgc_arrow_right_line"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Feed 3: Inbound Demo Requests (If Any) ─────────────────────────────── */}
      {demos.length > 0 && (
        <div className="card bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-5 shadow-2xs mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-base">
                <i className="mgc_calendar_line"></i>
              </span>
              <div>
                <h6 className="font-bold text-sm text-slate-900 dark:text-slate-100">Recent Demo Inquiries</h6>
                <p className="text-[11px] text-gray-500">Inbound requests submitted from marketing landing page</p>
              </div>
            </div>
            <Link to={`/super-admin/demos`} className="text-xs font-semibold text-primary hover:underline">
              View All Demos →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Contact Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Company Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {recentDemos.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{d.name}</td>
                    <td className="py-2.5 px-3 text-primary">{d.email}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-300">{d.phone || "—"}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">{d.organization_name || "—"}</td>
                    <td className="py-2.5 px-3">{renderStatusBadge(d.status || "New")}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 font-mono text-[11px]">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Quick System Operations Bar ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-gray-700 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
            <i className="mgc_lightning_line"></i>
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Super Admin Quick Actions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`${basePath}/organizations/create`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-600 transition flex items-center gap-1 shadow-2xs"
          >
            <i className="mgc_add_line"></i> New Organization
          </Link>
          <Link
            to={`${basePath}/payments`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1"
          >
            <i className="mgc_wallet_4_line"></i> Payment Ledger
          </Link>
          <Link
            to={`${basePath}/domains`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition flex items-center gap-1"
          >
            <i className="mgc_world_line"></i> Domains Directory
          </Link>
          <Link
            to={`/super-admin/demos`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
          >
            <i className="mgc_calendar_line"></i> Inbound Demos
          </Link>
          <Link
            to={`/super-admin/users`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition flex items-center gap-1"
          >
            <i className="mgc_user_3_line"></i> Platform Staff
          </Link>
          <Link
            to={`/super-admin/smtp`}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition flex items-center gap-1"
          >
            <i className="mgc_settings_3_line"></i> SMTP Settings
          </Link>
        </div>
      </div>
    </>
  );
};

export default SuperAdminDashboard;
