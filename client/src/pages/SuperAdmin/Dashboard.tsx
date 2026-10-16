import React, { useEffect, useState } from "react";
import { useSuperAdminStore, TenantRecord } from "@/store/superAdminStore";
import { buildTenantUrl } from "@/utils/subdomain";

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

type ModalTab = "company" | "address" | "workspace" | "admin";

export const SuperAdminDashboard: React.FC = () => {
  const {
    admin,
    tenants,
    metrics,
    loading,
    error,
    logout,
    fetchTenants,
    fetchMetrics,
    createTenant,
    updateTenant,
    getTenantDetails,
    toggleTenantStatus,
  } = useSuperAdminStore();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<ModalTab>("company");

  // Tab 1: Company Details state
  const [formName, setFormName] = useState("");
  const [formRegistrationNo, setFormRegistrationNo] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formEstablishedDate, setFormEstablishedDate] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formTimezone, setFormTimezone] = useState("Asia/Kolkata");
  const [formLogoUrl, setFormLogoUrl] = useState("");

  // Tab 2: Address & Location state
  const [formStreet, setFormStreet] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formPincode, setFormPincode] = useState("");

  // Tab 3: Workspace & Plan state
  const [formSlug, setFormSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formPlan, setFormPlan] = useState("pro");

  // Tab 4: Primary Administrator state
  const [formAdminName, setFormAdminName] = useState("");
  const [formAdminEmail, setFormAdminEmail] = useState("");
  const [adminEmailManuallyEdited, setAdminEmailManuallyEdited] = useState(false);
  const [formAdminPassword, setFormAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);
  const [createdTenantResult, setCreatedTenantResult] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTenants();
    fetchMetrics();
  }, [fetchTenants, fetchMetrics]);

  // Auto-slugify organization name
  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!slugManuallyEdited && !editingTenant) {
      const slugified = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormSlug(slugified);
    }
  };

  const handleEmailChange = (email: string) => {
    setFormEmail(email);
    if (!adminEmailManuallyEdited && !editingTenant) {
      setFormAdminEmail(email);
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setFormSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleOpenCreateModal = () => {
    resetModal();
    setEditingTenant(null);
    setShowModal(true);
  };

  const handleOpenEditModal = async (t: TenantRecord) => {
    resetModal();
    setEditingTenant(t);
    setActiveTab("company");

    // Populate from current tenant record
    setFormName(t.name || "");
    setFormLogoUrl(t.logo_url || "");
    setFormRegistrationNo(t.settings?.registration_no || "");
    setFormEmail(t.settings?.email || "");
    setFormPhone(t.settings?.phone || "");
    setFormWebsite(t.settings?.website || "");
    setFormEstablishedDate(t.settings?.established_date || "");
    setFormCurrency(t.settings?.currency || "INR");
    setFormTimezone(t.settings?.timezone || "Asia/Kolkata");

    setFormStreet(t.settings?.address?.street || "");
    setFormCity(t.settings?.address?.city || "");
    setFormState(t.settings?.address?.state || "");
    setFormCountry(t.settings?.address?.country || "India");
    setFormPincode(t.settings?.address?.pincode || "");

    setFormSlug(t.slug || "");
    setSlugManuallyEdited(true);
    setFormPlan(t.plan || "pro");

    setFormAdminName("");
    setFormAdminEmail("");
    setAdminEmailManuallyEdited(false);
    setFormAdminPassword("");
    setShowPassword(false);

    setShowModal(true);

    // Fetch full tenant details to pre-fill admin user information
    const details = await getTenantDetails(t.id);
    if (details) {
      if (details.admin?.name) setFormAdminName(details.admin.name);
      if (details.admin?.email) setFormAdminEmail(details.admin.email);
      if (details.email || details.settings?.email) {
        setFormEmail(details.email || details.settings?.email);
      }
      if (details.phone || details.settings?.phone) {
        setFormPhone(details.phone || details.settings?.phone);
      }
      if (details.website || details.settings?.website) {
        setFormWebsite(details.website || details.settings?.website);
      }
      if (details.registration_no || details.settings?.registration_no) {
        setFormRegistrationNo(details.registration_no || details.settings?.registration_no);
      }
      if (details.established_date || details.settings?.established_date) {
        setFormEstablishedDate(details.established_date || details.settings?.established_date);
      }
      if (details.currency || details.settings?.currency) {
        setFormCurrency(details.currency || details.settings?.currency);
      }
      if (details.timezone || details.settings?.timezone) {
        setFormTimezone(details.timezone || details.settings?.timezone);
      }
      if (details.address?.street || details.settings?.address?.street) {
        setFormStreet(details.address?.street || details.settings?.address?.street);
      }
      if (details.address?.city || details.settings?.address?.city) {
        setFormCity(details.address?.city || details.settings?.address?.city);
      }
      if (details.address?.state || details.settings?.address?.state) {
        setFormState(details.address?.state || details.settings?.address?.state);
      }
      if (details.address?.country || details.settings?.address?.country) {
        setFormCountry(details.address?.country || details.settings?.address?.country);
      }
      if (details.address?.pincode || details.settings?.address?.pincode) {
        setFormPincode(details.address?.pincode || details.settings?.address?.pincode);
      }
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Validation
    if (!formName.trim()) {
      setActiveTab("company");
      setModalError("Please provide the Organization Name in Company Details.");
      return;
    }

    if (!formSlug.trim()) {
      setActiveTab("workspace");
      setModalError("Please provide a Subdomain Slug in Workspace & Plan.");
      return;
    }

    if (!editingTenant) {
      if (!formAdminName.trim()) {
        setActiveTab("admin");
        setModalError("Please enter Administrator Name in Primary Administrator.");
        return;
      }

      if (!formAdminEmail.trim()) {
        setActiveTab("admin");
        setModalError("Please enter Administrator Email in Primary Administrator.");
        return;
      }

      if (!formAdminPassword.trim()) {
        setActiveTab("admin");
        setModalError("Please enter Administrator Password in Primary Administrator.");
        return;
      }
    }

    setSubmitting(true);

    if (editingTenant) {
      // EDIT MODE
      const payload: any = {
        name: formName.trim(),
        slug: formSlug.trim(),
        plan: formPlan,
        registration_no: formRegistrationNo.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        website: formWebsite.trim(),
        established_date: formEstablishedDate,
        currency: formCurrency,
        timezone: formTimezone,
        logo_url: formLogoUrl.trim(),
        street: formStreet.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        country: formCountry.trim(),
        pincode: formPincode.trim(),
      };

      if (formAdminName.trim()) payload.admin_name = formAdminName.trim();
      if (formAdminEmail.trim()) payload.admin_email = formAdminEmail.trim();
      if (formAdminPassword.trim()) payload.admin_password = formAdminPassword.trim();

      const res = await updateTenant(editingTenant.id, payload);
      setSubmitting(false);

      if (res.success) {
        resetModal();
      } else {
        setModalError(res.error || "Failed to update organization");
      }
    } else {
      // CREATE MODE
      const res = await createTenant({
        name: formName.trim(),
        slug: formSlug.trim(),
        plan: formPlan,
        admin_name: formAdminName.trim(),
        admin_email: formAdminEmail.trim(),
        admin_password: formAdminPassword,
        registration_no: formRegistrationNo.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        website: formWebsite.trim(),
        established_date: formEstablishedDate,
        currency: formCurrency,
        timezone: formTimezone,
        logo_url: formLogoUrl.trim(),
        street: formStreet.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        country: formCountry.trim(),
        pincode: formPincode.trim(),
      });

      setSubmitting(false);

      if (res.success && res.tenant) {
        setCreatedTenantResult(res.tenant);
      } else {
        setModalError(res.error || "Failed to create organization");
      }
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setActiveTab("company");
    setFormName("");
    setFormRegistrationNo("");
    setFormEmail("");
    setFormPhone("");
    setFormWebsite("");
    setFormEstablishedDate("");
    setFormCurrency("INR");
    setFormTimezone("Asia/Kolkata");
    setFormLogoUrl("");
    setFormStreet("");
    setFormCity("");
    setFormState("");
    setFormCountry("India");
    setFormPincode("");
    setFormSlug("");
    setSlugManuallyEdited(false);
    setFormPlan("pro");
    setFormAdminName("");
    setFormAdminEmail("");
    setAdminEmailManuallyEdited(false);
    setFormAdminPassword("");
    setShowPassword(false);
    setModalError(null);
    setCreatedTenantResult(null);
  };

  const tabsList: { id: ModalTab; label: string; icon: string }[] = [
    { id: "company", label: "Company Details", icon: "mgc_building_2_line" },
    { id: "address", label: "Address & Location", icon: "mgc_map_pin_line" },
    { id: "workspace", label: "Workspace & Plan", icon: "mgc_server_line" },
    { id: "admin", label: "Primary Administrator", icon: "mgc_user_star_line" },
  ];

  const currentTabIndex = tabsList.findIndex((t) => t.id === activeTab);
  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabsList[currentTabIndex - 1].id);
    }
  };
  const handleNextTab = () => {
    if (currentTabIndex < tabsList.length - 1) {
      setActiveTab(tabsList[currentTabIndex + 1].id);
    }
  };

  const handleToggleStatus = async (tenant: TenantRecord) => {
    setActionLoadingId(tenant.id);
    await toggleTenantStatus(tenant.id, tenant.status);
    setActionLoadingId(null);
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
              <i className="mgc_shield_line"></i>
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-white">
                SaaS Super Admin
              </h1>
              <p className="text-xs text-slate-400">Multi-Tenant Management Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <i className="mgc_user_3_line text-slate-400"></i>
              <span>{admin?.name || admin?.email || "Super Admin"}</span>
            </div>
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <i className="mgc_exit_line text-sm"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Organizations
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {metrics?.totalTenants ?? tenants.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
              <i className="mgc_community_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Organizations
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                {metrics?.activeTenants ?? tenants.filter((t) => t.status === "active").length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              <i className="mgc_check_circle_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Platform Users
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {metrics?.totalUsers ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
              <i className="mgc_user_3_line"></i>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Leads
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1">
                {metrics?.totalLeads ?? 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              <i className="mgc_target_line"></i>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="relative flex-1 sm:max-w-md">
            <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations by name or subdomain..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchTenants();
                fetchMetrics();
              }}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
              title="Refresh"
            >
              <i className="mgc_refresh_3_line text-sm"></i>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <i className="mgc_add_circle_line text-base"></i>
              <span>Create Organization</span>
            </button>
          </div>
        </div>

        {/* Organizations Table Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Subdomain / Login URL</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Users</th>
                  <th className="py-3.5 px-4">Leads</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p>Loading organizations...</p>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <i className="mgc_ghost_line text-4xl mb-2 text-slate-600 block"></i>
                      <p>No organizations found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const workspaceUrl = buildTenantUrl(t.slug, "/login");
                    const isDefault = t.slug === "default";

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {t.logo_url ? (
                              <img
                                src={t.logo_url}
                                alt={t.name}
                                className="w-9 h-9 rounded-xl object-contain bg-slate-800 p-1 border border-slate-700 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                                {t.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white leading-tight">{t.name}</p>
                              <p className="text-xs text-slate-400">ID: #{t.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                              {t.slug}
                            </span>
                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                              title="Open Login Workspace"
                            >
                              <i className="mgc_external_link_line text-sm"></i>
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {t.plan || "pro"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {t.user_count}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {t.lead_count}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              t.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                              }`}
                            ></span>
                            <span className="capitalize">{t.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(t)}
                              className="h-8 px-2.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 flex items-center gap-1.5 transition-colors"
                              title="Edit Organization Details"
                            >
                              <i className="mgc_edit_line text-sm"></i>
                              <span>Edit</span>
                            </button>

                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 px-2.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1"
                            >
                              <span>Workspace</span>
                              <i className="mgc_external_link_line text-xs"></i>
                            </a>

                            {!isDefault && (
                              <button
                                onClick={() => handleToggleStatus(t)}
                                disabled={actionLoadingId === t.id}
                                className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                                  t.status === "active"
                                    ? "border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30"
                                    : "border-emerald-900/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30"
                                }`}
                              >
                                {actionLoadingId === t.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : t.status === "active" ? (
                                  "Suspend"
                                ) : (
                                  "Activate"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: Create Organization */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl">
                  <i className="mgc_building_2_line"></i>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {editingTenant ? `Edit Organization: ${editingTenant.name}` : "Create New Organization"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingTenant
                      ? "Update tenant organization settings, plan, branding & administrator details"
                      : "Provision a multi-tenant CRM workspace with profile & admin credentials"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            {createdTenantResult ? (
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-base">
                    <i className="mgc_check_circle_fill text-xl"></i>
                    <span>Organization Created Successfully!</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    The tenant workspace has been automatically provisioned with default sales pipelines,
                    administrator role, and initial user credentials.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Organization Name</span>
                      <span className="font-bold text-white text-base">
                        {createdTenantResult.name}
                      </span>
                    </div>
                    <span className="capitalize px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                      {createdTenantResult.plan || "pro"} Plan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Subdomain Slug</span>
                      <span className="font-mono text-indigo-300 font-semibold">{createdTenantResult.slug}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Admin Email</span>
                      <span className="text-slate-200">{formAdminEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Currency / Timezone</span>
                      <span className="text-slate-200">{formCurrency} • {formTimezone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Location</span>
                      <span className="text-slate-200">{[formCity, formCountry].filter(Boolean).join(", ") || "-"}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="text-slate-400 block mb-1">Subdomain Login URL:</span>
                    <a
                      href={buildTenantUrl(createdTenantResult.slug, "/login")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline font-mono text-xs flex items-center gap-1.5 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60"
                    >
                      <span>{buildTenantUrl(createdTenantResult.slug, "/login")}</span>
                      <i className="mgc_external_link_line text-sm"></i>
                    </a>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                  >
                    Done
                  </button>
                  <a
                    href={buildTenantUrl(createdTenantResult.slug, "/login")}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <span>Open Workspace</span>
                    <i className="mgc_external_link_line"></i>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="flex flex-col flex-1 overflow-hidden">
                {/* Navigation Tabs Bar */}
                <div className="flex border-b border-slate-800 px-6 overflow-x-auto gap-2 bg-slate-950/40 shrink-0">
                  {tabsList.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                          isActive
                            ? "border-indigo-500 text-indigo-400"
                            : "border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <i className={`${tab.icon} text-base`}></i>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {modalError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <i className="mgc_alert_line text-base text-rose-400 shrink-0"></i>
                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* TAB 1: Company Details */}
                  {activeTab === "company" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Organization Name *
                          </label>
                          <input
                            type="text"
                            value={formName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g. Acme Corporation"
                            required
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            Official company brand name displayed across this CRM workspace.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Registration / Tax Number
                          </label>
                          <input
                            type="text"
                            value={formRegistrationNo}
                            onChange={(e) => setFormRegistrationNo(e.target.value)}
                            placeholder="e.g. CIN / GSTIN / Tax ID"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Primary Email
                          </label>
                          <input
                            type="email"
                            value={formEmail}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder="contact@company.com"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={formPhone}
                            onChange={(e) => setFormPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Company Website
                          </label>
                          <input
                            type="url"
                            value={formWebsite}
                            onChange={(e) => setFormWebsite(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Date of Establishment
                          </label>
                          <input
                            type="date"
                            value={formEstablishedDate}
                            onChange={(e) => setFormEstablishedDate(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Default Currency
                          </label>
                          <select
                            value={formCurrency}
                            onChange={(e) => setFormCurrency(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Timezone
                          </label>
                          <select
                            value={formTimezone}
                            onChange={(e) => setFormTimezone(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  {activeTab === "address" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Street Address
                          </label>
                          <input
                            type="text"
                            value={formStreet}
                            onChange={(e) => setFormStreet(e.target.value)}
                            placeholder="e.g. Suite 500, Tech Park Road"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            City
                          </label>
                          <input
                            type="text"
                            value={formCity}
                            onChange={(e) => setFormCity(e.target.value)}
                            placeholder="e.g. Bengaluru"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            State / Province
                          </label>
                          <input
                            type="text"
                            value={formState}
                            onChange={(e) => setFormState(e.target.value)}
                            placeholder="e.g. Karnataka"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Country
                          </label>
                          <input
                            type="text"
                            value={formCountry}
                            onChange={(e) => setFormCountry(e.target.value)}
                            placeholder="e.g. India"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Postal / PIN Code
                          </label>
                          <input
                            type="text"
                            value={formPincode}
                            onChange={(e) => setFormPincode(e.target.value)}
                            placeholder="e.g. 560001"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Workspace & Plan */}
                  {activeTab === "workspace" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Subdomain Slug *
                          </label>
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={formSlug}
                              onChange={(e) => handleSlugChange(e.target.value)}
                              placeholder="acme"
                              required
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-l-xl text-sm font-mono text-indigo-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="px-3 py-2 bg-slate-800/60 border border-l-0 border-slate-700 rounded-r-xl text-xs font-mono text-slate-400 whitespace-nowrap">
                              .{window.location.hostname.includes("localhost") ? "localhost:5173" : window.location.hostname}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Will form the workspace URL:{" "}
                            <span className="text-indigo-400 font-mono">
                              {formSlug || "subdomain"}.{window.location.hostname.includes("localhost") ? "localhost:5173" : window.location.hostname}
                            </span>
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Subscription Plan
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: "starter", title: "Starter", desc: "Basic CRM for small teams" },
                              { id: "pro", title: "Professional", desc: "Full features & pipelines" },
                              { id: "enterprise", title: "Enterprise", desc: "Unlimited power & scale" },
                            ].map((p) => {
                              const isSelected = formPlan === p.id;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => setFormPlan(p.id)}
                                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/50"
                                      : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-white capitalize">{p.title}</span>
                                    {isSelected && <i className="mgc_check_circle_fill text-indigo-400 text-sm"></i>}
                                  </div>
                                  <p className="text-[11px] text-slate-400">{p.desc}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
                          <i className="mgc_shield_line text-indigo-400 text-base shrink-0 mt-0.5"></i>
                          <div>
                            <span className="font-semibold text-white block mb-0.5">Automated Tenant Isolation</span>
                            <span className="text-slate-400 text-[11px]">
                              Every organization receives an isolated database partition with dedicated sales stages,
                              roles, and custom lead sources.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Primary Administrator */}
                  {activeTab === "admin" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Administrator Full Name {editingTenant ? "(Optional)" : "*"}
                          </label>
                          <input
                            type="text"
                            value={formAdminName}
                            onChange={(e) => setFormAdminName(e.target.value)}
                            placeholder="e.g. John Doe"
                            required={!editingTenant}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Administrator Email Address {editingTenant ? "(Optional)" : "*"}
                          </label>
                          <input
                            type="email"
                            value={formAdminEmail}
                            onChange={(e) => {
                              setAdminEmailManuallyEdited(true);
                              setFormAdminEmail(e.target.value);
                            }}
                            placeholder="admin@company.com"
                            required={!editingTenant}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            {editingTenant ? "Reset Administrator Password (Optional)" : "Initial Administrator Password *"}
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={formAdminPassword}
                              onChange={(e) => setFormAdminPassword(e.target.value)}
                              placeholder={editingTenant ? "Leave empty to keep current password" : "••••••••••••"}
                              required={!editingTenant}
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                            >
                              <i className={showPassword ? "mgc_eye_close_line" : "mgc_eye_line"}></i>
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {editingTenant
                              ? "Leave empty to preserve the existing password, or enter a new password to reset it."
                              : "Used for the initial login. The administrator will be granted full administrative system privileges."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 shrink-0">
                  <div className="flex items-center gap-2">
                    {currentTabIndex > 0 && (
                      <button
                        type="button"
                        onClick={handlePrevTab}
                        className="h-9 px-3.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <i className="mgc_left_line text-sm"></i>
                        <span>Previous</span>
                      </button>
                    )}
                    {currentTabIndex < tabsList.length - 1 && (
                      <button
                        type="button"
                        onClick={handleNextTab}
                        className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        <span>Next Step</span>
                        <i className="mgc_right_line text-sm"></i>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetModal}
                      className="h-9 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>{editingTenant ? "Saving Changes..." : "Provisioning..."}</span>
                        </>
                      ) : (
                        <>
                          <i className="mgc_check_line text-sm"></i>
                          <span>{editingTenant ? "Save Changes" : "Create Organization"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
