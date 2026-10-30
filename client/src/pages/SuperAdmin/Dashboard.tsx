import React, { useEffect, useState } from "react";
import { useSuperAdminStore, TenantRecord } from "@/store/superAdminStore";
import { buildTenantUrl } from "@/utils/subdomain";
import PaymentLinkDialog from "@/pages/SuperAdmin/PaymentLinkDialog";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  Ghost,
  LogOut,
  Mail,
  MapPin,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Target,
  UserRound,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

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

// ─── Detail Field component ──────────────────────────────────────────────────
const DetailField: React.FC<{
  label: string;
  value?: string | null;
  link?: boolean;
  span?: boolean;
}> = ({ label, value, link, span }) => (
  <div className={span ? "md:col-span-2 min-w-0" : "min-w-0"}>
    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">
      {label}
    </p>
    {link && value ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-400 hover:underline text-sm font-medium break-all"
        style={{ overflowWrap: "anywhere", wordBreak: "break-all" }}
      >
        {value}
      </a>
    ) : (
      <p
        className="text-sm text-slate-200 font-medium break-words"
        style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
      >
        {value || "-"}
      </p>
    )}
  </div>
);

// ─── Section heading ─────────────────────────────────────────────────────────
const DetailSection: React.FC<{ title: string; icon: LucideIcon; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => {
  const Icon = icon;
  return (
  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-4">
    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon aria-hidden="true" size={17} />
      </span>
      <h4 className="text-sm font-bold text-white">{title}</h4>
    </div>
    <div className="grid md:grid-cols-2 gap-4">{children}</div>
  </div>
  );
};

export const SuperAdminDashboard: React.FC<{
  showMetrics?: boolean;
  canViewOrganizations?: boolean;
  canCreateOrganizations?: boolean;
  canEditOrganizations?: boolean;
  canSendPaymentLinks?: boolean;
}> = ({
  showMetrics = true,
  canViewOrganizations = true,
  canCreateOrganizations = true,
  canEditOrganizations = true,
  canSendPaymentLinks = false,
}) => {
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [paymentLinkTenant, setPaymentLinkTenant] = useState<TenantRecord | null>(null);

  // ── View Detail Panel ──────────────────────────────────────────────────────
  const [viewingTenant, setViewingTenant] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<ModalTab>("company");

  // Tab 1: Company Details state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRegistrationNo, setFormRegistrationNo] = useState("");
  const [formRegisteredUnderAct, setFormRegisteredUnderAct] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formSocialMediaLinks, setFormSocialMediaLinks] = useState("");
  const [formEstablishedDate, setFormEstablishedDate] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formTimezone, setFormTimezone] = useState("Asia/Kolkata");
  const [formLogoUrl, setFormLogoUrl] = useState("");

  // Key Persons state
  const [formCeoName, setFormCeoName] = useState("");
  const [formCeoContact, setFormCeoContact] = useState("");
  const [formChairpersonName, setFormChairpersonName] = useState("");
  const [formChairpersonContact, setFormChairpersonContact] = useState("");

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
    if (canViewOrganizations) void fetchTenants();
    if (showMetrics) void fetchMetrics();
  }, [canViewOrganizations, fetchTenants, fetchMetrics, showMetrics]);

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

    // Fetch full tenant details to pre-fill all fields
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
      // New fields
      if (details.description || details.settings?.description) {
        setFormDescription(details.description || details.settings?.description || "");
      }
      if (details.registered_under_act || details.settings?.registered_under_act) {
        setFormRegisteredUnderAct(details.registered_under_act || details.settings?.registered_under_act || "");
      }
      if (details.social_media_links || details.settings?.social_media_links) {
        setFormSocialMediaLinks(details.social_media_links || details.settings?.social_media_links || "");
      }
      if (details.ceo_name || details.settings?.ceo_name) {
        setFormCeoName(details.ceo_name || details.settings?.ceo_name || "");
      }
      if (details.ceo_contact || details.settings?.ceo_contact) {
        setFormCeoContact(details.ceo_contact || details.settings?.ceo_contact || "");
      }
      if (details.chairperson_name || details.settings?.chairperson_name) {
        setFormChairpersonName(details.chairperson_name || details.settings?.chairperson_name || "");
      }
      if (details.chairperson_contact || details.settings?.chairperson_contact) {
        setFormChairpersonContact(details.chairperson_contact || details.settings?.chairperson_contact || "");
      }
    }
  };

  // ── View Detail Handler ────────────────────────────────────────────────────
  const handleViewDetail = async (t: TenantRecord) => {
    setDetailLoading(true);
    setViewingTenant({ ...t, _loading: true });
    const details = await getTenantDetails(t.id);
    setViewingTenant(details ? { ...t, ...details } : t);
    setDetailLoading(false);
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

    const commonPayload: any = {
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
      // New fields
      description: formDescription.trim(),
      registered_under_act: formRegisteredUnderAct.trim(),
      social_media_links: formSocialMediaLinks.trim(),
      ceo_name: formCeoName.trim(),
      ceo_contact: formCeoContact.trim(),
      chairperson_name: formChairpersonName.trim(),
      chairperson_contact: formChairpersonContact.trim(),
    };

    if (editingTenant) {
      // EDIT MODE
      if (formAdminName.trim()) commonPayload.admin_name = formAdminName.trim();
      if (formAdminEmail.trim()) commonPayload.admin_email = formAdminEmail.trim();
      if (formAdminPassword.trim()) commonPayload.admin_password = formAdminPassword.trim();

      const res = await updateTenant(editingTenant.id, commonPayload);
      setSubmitting(false);

      if (res.success) {
        resetModal();
      } else {
        setModalError(res.error || "Failed to update organization");
      }
    } else {
      // CREATE MODE
      const res = await createTenant({
        ...commonPayload,
        admin_name: formAdminName.trim(),
        admin_email: formAdminEmail.trim(),
        admin_password: formAdminPassword,
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
    setFormDescription("");
    setFormRegistrationNo("");
    setFormRegisteredUnderAct("");
    setFormEmail("");
    setFormPhone("");
    setFormWebsite("");
    setFormSocialMediaLinks("");
    setFormEstablishedDate("");
    setFormCurrency("INR");
    setFormTimezone("Asia/Kolkata");
    setFormLogoUrl("");
    setFormCeoName("");
    setFormCeoContact("");
    setFormChairpersonName("");
    setFormChairpersonContact("");
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

  const tabsList: { id: ModalTab; label: string; icon: LucideIcon }[] = [
    { id: "company", label: "Company Details", icon: Building2 },
    { id: "address", label: "Address & Location", icon: MapPin },
    { id: "workspace", label: "Workspace & Plan", icon: Server },
    { id: "admin", label: "Primary Administrator", icon: UserRoundCog },
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
    setStatusError(null);
    setActionLoadingId(tenant.id);
    try {
      const updated = await toggleTenantStatus(tenant.id, tenant.status);
      if (!updated) {
        setStatusError(`Could not update ${tenant.name}. Please refresh and try again.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const openPaymentLinkDialog = (tenant: TenantRecord) => {
    setStatusError(null);
    setPaymentLinkTenant(tenant);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const filteredTenants = tenants.filter(
    (t) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        t.name.toLowerCase().includes(normalizedSearch) ||
        t.slug.toLowerCase().includes(normalizedSearch);
      return matchesSearch && (statusFilter === "all" || t.status === statusFilter);
    }
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
              <ShieldCheck aria-hidden="true" size={21} />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-white">
                {showMetrics ? "SaaS Super Admin" : "Organizations"}
              </h1>
              <p className="text-xs text-slate-400">
                {showMetrics ? "Multi-Tenant Management Console" : "Manage tenant workspaces and status"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <UserRound aria-hidden="true" className="text-indigo-500" size={15} />
              <span>{admin?.name || admin?.email || "Super Admin"}</span>
            </div>
            <button
              onClick={logout}
              className="h-8 px-3 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
            >
              <LogOut aria-hidden="true" size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {showMetrics && (
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
              <Building2 aria-hidden="true" size={22} />
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
              <CircleCheck aria-hidden="true" size={22} />
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
              <Users aria-hidden="true" size={22} />
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
              <Target aria-hidden="true" size={22} />
            </div>
          </div>
        </div>
        )}

        {canViewOrganizations && (<>
        {/* Toolbar & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations by name or subdomain..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter organizations by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={() => {
                if (canViewOrganizations) void fetchTenants();
                if (showMetrics) void fetchMetrics();
              }}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
              title="Refresh"
            >
              <RefreshCw aria-hidden="true" size={15} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {canCreateOrganizations && <button
              onClick={handleOpenCreateModal}
              className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle aria-hidden="true" size={17} />
              <span>Create Organization</span>
            </button>}
          </div>
        </div>

        {(statusError || error) && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {statusError || error}
          </div>
        )}

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
                      <Ghost aria-hidden="true" className="mx-auto mb-2 text-slate-400" size={38} />
                      <p>No organizations match the current search and status filters.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTenants.map((t) => {
                    const workspaceUrl = buildTenantUrl(t.slug, "/login");
                    const isDefault = t.slug === "default";

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(t)}
                      >
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
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink aria-hidden="true" size={15} />
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
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {canSendPaymentLinks && !isDefault && <button
                              type="button"
                              aria-label={`Email payment link for ${t.name}`}
                              onClick={() => openPaymentLinkDialog(t)}
                              className="super-admin-action-icon"
                              title="Email a hosted payment link for this organization's assigned plan"
                            >
                              <Send aria-hidden="true" size={17} />
                            </button>}
                            {canEditOrganizations && <button
                              type="button"
                              aria-label={`Edit ${t.name}`}
                              onClick={() => handleOpenEditModal(t)}
                              className="super-admin-action-icon"
                              title="Edit Organization Details"
                            >
                              <Pencil aria-hidden="true" size={16} />
                            </button>}

                            <a
                              href={workspaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${t.name} workspace`}
                              title="Open workspace"
                              className="super-admin-action-icon"
                            >
                              <ExternalLink aria-hidden="true" size={16} />
                            </a>

                            {canEditOrganizations && !isDefault && (
                              <button
                                type="button"
                                aria-label={t.status === "active" ? `Suspend ${t.name}` : `Activate ${t.name}`}
                                title={t.status === "active" ? "Suspend organization" : "Activate organization"}
                                onClick={() => handleToggleStatus(t)}
                                disabled={actionLoadingId === t.id}
                                className={`super-admin-action-icon ${t.status === "active" ? "super-admin-action-icon-danger" : ""}`}
                              >
                                {actionLoadingId === t.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                ) : t.status === "active" ? (
                                  <PauseCircle aria-hidden="true" size={17} />
                                ) : (
                                  <PlayCircle aria-hidden="true" size={17} />
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
          {filteredTenants.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredTenants.length)} of {filteredTenants.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span aria-live="polite">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {paymentLinkTenant && (
            <PaymentLinkDialog
              tenantId={paymentLinkTenant.id}
              tenantName={paymentLinkTenant.name}
              currentPlan={paymentLinkTenant.plan}
              onClose={() => setPaymentLinkTenant(null)}
              onComplete={() => { void fetchTenants(); }}
            />
          )}
        </div>
        </>)}
      </main>

      {/* ── Organization Detail Side Panel ──────────────────────────────────── */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
              {/* Logo / Avatar */}
              {viewingTenant.logo_url ? (
                <img
                  src={viewingTenant.logo_url}
                  alt={viewingTenant.name}
                  className="w-14 h-14 rounded-xl object-contain bg-slate-800 p-1.5 border border-slate-700 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xl flex items-center justify-center shrink-0">
                  {viewingTenant.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{viewingTenant.name}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="font-mono text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 px-2 py-0.5 rounded-md">
                    {viewingTenant.slug}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      viewingTenant.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        viewingTenant.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    ></span>
                    <span className="capitalize">{viewingTenant.status}</span>
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {viewingTenant.plan || "pro"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEditOrganizations && <button
                  type="button"
                  onClick={() => handleOpenEditModal(viewingTenant)}
                  className="h-8 px-3 rounded-lg border border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-300 flex items-center gap-1.5 transition-colors"
                >
                  <Pencil aria-hidden="true" size={15} />
                  <span className="hidden sm:inline">Edit</span>
                </button>}
                <button
                  type="button"
                  onClick={() => setViewingTenant(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X aria-hidden="true" size={20} />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm">Loading organization details...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                      <p className="text-xs text-slate-400 mb-1">Users</p>
                      <p className="text-2xl font-extrabold text-white">{viewingTenant.user_count ?? 0}</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                      <p className="text-xs text-slate-400 mb-1">Leads</p>
                      <p className="text-2xl font-extrabold text-amber-400">{viewingTenant.lead_count ?? 0}</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-center">
                      <p className="text-xs text-slate-400 mb-1">Member Since</p>
                      <p className="text-sm font-bold text-slate-200">
                        {viewingTenant.created_at
                          ? new Date(viewingTenant.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <DetailSection title="Basic Information" icon={Building2}>
                    <DetailField label="Organization Name" value={viewingTenant.name} span />
                    <DetailField
                      label="Description / Purpose"
                      value={
                        viewingTenant.description ||
                        viewingTenant.settings?.description ||
                        viewingTenant.purpose
                      }
                      span
                    />
                    <DetailField
                      label="Currency"
                      value={viewingTenant.currency || viewingTenant.settings?.currency}
                    />
                    <DetailField
                      label="Timezone"
                      value={viewingTenant.timezone || viewingTenant.settings?.timezone}
                    />
                    <DetailField
                      label="Date of Establishment"
                      value={
                        (viewingTenant.established_date || viewingTenant.settings?.established_date)
                          ?.split("T")[0]
                      }
                    />
                    <DetailField label="Subscription Plan" value={viewingTenant.plan} />
                  </DetailSection>

                  {/* Legal & Compliance */}
                  <DetailSection title="Legal & Compliance" icon={FileCheck2}>
                    <DetailField
                      label="Registration / Tax Number"
                      value={
                        viewingTenant.registration_no ||
                        viewingTenant.settings?.registration_no
                      }
                    />
                    <DetailField
                      label="Registered Under Act"
                      value={
                        viewingTenant.registered_under_act ||
                        viewingTenant.settings?.registered_under_act
                      }
                    />
                  </DetailSection>

                  {/* Contact */}
                  <DetailSection title="Contact" icon={Phone}>
                    <DetailField
                      label="Email"
                      value={viewingTenant.email || viewingTenant.settings?.email}
                    />
                    <DetailField
                      label="Phone"
                      value={viewingTenant.phone || viewingTenant.settings?.phone}
                    />
                    <DetailField
                      label="Website"
                      value={viewingTenant.website || viewingTenant.settings?.website}
                      link
                    />
                    <DetailField
                      label="Social Media"
                      value={
                        viewingTenant.social_media_links ||
                        viewingTenant.settings?.social_media_links
                      }
                      link
                    />
                  </DetailSection>

                  {/* Address */}
                  <DetailSection title="Address" icon={MapPin}>
                    <DetailField
                      label="Street Address"
                      value={
                        viewingTenant.street ||
                        viewingTenant.address?.street ||
                        viewingTenant.settings?.address?.street
                      }
                      span
                    />
                    <DetailField
                      label="City"
                      value={
                        viewingTenant.city ||
                        viewingTenant.address?.city ||
                        viewingTenant.settings?.address?.city
                      }
                    />
                    <DetailField
                      label="State"
                      value={
                        viewingTenant.state ||
                        viewingTenant.address?.state ||
                        viewingTenant.settings?.address?.state
                      }
                    />
                    <DetailField
                      label="Country"
                      value={
                        viewingTenant.country ||
                        viewingTenant.address?.country ||
                        viewingTenant.settings?.address?.country
                      }
                    />
                    <DetailField
                      label="PIN / Postal Code"
                      value={
                        viewingTenant.pincode ||
                        viewingTenant.address?.pincode ||
                        viewingTenant.settings?.address?.pincode
                      }
                    />
                  </DetailSection>

                  {/* Key Persons */}
                  <DetailSection title="Key Persons" icon={Users}>
                    <DetailField
                      label="CEO / Director Name"
                      value={
                        viewingTenant.ceo_name || viewingTenant.settings?.ceo_name
                      }
                    />
                    <DetailField
                      label="CEO / Director Contact"
                      value={
                        viewingTenant.ceo_contact || viewingTenant.settings?.ceo_contact
                      }
                    />
                    <DetailField
                      label="Chairperson Name"
                      value={
                        viewingTenant.chairperson_name || viewingTenant.settings?.chairperson_name
                      }
                    />
                    <DetailField
                      label="Chairperson Contact"
                      value={
                        viewingTenant.chairperson_contact ||
                        viewingTenant.settings?.chairperson_contact
                      }
                    />
                  </DetailSection>

                  {/* Administrator */}
                  {(viewingTenant.admin?.name || viewingTenant.admin?.email) && (
                    <DetailSection title="Primary Administrator" icon={ShieldCheck}>
                      <DetailField label="Name" value={viewingTenant.admin?.name} />
                      <DetailField label="Email" value={viewingTenant.admin?.email} />
                    </DetailSection>
                  )}

                  {/* Workspace */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
                      <Server aria-hidden="true" className="text-indigo-500" size={17} />
                      <h4 className="text-sm font-bold text-white">Workspace</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                        Login URL
                      </p>
                      <a
                        href={buildTenantUrl(viewingTenant.slug, "/login")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline font-mono text-xs flex items-center gap-1.5 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60"
                      >
                        <span>{buildTenantUrl(viewingTenant.slug, "/login")}</span>
                        <ExternalLink aria-hidden="true" className="shrink-0" size={15} />
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Create / Edit Organization ──────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-xl">
                  <Building2 aria-hidden="true" size={18} />
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
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            {createdTenantResult ? (
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-base">
                    <CircleCheck aria-hidden="true" size={21} />
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
                      <ExternalLink aria-hidden="true" size={15} />
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
                    <ExternalLink aria-hidden="true" size={16} />
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
                        <tab.icon aria-hidden="true" size={17} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  {modalError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle aria-hidden="true" className="shrink-0 text-rose-500" size={17} />
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

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Description / Purpose
                          </label>
                          <textarea
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                            placeholder="Brief description of the company's purpose, mission, or services..."
                            rows={3}
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Registered Under Act
                          </label>
                          <input
                            type="text"
                            value={formRegisteredUnderAct}
                            onChange={(e) => setFormRegisteredUnderAct(e.target.value)}
                            placeholder="e.g. Companies Act 2013"
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
                            Social Media Links
                          </label>
                          <input
                            type="url"
                            value={formSocialMediaLinks}
                            onChange={(e) => setFormSocialMediaLinks(e.target.value)}
                            placeholder="https://linkedin.com/company/..."
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

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                            Logo URL
                          </label>
                          <input
                            type="url"
                            value={formLogoUrl}
                            onChange={(e) => setFormLogoUrl(e.target.value)}
                            placeholder="https://cdn.example.com/logo.png"
                            className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {formLogoUrl && (
                            <div className="mt-2 flex items-center gap-3">
                              <img
                                src={formLogoUrl}
                                alt="Logo Preview"
                                className="h-10 w-10 object-contain rounded-lg bg-slate-800 border border-slate-700 p-1"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <span className="text-[11px] text-slate-400">Logo preview</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Key Persons sub-section */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3">
                          <UserRoundCog aria-hidden="true" className="text-indigo-500" size={17} />
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Key Persons</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                              CEO / Director Name
                            </label>
                            <input
                              type="text"
                              value={formCeoName}
                              onChange={(e) => setFormCeoName(e.target.value)}
                              placeholder="e.g. Rajesh Kumar"
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                              CEO / Director Contact
                            </label>
                            <input
                              type="text"
                              value={formCeoContact}
                              onChange={(e) => setFormCeoContact(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                              Chairperson Name
                            </label>
                            <input
                              type="text"
                              value={formChairpersonName}
                              onChange={(e) => setFormChairpersonName(e.target.value)}
                              placeholder="e.g. Priya Sharma"
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wide">
                              Chairperson Contact
                            </label>
                            <input
                              type="text"
                              value={formChairpersonContact}
                              onChange={(e) => setFormChairpersonContact(e.target.value)}
                              placeholder="e.g. +91 87654 32109"
                              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
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
                                    {isSelected && <CircleCheck aria-hidden="true" className="text-indigo-600" size={16} />}
                                  </div>
                                  <p className="text-[11px] text-slate-400">{p.desc}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
                          <Shield aria-hidden="true" className="mt-0.5 shrink-0 text-indigo-500" size={17} />
                          <div>
                            <span className="font-semibold text-white block mb-0.5">Automated Tenant Isolation</span>
                            <span className="text-slate-400 text-[11px]">
                              Organization data is tenant-scoped, with dedicated sales stages, roles, and lead sources.
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
                              {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
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
                        <ArrowLeft aria-hidden="true" size={15} />
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
                        <ArrowRight aria-hidden="true" size={15} />
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
                          <Check aria-hidden="true" size={15} />
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
