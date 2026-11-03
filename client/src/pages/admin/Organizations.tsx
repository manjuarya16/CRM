import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import Swal from "sweetalert2";
import { PageBreadcrumb, PaginationControls } from "../../components";
import { InvoiceModal } from "../../components/InvoiceModal";
// import useAdminSidebarStore

interface Organization {
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
  latest_payment_date?: string | null;
  payment_count?: number;
}

const SuperAdminOrganizations = () => {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateField, setDateField] = useState("expiry");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Expiry Modal State
  const [selectedOrgForExpiry, setSelectedOrgForExpiry] = useState<Organization | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [customTrialDays, setCustomTrialDays] = useState<number | string>("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  // Payment Details View Modal State
  const [viewPaymentOrg, setViewPaymentOrg] = useState<Organization | null>(null);
  const [orgPayments, setOrgPayments] = useState<any[]>([]);
  const [loadingOrgPayments, setLoadingOrgPayments] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Counts for Tabs
  const [counts, setCounts] = useState<{
    all: number;
    trial: number;
    active: number;
    expired: number;
    suspended: number;
  }>({ all: 0, trial: 0, active: 0, expired: 0, suspended: 0 });

  const fetchCounts = async () => {
    try {
      const response = await adminApi.get("/admin/organizations");
      if (response.data && response.data.success) {
        const list: Organization[] = response.data.data;
        setCounts({
          all: list.length,
          trial: list.filter((o) => o.computed_status === "Trial").length,
          active: list.filter((o) => o.computed_status === "Active").length,
          expired: list.filter((o) => o.computed_status === "Expired").length,
          suspended: list.filter((o) => o.computed_status === "Suspended").length,
        });
      }
    } catch (e) {
      console.error("Error fetching organization counts:", e);
    }
  };

  // Fetch organizations with active filters
  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "All") params.status = statusFilter;
      if (paymentFilter !== "All") params.payment_status = paymentFilter;
      if (dateField) params.date_field = dateField;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await adminApi.get("/admin/organizations", { params });
      if (response.data && response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching organizations:", err);
      Swal.fire("Error", "Failed to load organizations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchOrganizations();
  }, [statusFilter, paymentFilter, dateField]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchOrganizations();
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setPaymentFilter("All");
    setDateField("expiry");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    setTimeout(() => {
      fetchOrganizations();
    }, 0);
  };

  const getTenantUrl = (slug: string) => {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const host = window.location.hostname;
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
      return `${protocol}//${slug}.localhost${port}/auth/login`;
    }
    const parts = host.split(".");
    const rootDomain = parts.length > 2 ? parts.slice(1).join(".") : host;
    return `${protocol}//${slug}.${rootDomain}${port}/auth/login`;
  };

  const getTenantDisplayHost = (slug: string) => {
    const port = window.location.port ? `:${window.location.port}` : "";
    const host = window.location.hostname;
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
      return `${slug}.localhost${port}`;
    }
    const parts = host.split(".");
    const rootDomain = parts.length > 2 ? parts.slice(1).join(".") : host;
    return `${slug}.${rootDomain}${port}`;
  };

  const getOrgPaymentUrl = (slug: string) => {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const host = window.location.hostname;
    if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
      return `${protocol}//${slug}.localhost${port}/payment`;
    }
    const parts = host.split(".");
    const rootDomain = parts.length > 2 ? parts.slice(1).join(".") : host;
    return `${protocol}//${slug}.${rootDomain}${port}/payment`;
  };

  const handleCopyPaymentLink = (slug: string, name: string) => {
    const paymentUrl = getOrgPaymentUrl(slug);
    navigator.clipboard.writeText(paymentUrl);
    Swal.fire({
      title: "Payment Link Copied! 📋",
      html: `<div class="text-left text-xs space-y-1.5"><p>Direct payment portal link for <strong>${name}</strong> copied to clipboard:</p><p class="font-mono text-primary font-semibold break-all">${paymentUrl}</p></div>`,
      icon: "success",
      timer: 3000,
    });
  };

  const handleSendPaymentLink = async (org: Organization) => {
    const defaultEmail = org.email || "";
    const { value: formValues } = await Swal.fire({
      title: "Send Payment Link Email",
      html: `
        <div class="text-left text-xs space-y-3 text-slate-700 dark:text-slate-300">
          <p>Send an official subscription upgrade & online payment checkout link for <strong>${org.name}</strong> (${org.slug}).</p>
          <div>
            <label class="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Recipient Email Address:</label>
            <input id="swal-input-email" class="swal2-input !mt-0 !w-full !text-xs !h-9 !py-1 !px-3" value="${defaultEmail}" placeholder="admin@example.com" />
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-600 dark:text-slate-300">Optional Custom Note:</label>
            <textarea id="swal-input-note" class="swal2-textarea !mt-0 !w-full !text-xs !h-16 !p-2" placeholder="e.g. Please find the direct subscription link for your account..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Send Payment Email ✉️",
      confirmButtonColor: "#059669",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const emailInput = (document.getElementById("swal-input-email") as HTMLInputElement)?.value;
        const noteInput = (document.getElementById("swal-input-note") as HTMLTextAreaElement)?.value;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailInput || !emailRegex.test(emailInput.trim())) {
          Swal.showValidationMessage("Please provide a valid recipient email address (e.g. user@example.com)");
          return false;
        }
        return { recipient_email: emailInput.trim(), custom_message: noteInput?.trim() };
      },
    });

    if (!formValues) return;

    Swal.fire({
      title: "Sending Payment Link...",
      text: `Dispatching email to ${formValues.recipient_email}...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await adminApi.post(`/admin/organizations/${org.id}/send-payment-link`, {
        recipient_email: formValues.recipient_email,
        custom_message: formValues.custom_message,
      });
      if (response.data && response.data.success) {
        if (response.data.data?.email_sent === false) {
          Swal.fire({
            title: "Payment Link Generated ⚠️",
            html: `<div class="text-left text-xs space-y-2 text-slate-700 dark:text-slate-200">
              <p class="text-amber-600 dark:text-amber-400 font-semibold">${response.data.message}</p>
              <div class="mt-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <span class="text-gray-500 block mb-1 font-semibold">Direct Checkout Link:</span>
                <span class="font-mono text-primary font-bold text-[11px] break-all select-all">${response.data.data.paymentUrl}</span>
              </div>
            </div>`,
            icon: "warning",
            confirmButtonText: "Copy Link & Close",
            confirmButtonColor: "#2563eb",
          }).then((res) => {
            if (res.isConfirmed && response.data.data?.paymentUrl) {
              navigator.clipboard.writeText(response.data.data.paymentUrl);
            }
          });
        } else {
          Swal.fire({
            title: "Payment Link Sent! ✉️",
            html: `<div class="text-left text-xs space-y-2 text-slate-700 dark:text-slate-200">
              <p>${response.data.message || "Payment link email dispatched successfully."}</p>
              ${response.data.data?.paymentUrl ? `<p class="text-slate-500 font-mono text-[11px] break-all">${response.data.data.paymentUrl}</p>` : ""}
            </div>`,
            icon: "success",
            confirmButtonColor: "#059669",
          });
        }
      } else {
        Swal.fire("Error", response.data?.message || "Failed to send payment link", "error");
      }
    } catch (err: any) {
      console.error("Error sending payment link:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to send payment link email", "error");
    }
  };

  // Open Organization Payment Details View Modal
  const handleOpenPaymentDetails = async (org: Organization) => {
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

  // Toggle status (Suspend / Activate)
  const handleToggleStatus = async (orgId: number, currentStatus: boolean, orgName: string) => {
    const isCurrentlyActive = currentStatus !== false;
    const actionTitle = isCurrentlyActive ? "Suspend" : "Resume & Activate";
    
    const confirmResult = await Swal.fire({
      title: `${actionTitle} Organization?`,
      text: isCurrentlyActive
        ? `Are you sure you want to suspend "${orgName}"? This will temporarily lock tenant access for all users of this organization.`
        : `Are you sure you want to resume and activate "${orgName}"? Users will regain access to their tenant portal.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionTitle}!`,
      cancelButtonText: "Cancel",
      confirmButtonColor: isCurrentlyActive ? "#ef4444" : "#10b981"
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await adminApi.patch(`/admin/organizations/${orgId}/status`, {
        status: !isCurrentlyActive
      });

      if (response.data && response.data.success) {
        Swal.fire({
          title: `Organization ${isCurrentlyActive ? "Suspended" : "Activated"}!`,
          text: `"${orgName}" has been ${isCurrentlyActive ? "suspended" : "activated"} successfully.`,
          icon: "success",
          timer: 2000
        });
        fetchOrganizations();
        fetchCounts();
      }
    } catch (err: any) {
      console.error("Error updating organization status:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to update organization status.", "error");
    }
  };

  // Delete Organization Permanently and cascade all related entries
  const handleDeleteOrganization = async (orgId: number, orgName: string) => {
    const confirmResult = await Swal.fire({
      title: "Delete Organization?",
      html: `
        <div class="text-left text-sm text-gray-600 dark:text-gray-300">
          <p class="font-semibold text-rose-600 mb-2">Warning: This action is permanent and cannot be undone!</p>
          <p>Are you sure you want to permanently delete <strong>"${orgName}"</strong>?</p>
          <ul class="list-disc pl-5 mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <li>All tenant users, roles, and permissions will be deleted.</li>
            <li>All donors, donations, funds, and bank accounts will be deleted.</li>
            <li>All beneficiaries, master data, projects, and assets will be deleted.</li>
            <li>All volunteer, attendance, salary, and inventory records will be removed.</li>
          </ul>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete Permanently",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      focusCancel: true,
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await adminApi.delete(`/admin/organizations/${orgId}`);
      if (response.data && response.data.success) {
        Swal.fire({
          title: "Organization Deleted",
          text: response.data.message || `"${orgName}" has been permanently deleted.`,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });
        fetchOrganizations();
        fetchCounts();
        // useAdminSidebarStore?.getState()?.fetchCounts();
      }
    } catch (err: any) {
      console.error("Error deleting organization:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to delete organization.",
        "error"
      );
    }
  };

  // Open Edit Expiry / Custom Trial Days Modal
  const openExpiryModal = (org: Organization) => {
    setSelectedOrgForExpiry(org);
    setSendEmailNotification(true);
    if (org.subscription_expiry_date) {
      const d = new Date(org.subscription_expiry_date);
      const formatted = d.toISOString().split("T")[0];
      setNewExpiryDate(formatted);
      const now = new Date();
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setCustomTrialDays(diff > 0 ? diff : 14);
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setNewExpiryDate(defaultDate.toISOString().split("T")[0]);
      setCustomTrialDays(14);
    }
  };

  const handleCustomDaysChange = (days: number | string) => {
    setCustomTrialDays(days);
    const num = Number(days);
    if (!isNaN(num) && num > 0) {
      const d = new Date();
      d.setDate(d.getDate() + num);
      setNewExpiryDate(d.toISOString().split("T")[0]);
    }
  };

  const handleExpiryDateChange = (val: string) => {
    setNewExpiryDate(val);
    if (val) {
      const target = new Date(val);
      const now = new Date();
      const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setCustomTrialDays(diff > 0 ? diff : "");
    }
  };

  // Submit Updated Expiry Date / Custom Days with Email Notification
  const handleSaveExpiryDate = async () => {
    if (!selectedOrgForExpiry || !newExpiryDate) return;

    setUpdatingExpiry(true);
    try {
      const response = await adminApi.patch(`/admin/organizations/${selectedOrgForExpiry.id}/expiry`, {
        expiry_date: newExpiryDate,
        custom_days: Number(customTrialDays) || undefined,
        send_email: sendEmailNotification,
      });

      if (response.data && response.data.success) {
        const updatedOrg = response.data.data;
        if (updatedOrg) {
          setOrganizations((prev) =>
            prev.map((o) =>
              o.id === selectedOrgForExpiry.id
                ? {
                    ...o,
                    subscription_expiry_date: updatedOrg.subscription_expiry_date || newExpiryDate,
                    computed_status: updatedOrg.computed_status || o.computed_status,
                    status: updatedOrg.status !== undefined ? updatedOrg.status : o.status,
                    plan_name:
                      o.plan_code === "free_trial" && customTrialDays
                        ? `${customTrialDays}-Day Free Trial`
                        : o.plan_name,
                  }
                : o
            )
          );
        }

        Swal.fire({
          title: "Trial & Validity Updated! 🎉",
          text: response.data.message || `New Status: ${response.data.data?.computed_status}`,
          icon: "success",
          timer: 3000,
        });
        setSelectedOrgForExpiry(null);
        await fetchOrganizations();
        await fetchCounts();
      }
    } catch (err: any) {
      console.error("Error updating expiry date:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to update trial days", "error");
    } finally {
      setUpdatingExpiry(false);
    }
  };

  // Impersonate Login
  const handleImpersonateLogin = async (org: Organization) => {
    try {
      const response = await adminApi.post(`/admin/organizations/${org.id}/impersonate`);
      if (response.data && response.data.success) {
        const { token, user, organization } = response.data;

        // Build organization subdomain URL for the new tab
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : "";
        const host = window.location.hostname;
        const slug = organization?.slug || org.slug || "";
        let targetUrl = "/dashboard";

        if (slug) {
          if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
            targetUrl = `${protocol}//${slug}.localhost${port}/dashboard`;
          } else {
            const parts = host.split(".");
            const rootDomain = parts.length > 2 ? parts.slice(1).join(".") : host;
            targetUrl = `${protocol}//${slug}.${rootDomain}${port}/dashboard`;
          }
          const query = new URLSearchParams({
            impersonate_token: token,
            token: token,
            org_name: organization?.name || org.name || "",
            org_slug: slug,
            user: JSON.stringify(user),
          }).toString();
          targetUrl = `${targetUrl}?${query}`;
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

  // Status Badge Helper (icons instead of dots)
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <i className="mgc_check_circle_fill text-xs text-emerald-600"></i> Active
          </span>
        );
      case "Trial":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <i className="mgc_time_fill text-xs text-amber-600"></i> Active Trial
          </span>
        );
      case "Expired":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
            <i className="mgc_alarm_1_fill text-xs text-rose-600"></i> Expired
          </span>
        );
      case "Suspended":
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            <i className="mgc_close_circle_fill text-xs text-slate-600"></i> Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Payment Status Badge Helper
  const renderPaymentStatusBadge = (org: Organization) => {
    const status = org.payment_status || (org.computed_status === "Trial" ? "Free Trial" : "Unpaid");

    switch (status) {
      case "Paid":
        return (
          <div className="flex flex-col items-center">
            <Link
              to={`/admin/payments?org_id=${org.id}`}
              className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition shadow-2xs"
              title={`View payment history (${org.payment_count || 1} payment recorded)`}
            >
              <i className="mgc_check_circle_fill text-xs text-emerald-600 dark:text-emerald-400"></i>
              <span>Paid</span>
            </Link>
            {org.latest_payment_amount && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 font-medium">
                {org.latest_payment_currency === "USD" ? "$" : "₹"}
                {Number(org.latest_payment_amount).toLocaleString()}
                {org.latest_payment_method ? ` • ${org.latest_payment_method}` : ""}
              </span>
            )}
            <a
              href={getOrgPaymentUrl(org.slug)}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline mt-0.5 font-semibold flex items-center gap-0.5"
              title="Open package upgrade & renewal payment page"
            >
              <i className="mgc_arrow_up_circle_line text-[11px]"></i> Update Plan
            </a>
          </div>
        );
      case "Free Trial":
        return (
          <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
            <i className="mgc_flashlight_fill text-xs text-indigo-600 dark:text-indigo-400"></i>
            <span>Free Trial</span>
          </span>
        );
      case "Pending":
        return (
          <Link
            to={`/admin/payments?org_id=${org.id}`}
            className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 transition"
            title="View pending payment"
          >
            <i className="mgc_time_fill text-xs text-amber-600"></i>
            <span>Pending</span>
          </Link>
        );
      case "Failed":
        return (
          <Link
            to={`/admin/payments?org_id=${org.id}`}
            className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-200 transition"
            title="Payment transaction failed"
          >
            <i className="mgc_alert_fill text-xs text-rose-600"></i>
            <span>Failed</span>
          </Link>
        );
      case "Unpaid":
      default:
        return (
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
              <i className="mgc_close_circle_fill text-xs text-rose-500"></i>
              <span>Unpaid</span>
            </span>
            <a
              href={getOrgPaymentUrl(org.slug)}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-primary hover:underline mt-0.5 font-medium flex items-center gap-0.5"
              title="Open direct payment link"
            >
              <i className="mgc_link_line text-[10px]"></i> Payment Link
            </a>
          </div>
        );
    }
  };

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

  // Pagination Calculations
  const totalItems = organizations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOrganizations = organizations.slice(startIndex, endIndex);

  return (
    <>
      {/* Header with Title and Create Action */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h4 className="text-slate-900 dark:text-slate-200 text-xl font-semibold">Organizations (Tenants)</h4>
          <p className="text-sm text-gray-500 mt-1">Manage registered organizations, subscriptions, expiry dates, and impersonate login.</p>
        </div>
        <Link
          className="btn bg-primary text-white font-medium hover:bg-primary-600 transition-all px-4 py-2 rounded flex items-center gap-2 shadow-sm"
          to={`${basePath}/organizations/create`}
        >
          <i className="mgc_add_line text-base"></i> Add Organization
        </Link>
      </div>

      {/* Organization Category Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("All");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            statusFilter === "All"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          }`}
        >
          <i className="mgc_building_2_line text-base"></i>
          <span>All Organizations</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              statusFilter === "All"
                ? "bg-white/20 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Trial");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            statusFilter === "Trial"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          }`}
        >
          <i className="mgc_flash_line text-base"></i>
          <span>Active Trials</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              statusFilter === "Trial"
                ? "bg-white/20 text-white"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
            }`}
          >
            {counts.trial}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Active");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            statusFilter === "Active"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          }`}
        >
          <i className="mgc_check_circle_line text-base"></i>
          <span>Subscribed / Paid</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              statusFilter === "Active"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Expired");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            statusFilter === "Expired"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          }`}
        >
          <i className="mgc_time_line text-base"></i>
          <span>Expired</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              statusFilter === "Expired"
                ? "bg-white/20 text-white"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
            }`}
          >
            {counts.expired}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("Suspended");
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
            statusFilter === "Suspended"
              ? "bg-slate-700 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <i className="mgc_pause_circle_line text-base"></i>
          <span>Suspended</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              statusFilter === "Suspended"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
            }`}
          >
            {counts.suspended}
          </span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="card mb-6 p-5 shadow-xs border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-slate-800">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <i className="mgc_search_line text-base"></i>
                </div>
                <input
                  type="text"
                  className="form-input text-sm w-full !pl-10"
                  placeholder="Name, slug, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Status
              </label>
              <select
                className="form-select text-sm w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Trial">Active Trial</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Status
              </label>
              <select
                className="form-select text-sm w-full"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid (Success)</option>
                <option value="Free Trial">Free Trial</option>
                <option value="Unpaid">Unpaid / Overdue</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>



            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                From Date
              </label>
              <input
                type="date"
                className="form-input text-sm w-full"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                To Date
              </label>
              <input
                type="date"
                className="form-input text-sm w-full"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Action Buttons Row */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5 font-medium"
              onClick={handleClearFilters}
            >
              <i className="mgc_refresh_3_line text-sm"></i> Reset Filters
            </button>
            <button
              type="submit"
              className="btn bg-primary hover:bg-primary-600 text-white text-xs sm:text-sm px-5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 font-semibold"
            >
              <i className="mgc_filter_line text-sm"></i> Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Organizations Table */}
      <div className="card">
        <div className="card-header border-b border-gray-200 dark:border-gray-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h5 className="card-title text-slate-900 dark:text-slate-200">
            Registered SaaS Organizations ({organizations.length})
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
          ) : organizations.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              No organizations found matching the filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <div className="border rounded-lg divide-y divide-gray-200 dark:border-gray-700 dark:divide-gray-700">
                  <table className="min-w-full min-w-[850px] divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Sr. No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Organization</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Payment</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Registered</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiry / Renewal</th>
                        <th className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Users</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedOrganizations.map((org, index) => (
                        <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400 font-mono font-medium w-16">
                            {startIndex + index + 1}
                          </td>
                          {/* Organization Name & Subdomain Link */}
                          <td className="px-4 py-3">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]" title={org.name}>
                              {org.name}
                            </div>
                            <div className="flex flex-col gap-1 mt-1">
                              {/* Subdomain Link */}
                              <button
                                type="button"
                                onClick={() => void handleImpersonateLogin(org)}
                                className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 px-2 py-0.5 rounded transition w-fit max-w-[240px] truncate text-left"
                                title={`Log in to ${org.name}`}
                              >
                                <i className="mgc_external_link_line text-xs"></i>
                                <span className="truncate">{getTenantDisplayHost(org.slug)}</span>
                              </button>
                              {org.email && (
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate text-[11px]" title={org.email}>
                                  <i className="mgc_mail_line text-xs"></i> {org.email}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs">
                              {org.plan_name || "Starter"}
                            </span>
                          </td>

                          {/* Payment Status */}
                          <td className="px-3 py-3 whitespace-nowrap text-center text-xs">
                            {renderPaymentStatusBadge(org)}
                          </td>

                          {/* Created Date */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {new Date(org.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>

                          {/* Expiry Date with Edit Trigger */}
                          <td className="px-3 py-3 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-1.5">
                              {org.subscription_expiry_date ? (
                                <span className={`font-semibold ${new Date(org.subscription_expiry_date) < new Date() ? "text-rose-600" : "text-slate-800 dark:text-slate-200"}`}>
                                  {new Date(org.subscription_expiry_date).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No expiry</span>
                              )}
                              <button
                                type="button"
                                className="text-primary hover:text-primary-700 text-xs p-0.5 rounded hover:bg-primary/10 transition-all"
                                title="Manually update expiry date"
                                onClick={() => openExpiryModal(org)}
                              >
                                <i className="mgc_edit_line text-xs"></i>
                              </button>
                            </div>
                          </td>

                          {/* User Count */}
                          <td className="px-2 py-3 whitespace-nowrap text-xs text-center font-medium text-slate-800 dark:text-slate-200">
                            {org.user_count}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-3 whitespace-nowrap text-center text-xs">
                            {renderStatusBadge(org.computed_status || (org.status ? "Active" : "Suspended"))}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Payment Details Button */}
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-600 hover:text-white dark:text-indigo-400 dark:hover:bg-indigo-600 transition inline-flex items-center justify-center"
                                onClick={() => handleOpenPaymentDetails(org)}
                                title="View Payment Details & History"
                              >
                                <i className="mgc_bill_line text-base"></i>
                              </button>

                              {/* If already has active plan, show Update Plan button that redirects directly to /payment page */}
                              {org.payment_status === "Paid" || org.computed_status === "Active" ? (
                                <a
                                  href={getOrgPaymentUrl(org.slug)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-600 hover:text-white dark:text-violet-400 dark:hover:bg-violet-600 transition inline-flex items-center justify-center"
                                  title={`Update / Upgrade Plan for ${org.name} (Opens Payment Portal)`}
                                >
                                  <i className="mgc_arrow_up_circle_line text-base"></i>
                                </a>
                              ) : (
                                <a
                                  href={getOrgPaymentUrl(org.slug)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-600 transition inline-flex items-center justify-center"
                                  title={`Open Direct Payment Link for ${org.name}`}
                                >
                                  <i className="mgc_bank_card_line text-base"></i>
                                </a>
                              )}

                              {/* Send Payment Link Email Button */}
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-600 hover:text-white dark:text-teal-400 dark:hover:bg-teal-600 transition inline-flex items-center justify-center"
                                onClick={() => handleSendPaymentLink(org)}
                                title="Send Payment / Upgrade Link Email to Organization"
                              >
                                <i className="mgc_send_line text-base"></i>
                              </button>

                              {/* Impersonate Login Button */}
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-600 hover:text-white dark:text-amber-400 dark:hover:bg-amber-600 transition inline-flex items-center justify-center"
                                title="Login as Admin (Impersonate)"
                                onClick={() => handleImpersonateLogin(org)}
                              >
                                <i className="mgc_enter_door_line text-base"></i>
                              </button>

                              {/* Edit Profile */}
                              <Link
                                className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-600 hover:text-white dark:text-teal-400 dark:hover:bg-teal-600 transition inline-flex items-center justify-center"
                                title="Edit organization profile"
                                to={`${basePath}/organizations/edit/${org.id}`}
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </Link>

                              {/* Suspend / Activate */}
                              <button
                                type="button"
                                className={`p-1.5 rounded-lg transition inline-flex items-center justify-center ${
                                  org.status !== false
                                    ? "text-rose-600 hover:bg-rose-600 hover:text-white dark:text-rose-400 dark:hover:bg-rose-600"
                                    : "text-emerald-600 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:bg-emerald-600"
                                }`}
                                title={org.status !== false ? `Suspend ${org.name}` : `Resume / Activate ${org.name}`}
                                onClick={() => handleToggleStatus(org.id, org.status, org.name)}
                              >
                                <i className={org.status !== false ? "mgc_pause_circle_line text-base" : "mgc_play_circle_line text-base"}></i>
                              </button>

                              {/* Delete Organization */}
                              <button
                                type="button"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-600 transition shadow-xs flex items-center justify-center"
                                title={`Delete ${org.name} and all data`}
                                onClick={() => handleDeleteOrganization(org.id, org.name)}
                              >
                                <i className="mgc_delete_2_line text-base"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Footer Pagination */}
          {!loading && totalItems > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Manual Expiry Date / Custom Trial Days Update Modal */}
      {selectedOrgForExpiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
              <h5 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
                  <i className="mgc_time_line text-lg"></i>
                </span>
                {selectedOrgForExpiry.computed_status === "Trial"
                  ? "Extend / Update Custom Trial Days"
                  : "Update Organization Validity"}
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                onClick={() => setSelectedOrgForExpiry(null)}
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Org Summary */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedOrgForExpiry.name}
                  </span>
                  <a
                    href={getTenantUrl(selectedOrgForExpiry.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                    title={`Open ${selectedOrgForExpiry.name} tenant login: ${getTenantUrl(selectedOrgForExpiry.slug)}`}
                  >
                    <span>{getTenantDisplayHost(selectedOrgForExpiry.slug)}</span>
                    <i className="mgc_external_link_line text-xs"></i>
                  </a>
                </div>
                <div className="text-gray-600 dark:text-gray-300 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span>Status: <strong className="text-slate-800 dark:text-slate-100">{selectedOrgForExpiry.computed_status}</strong></span>
                    <button
                      type="button"
                      className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 ${
                        selectedOrgForExpiry.status !== false
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
                      }`}
                      onClick={async () => {
                        const org = selectedOrgForExpiry;
                        setSelectedOrgForExpiry(null);
                        await handleToggleStatus(org.id, org.status, org.name);
                      }}
                      title={selectedOrgForExpiry.status !== false ? "Suspend this organization" : "Resume this organization"}
                    >
                      {selectedOrgForExpiry.status !== false ? (
                        <>
                          <i className="mgc_pause_circle_line text-xs"></i> Suspend Organization
                        </>
                      ) : (
                        <>
                          <i className="mgc_play_circle_line text-xs"></i> Resume Organization
                        </>
                      )}
                    </button>
                  </div>
                  {selectedOrgForExpiry.email && (
                    <span className="text-gray-500 font-mono text-[11px]">{selectedOrgForExpiry.email}</span>
                  )}
                </div>
              </div>

              {/* Custom Trial Days Input */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Custom Trial Duration (Days from Today)
                  </label>
                  {typeof customTrialDays === "number" && customTrialDays > 0 && (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                      +{customTrialDays} Days
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    placeholder="e.g. 14, 30, 45"
                    className="form-input text-sm w-full font-bold"
                    value={customTrialDays}
                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                  />
                  <div className="flex items-center text-xs font-semibold text-gray-500 shrink-0 px-2">
                    Days
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                    Quick Duration Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "+7 Days", days: 7 },
                      { label: "+14 Days", days: 14 },
                      { label: "+30 Days", days: 30 },
                      { label: "+45 Days", days: 45 },
                      { label: "+60 Days", days: 60 },
                      { label: "+90 Days", days: 90 },
                      { label: "+1 Year", days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleCustomDaysChange(preset.days)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition ${
                          Number(customTrialDays) === preset.days
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exact Expiry Date Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                  Specific Expiry / Renewal Date
                </label>
                <input
                  type="date"
                  className="form-input w-full text-sm font-medium"
                  value={newExpiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <i className="mgc_information_line text-xs"></i>
                  {newExpiryDate ? (
                    <span>
                      Access will be valid until <strong>{new Date(newExpiryDate).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</strong>.
                    </span>
                  ) : (
                    <span>Select an expiry date to automatically adjust trial and active status.</span>
                  )}
                </p>
              </div>

              {/* Send Email Notification Checkbox */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="form-checkbox mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Send Trial Days Updated Email Notification
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Automatically sends an email to the organization admin informing them about their updated workspace validity and login link.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs px-4 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
                onClick={() => setSelectedOrgForExpiry(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn bg-primary hover:bg-primary-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                disabled={updatingExpiry || !newExpiryDate}
                onClick={handleSaveExpiryDate}
              >
                {updatingExpiry ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving & Sending Email...</span>
                  </>
                ) : (
                  <>
                    <i className="mgc_check_line text-sm"></i>
                    <span>Save & Update Trial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    Tenant Subdomain: <span className="font-mono text-primary font-semibold">{viewPaymentOrg.slug}</span> • Status: <strong className="text-slate-800 dark:text-slate-200">{viewPaymentOrg.computed_status}</strong>
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
                  <div className="mt-1">
                    {renderPaymentStatusBadge(viewPaymentOrg)}
                  </div>
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
                    onClick={() => handleCopyPaymentLink(viewPaymentOrg.slug, viewPaymentOrg.name)}
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
                      onClick={() => handleCopyPaymentLink(viewPaymentOrg.slug, viewPaymentOrg.name)}
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
                to={`/admin/payments?org_id=${viewPaymentOrg.id}`}
                className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
              >
                <span>View Full Filtered Payments Page</span>
                <i className="mgc_external_link_line text-xs"></i>
              </Link>
              <div className="flex items-center gap-2">
                <a
                  href={getOrgPaymentUrl(viewPaymentOrg.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-xs"
                  title="Open live payment & renewal portal for this organization"
                >
                  <i className="mgc_bank_card_line text-xs"></i> Open Payment Portal
                </a>
                <button
                  type="button"
                  onClick={() => handleSendPaymentLink(viewPaymentOrg)}
                  className="btn bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-xs"
                >
                  <i className="mgc_send_line text-xs"></i> Send Payment Link Email
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPaymentLink(viewPaymentOrg.slug, viewPaymentOrg.name)}
                  className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs px-3 py-2 rounded-xl hover:bg-gray-100 font-bold flex items-center gap-1"
                >
                  <i className="mgc_link_line text-xs"></i> Copy Link
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

export default SuperAdminOrganizations;

