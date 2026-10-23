import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTenantStore, TenantProfile } from "@/store/tenantStore";
import { getSubdomain } from "@/utils/subdomain";

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR ₹)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD $)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR €)" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP £)" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (AED)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (SGD)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD)" },
];

const OrganizationPage: React.FC = () => {
  const { profile, loading, saving, fetchProfile, updateProfile } = useTenantStore();
  const [activeTab, setActiveTab] = useState<"general" | "contact" | "workspace" | "admin">("general");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    logo_url: string;
    email: string;
    phone: string;
    website: string;
    registration_no: string;
    established_date: string;
    currency: string;
    timezone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  }>({
    name: "",
    logo_url: "",
    email: "",
    phone: "",
    website: "",
    registration_no: "",
    established_date: "",
    currency: "INR",
    timezone: "Asia/Kolkata",
    street: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        logo_url: profile.logo_url || "",
        email: profile.email || profile.settings?.email || profile.admin?.email || "",
        phone: profile.phone || profile.settings?.phone || "",
        website: profile.website || profile.settings?.website || "",
        registration_no: profile.registration_no || profile.settings?.registration_no || "",
        established_date: profile.established_date || profile.settings?.established_date || "",
        currency: profile.currency || profile.settings?.currency || "INR",
        timezone: profile.timezone || profile.settings?.timezone || "Asia/Kolkata",
        street: profile.address?.street || profile.settings?.address?.street || "",
        city: profile.address?.city || profile.settings?.address?.city || "",
        state: profile.address?.state || profile.settings?.address?.state || "",
        country: profile.address?.country || profile.settings?.address?.country || "",
        pincode: profile.address?.pincode || profile.settings?.address?.pincode || "",
      });
    }
  }, [profile]);

  const handleCopyUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({
      name: formData.name,
      logo_url: formData.logo_url || null,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      registration_no: formData.registration_no,
      established_date: formData.established_date,
      currency: formData.currency,
      timezone: formData.timezone,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        pincode: formData.pincode,
      },
    });

    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        logo_url: profile.logo_url || "",
        email: profile.email || profile.settings?.email || profile.admin?.email || "",
        phone: profile.phone || profile.settings?.phone || "",
        website: profile.website || profile.settings?.website || "",
        registration_no: profile.registration_no || profile.settings?.registration_no || "",
        established_date: profile.established_date || profile.settings?.established_date || "",
        currency: profile.currency || profile.settings?.currency || "INR",
        timezone: profile.timezone || profile.settings?.timezone || "Asia/Kolkata",
        street: profile.address?.street || profile.settings?.address?.street || "",
        city: profile.address?.city || profile.settings?.address?.city || "",
        state: profile.address?.state || profile.settings?.address?.state || "",
        country: profile.address?.country || profile.settings?.address?.country || "",
        pincode: profile.address?.pincode || profile.settings?.address?.pincode || "",
      });
    }
    setIsEditing(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const inputCls =
    "w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] transition-colors disabled:bg-gray-50 disabled:dark:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide";

  if (loading && !profile) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        <div className="h-44 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const { slug } = getSubdomain();
  const orgSlug = profile?.slug || slug || "workspace";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Breadcrumb & Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Organization Profile</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
              Organization Details
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-[#0088cc] dark:bg-blue-900/40 dark:text-blue-300">
              Tenant Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              <i className="mgc_edit_line text-base"></i>
              Edit Organization
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <i className="mgc_loading_line animate-spin text-base"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="mgc_check_line text-base"></i>
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Organization Hero Card ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#0088cc]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Logo / Avatar */}
            <div className="relative group">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt={profile?.name || "Organization Logo"}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white/10 border-2 border-white/20 shadow-md p-1"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-teal-400 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-2 border-white/20 shadow-md">
                  {(profile?.name || "ORG").substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {profile?.name || "Organization Name"}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    profile?.status === "active"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {profile?.status || "Active"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {profile?.plan || "Pro"} Plan
                </span>
              </div>

              <p className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                <i className="mgc_earth_line text-slate-400"></i>
                <span className="font-mono text-xs text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  {window.location.host}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors ml-1"
                  title="Copy workspace URL"
                >
                  <i className={copied ? "mgc_check_line text-emerald-400" : "mgc_copy_line"}></i>
                  {copied ? "Copied" : "Copy"}
                </button>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                {profile?.email && (
                  <span className="flex items-center gap-1.5">
                    <i className="mgc_mail_line text-slate-400"></i>
                    {profile.email}
                  </span>
                )}
                {profile?.phone && (
                  <span className="flex items-center gap-1.5">
                    <i className="mgc_phone_line text-slate-400"></i>
                    {profile.phone}
                  </span>
                )}
                {profile?.created_at && (
                  <span className="flex items-center gap-1.5">
                    <i className="mgc_calendar_line text-slate-400"></i>
                    Member since {formatDate(profile.created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] flex items-center justify-center text-xl shrink-0">
            <i className="mgc_group_line"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Team Members</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{profile?.stats?.users ?? 1}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center text-xl shrink-0">
            <i className="mgc_target_line"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Leads</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{profile?.stats?.leads ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center text-xl shrink-0">
            <i className="mgc_contacts_line"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Client Contacts</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{profile?.stats?.contacts ?? 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-xl shrink-0">
            <i className="mgc_shield_line"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Workspace ID</p>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 font-mono">#{profile?.id || 1}</p>
          </div>
        </div>
      </div>

      {/* ── Main Tabbed Content Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-3 overflow-x-auto gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "general"
                ? "border-[#0088cc] text-[#0088cc]"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <i className="mgc_building_2_line text-base"></i>
            Company Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "contact"
                ? "border-[#0088cc] text-[#0088cc]"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <i className="mgc_map_pin_line text-base"></i>
            Address & Location
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "workspace"
                ? "border-[#0088cc] text-[#0088cc]"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <i className="mgc_server_line text-base"></i>
            Workspace & Plan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`pb-3.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === "admin"
                ? "border-[#0088cc] text-[#0088cc]"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <i className="mgc_user_star_line text-base"></i>
            Primary Administrator
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8">
          {/* TAB 1: General Details */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Organization Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className={inputCls}
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Your official company or brand name displayed across the CRM.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Registration / Tax Number</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.registration_no}
                    onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                    placeholder="e.g. CIN / GSTIN / Tax ID"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Primary Email</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@company.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Company Website</label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Date of Establishment</label>
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={formData.established_date}
                    onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Default Currency</label>
                  <select
                    disabled={!isEditing}
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className={inputCls}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Timezone</label>
                  <select
                    disabled={!isEditing}
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className={inputCls}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Location */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelCls}>Street Address</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Suite 500, Tech Park Road"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>State / Province</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. India"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Postal / PIN Code</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    placeholder="e.g. 560001"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Workspace & Subscription */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Tenant Organization ID</label>
                  <input type="text" disabled value={profile?.id || ""} className={inputCls} />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Internal multi-tenant identifier used for system isolation.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Subdomain Slug</label>
                  <input type="text" disabled value={orgSlug} className={inputCls} />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Your unique subdomain identifier ({orgSlug}.localhost:5173).
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Subscription Plan</label>
                  <input
                    type="text"
                    disabled
                    value={(profile?.plan || "Pro").toUpperCase()}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Managed by the SaaS Super Admin platform.
                  </p>
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  <input
                    type="text"
                    disabled
                    value={(profile?.status || "Active").toUpperCase()}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Member Since</label>
                  <input type="text" disabled value={formatDate(profile?.created_at)} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Last Profile Update</label>
                  <input type="text" disabled value={formatDate(profile?.updated_at)} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Primary Administrator */}
          {activeTab === "admin" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-3">
                <i className="mgc_information_line text-lg text-[#0088cc] mt-0.5 shrink-0"></i>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  This is the primary super-user account created during organization provisioning. To manage all users,
                  assign roles, or add team members, visit{" "}
                  <Link to="/settings/users" className="text-[#0088cc] font-semibold hover:underline">
                    Settings → Users
                  </Link>
                  .
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Administrator Name</label>
                  <input type="text" disabled value={profile?.admin?.name || "Administrator"} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Administrator Email</label>
                  <input type="email" disabled value={profile?.admin?.email || ""} className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>Role</label>
                  <input type="text" disabled value="Administrator (Full Access)" className={inputCls} />
                </div>

                <div>
                  <label className={labelCls}>User ID</label>
                  <input type="text" disabled value={`#${profile?.admin?.id || "-"}`} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {/* Save bar when editing */}
          {isEditing && (
            <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#0088cc] hover:bg-[#0077b3] text-white shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <i className="mgc_loading_line animate-spin text-base"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="mgc_check_line text-base"></i>
                    Save Organization Details
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default OrganizationPage;
