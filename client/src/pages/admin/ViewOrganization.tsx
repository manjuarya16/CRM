import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import Swal from "sweetalert2";
import { getTenantDisplayDomain } from "@/utils/subdomain";
import {
  Building2,
  ExternalLink,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  CreditCard,
  Users,
  Receipt,
  MapPin,
  UserCheck,
  Briefcase,
  Share2,
  Sparkles,
} from "lucide-react";

export const SuperAdminOrganizationView: React.FC = () => {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId || window.location.pathname.split("/").filter(Boolean).pop();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "billing" | "address" | "leadership" | "admin">("overview");

  // Fetch organization profile
  const fetchOrgDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await adminApi.get(`/admin/organizations/${id}`);
      if (response.data && response.data.success) {
        setOrg(response.data.data);
      } else {
        Swal.fire("Error", "Failed to load organization details.", "error");
      }
    } catch (err: any) {
      console.error("Error fetching organization details:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to load organization details.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments for this organization
  const fetchOrgPayments = async () => {
    if (!id) return;
    setLoadingPayments(true);
    try {
      const response = await adminApi.get("/admin/payments", {
        params: { org_id: id },
      });
      if (response.data && response.data.success) {
        setPayments(response.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching organization payments:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchOrgDetails();
    fetchOrgPayments();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-24 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
          <div className="h-24 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
          <div className="h-24 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
          <div className="h-24 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
        </div>
        <div className="h-96 rounded-2xl bg-gray-200 dark:bg-slate-800"></div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
        <AlertCircle size={48} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organization Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">The requested organization could not be located or has been deleted.</p>
        <Link
          to={`${basePath}/organizations`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#040975] text-white font-semibold text-xs shadow-sm hover:shadow"
        >
          <ArrowLeft size={16} />
          <span>Back to Organizations</span>
        </Link>
      </div>
    );
  }

  const displayHost = getTenantDisplayDomain(org.slug);
  const tenantFullUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${displayHost}`
    : `http://${displayHost}`;
  const expiryDate = org.subscription_expiry_date ? new Date(org.subscription_expiry_date) : null;
  const isExpired = expiryDate ? expiryDate < new Date() : false;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ─── Top Bar with Back Link & Title ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`${basePath}/organizations`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#040975] hover:border-slate-300 transition shadow-xs"
          >
            <ArrowLeft size={15} className="shrink-0" />
            <span>Back to Organizations</span>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {org.name}
          </h1>
        </div>
      </div>

      {/* ─── Metric KPI Ribbon ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Users */}
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
            <Users size={22} className="shrink-0" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered Users</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {org.stats?.users || org.user_count || 1}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active seat allocations</p>
          </div>
        </div>

        {/* Metric 2: Plan Tier */}
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#040975]/10 text-[#040975]">
            <Sparkles size={22} className="shrink-0" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Plan</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {org.plan || "Starter"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Annual SaaS Subscription</p>
          </div>
        </div>

        {/* Metric 3: Total Payments */}
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CreditCard size={22} className="shrink-0" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payments Count</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {payments.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Recorded transactions</p>
          </div>
        </div>

        {/* Metric 4: Platform Status */}
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
            <Shield size={22} className="shrink-0" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Health</p>
            <p className={`text-2xl font-black mt-0.5 ${org.status !== false ? "text-emerald-600" : "text-rose-600"}`}>
              {org.status !== false ? "Active" : "Suspended"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Workspace status</p>
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "border-[#040975] text-[#040975]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          General Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("billing")}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "billing"
              ? "border-[#040975] text-[#040975]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Billing & Payments ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "address"
              ? "border-[#040975] text-[#040975]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Address & Location
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leadership")}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "leadership"
              ? "border-[#040975] text-[#040975]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Leadership & Legal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "admin"
              ? "border-[#040975] text-[#040975]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Tenant Administrator
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization General Details */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 size={16} className="text-[#040975] shrink-0" />
              <span>Organization Profile</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Organization Name</span>
                <span className="font-bold text-slate-900">{org.name}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Workspace Slug</span>
                <span className="font-mono font-bold text-[#040975] bg-[#040975]/5 px-2 py-0.5 rounded">{org.slug}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">URL</span>
                <a
                  href={tenantFullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-semibold text-indigo-600 hover:underline"
                >
                  {tenantFullUrl}
                </a>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Primary Contact Email</span>
                <span className="font-medium text-slate-800">{org.email || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Primary Phone Number</span>
                <span className="font-medium text-slate-800">{org.phone || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Official Website</span>
                {org.website_url ? (
                  <a
                    href={org.website_url.startsWith("http") ? org.website_url : `https://${org.website_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <span>{org.website_url}</span>
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Registration & Mission */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Briefcase size={16} className="text-[#040975] shrink-0" />
              <span>Classification & Registration</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">NGO / Entity Type</span>
                <span className="font-bold text-slate-900">{org.ngo_type || "Trust / Society / Section 8"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registration Number</span>
                <span className="font-mono font-bold text-slate-900">{org.registration_no || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registration Date</span>
                <span className="font-medium text-slate-800">
                  {org.registration_date ? new Date(org.registration_date).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date of Establishment</span>
                <span className="font-medium text-slate-800">
                  {org.date_of_establishment ? new Date(org.date_of_establishment).toLocaleDateString("en-IN") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Registered Under Act</span>
                <span className="font-medium text-slate-800">{org.registered_under_act || "—"}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Purpose / Mission Statement</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  {org.ngo_objective || "No description provided."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Billing & Payments ─── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Subscription Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Current Plan Tier</span>
              <p className="text-xl font-black text-slate-900 mt-1">{org.plan || "Starter Plan"}</p>
              <p className="text-xs text-slate-500 mt-0.5">Annual renewal cycle</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subscription Starts</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {org.subscription_start_date ? new Date(org.subscription_start_date).toLocaleDateString("en-IN") : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Initial activation</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Next Renewal / Expiry</span>
              <p className={`text-xl font-black mt-1 ${isExpired ? "text-rose-600" : "text-slate-900"}`}>
                {org.subscription_expiry_date ? new Date(org.subscription_expiry_date).toLocaleDateString("en-IN") : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{isExpired ? "Subscription Expired" : "Valid active subscription"}</p>
            </div>
          </div>

          {/* Payment Records Table */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={16} className="text-[#040975] shrink-0" />
                <span>Payment & Renewal History</span>
              </h3>
              <span className="text-[11px] font-bold text-[#040975] bg-[#040975]/10 px-2.5 py-0.5 rounded-full">
                {payments.length} Payments Found
              </span>
            </div>

            {loadingPayments ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Loading transaction records...</div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center">
                <CreditCard size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No payment records found for this organization.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Payments made online or logged offline will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Plan / Description</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Method</th>
                      <th className="py-2.5 px-3 text-center">Reference #</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {p.plan_name || p.notes || "Annual Subscription"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number((p.amount_cents || p.amount || 0) / 100).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-center font-medium capitalize text-slate-600">
                          {p.payment_method || p.method || "Online"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {p.reference_number || p.payment_id || p.reference || "—"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === "paid" || p.status === "success" || p.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {p.status || "Paid"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Address & Location ─── */}
      {activeTab === "address" && (() => {
        const streetStr =
          typeof org.street === "string" && org.street.trim()
            ? org.street.trim()
            : typeof org.address === "string" && org.address.trim()
            ? org.address.trim()
            : typeof org.address === "object" && org.address && typeof org.address.street === "string" && org.address.street.trim()
            ? org.address.street.trim()
            : "";

        const cityStr =
          typeof org.city_name === "string" && org.city_name.trim()
            ? org.city_name.trim()
            : typeof org.city === "string" && org.city.trim()
            ? org.city.trim()
            : typeof org.address === "object" && org.address && typeof org.address.city === "string" && org.address.city.trim()
            ? org.address.city.trim()
            : "";

        const stateStr =
          typeof org.state_name === "string" && org.state_name.trim()
            ? org.state_name.trim()
            : typeof org.state === "string" && org.state.trim()
            ? org.state.trim()
            : typeof org.address === "object" && org.address && typeof org.address.state === "string" && org.address.state.trim()
            ? org.address.state.trim()
            : "";

        const pincodeStr =
          typeof org.postal_code === "string" && org.postal_code.trim()
            ? org.postal_code.trim()
            : typeof org.pincode === "string" && org.pincode.trim()
            ? org.pincode.trim()
            : typeof org.address === "object" && org.address && typeof org.address.pincode === "string" && org.address.pincode.trim()
            ? org.address.pincode.trim()
            : "";

        const countryStr =
          typeof org.country === "string" && org.country.trim()
            ? org.country.trim()
            : typeof org.address === "object" && org.address && typeof org.address.country === "string" && org.address.country.trim()
            ? org.address.country.trim()
            : "India";

        const addressTypeStr =
          typeof org.address_type === "string" && org.address_type.trim()
            ? org.address_type.trim()
            : "Registered Office";

        const hasAnyAddressData = Boolean(streetStr || cityStr || stateStr || pincodeStr);

        return (
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs max-w-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <MapPin size={16} className="text-[#040975] shrink-0" />
                <span>Registered Office & Physical Location</span>
              </h3>
              <Link
                to={`${basePath}/organizations/edit/${org.id}`}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Edit Address
              </Link>
            </div>

            {!hasAnyAddressData && (
              <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 text-xs text-slate-500">
                No specific physical street address has been entered for this organization yet.
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Address Classification</span>
                <span className="font-semibold text-slate-900">{addressTypeStr}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Street / Area</span>
                <span className="font-medium text-slate-900">{streetStr || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">City</span>
                <span className="font-medium text-slate-900">{cityStr || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">State</span>
                <span className="font-medium text-slate-900">{stateStr || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">PIN / Postal Code</span>
                <span className="font-mono font-bold text-slate-900">{pincodeStr || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Country</span>
                <span className="font-semibold text-slate-900">{countryStr}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Tab: Leadership & Legal ─── */}
      {activeTab === "leadership" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <UserCheck size={16} className="text-[#040975] shrink-0" />
              <span>Key Executives & Trustees</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">CEO / Director Name</span>
                <span className="font-bold text-slate-900">{org.ceo_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">CEO Contact Phone</span>
                <span className="font-medium text-slate-800">{org.ceo_contact || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Chairperson / President</span>
                <span className="font-bold text-slate-900">{org.chairperson_name || "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Chairperson Contact</span>
                <span className="font-medium text-slate-800">{org.chairperson_contact || "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Share2 size={16} className="text-[#040975] shrink-0" />
              <span>Social Media & Web Presence</span>
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="py-1 border-b border-slate-100">
                <span className="text-slate-500 block mb-1">Social Media Links</span>
                <p className="font-medium text-slate-800 text-[11px] leading-relaxed">
                  {org.social_media_links || "No social profiles registered."}
                </p>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Entity Creation Timestamp</span>
                <span className="font-medium text-slate-700">
                  {new Date(org.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Last Profile Update</span>
                <span className="font-medium text-slate-700">
                  {org.updated_at ? new Date(org.updated_at).toLocaleString("en-IN") : "Recent"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Tenant Administrator ─── */}
      {activeTab === "admin" && (
        <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs max-w-2xl">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Shield size={16} className="text-[#040975] shrink-0" />
            <span>Primary Workspace Administrator</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Administrator Name</span>
              <span className="font-bold text-slate-900">{org.admin?.name || "Administrator"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Email Address (Login ID)</span>
              <span className="font-medium text-slate-900">{org.admin?.email || org.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phone Number</span>
              <span className="font-medium text-slate-900">{org.admin?.phone || org.phone || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Assigned Role</span>
              <span className="font-bold text-[#040975] bg-[#040975]/10 px-2.5 py-0.5 rounded-full">
                {org.admin?.role_name || "Workspace Admin"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Account Status</span>
              <span className="font-bold text-emerald-600 uppercase">{org.admin?.status || "Active"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminOrganizationView;
