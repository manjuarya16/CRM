import React, { useEffect, useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import Swal from "sweetalert2";
import { PageBreadcrumb, PaginationControls } from "../../components";

interface PaymentRecord {
  id: number;
  organization_id: number;
  organization_name: string;
  organization_slug: string;
  plan_id: number | null;
  plan_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: string;
  billing_start_date: string | null;
  billing_end_date: string | null;
  created_at: string;
  invoice_number?: string;
  notes?: string;
}

interface WebhookLog {
  id: number;
  event_id: string;
  event_type: string;
  gateway: string;
  organization_id: number | null;
  organization_name: string | null;
  amount: number | null;
  currency: string;
  invoice_number: string | null;
  payload: any;
  status: "Captured" | "Processing" | "Success" | "Failed";
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

interface OrgOption {
  id: number;
  name: string;
}

const SuperAdminPayments: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isSuperAdminPrefix = location.pathname.toLowerCase().startsWith("/super-admin");
  const basePath = isSuperAdminPrefix ? "/super-admin" : "/admin";

  const initialOrgId = searchParams.get("org_id") || "";

  // Main Tabs: "payments" vs "webhooks"
  const [activeTab, setActiveTab] = useState<"payments" | "webhooks">("payments");

  // Payments State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination for Payments
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);

  // Payments Filters
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrgId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRecord | null>(null);
  // Record Cash / Online Payment Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordForm, setRecordForm] = useState({
    organization_id: "",
    plan_name: "Starter",
    currency: "INR",
    amount: 9999,
    discount_amount: 0,
    payment_method: "Cash",
    reference: "",
    notes: "",
    paid_at: new Date().toISOString().split("T")[0],
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  const handlePlanChange = (plan: string, curr: string = recordForm.currency) => {
    let amt = 9999;
    const isUsd = curr === "USD";
    if (plan === "Growth") amt = isUsd ? 299 : 19999;
    else if (plan === "Business") amt = isUsd ? 449 : 29999;
    else amt = isUsd ? 149 : 9999;
    setRecordForm(prev => ({ ...prev, plan_name: plan, currency: curr, amount: amt }));
  };

  const handleCurrencyToggle = (curr: string) => {
    handlePlanChange(recordForm.plan_name, curr);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.organization_id) {
      Swal.fire("Organization Required", "Please select an organization.", "warning");
      return;
    }
    setRecordingPayment(true);
    try {
      const res = await adminApi.post("/admin/payments/record", {
        organization_id: recordForm.organization_id,
        plan_name: recordForm.plan_name,
        amount: Number(recordForm.amount),
        discount_amount: Number(recordForm.discount_amount),
        currency: recordForm.currency,
        payment_method: recordForm.payment_method,
        reference: recordForm.reference || undefined,
        notes: recordForm.notes || undefined,
        paid_at: recordForm.paid_at || undefined,
      });

      if (res.data && res.data.success) {
        setShowRecordModal(false);
        Swal.fire({
          title: "Payment Recorded! 🎉",
          text: res.data.message || "Payment recorded and subscription activated successfully.",
          icon: "success",
          confirmButtonColor: "#10b981",
        });
        fetchPayments();
      } else {
        throw new Error(res.data?.message || "Failed to record payment");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || err.message || "Failed to record payment", "error");
    } finally {
      setRecordingPayment(false);
    }
  };


  const handleMarkPaymentPaid = async (payment: PaymentRecord) => {
    const isUsd = payment.currency === "USD";
    const amountFormatted = isUsd ? `${Number(payment.amount).toLocaleString()}` : `₹${Number(payment.amount).toLocaleString()}`;

    const { value: formValues } = await Swal.fire({
      title: "Mark Payment as Received",
      width: "520px",
      html: `
        <div class="text-left text-xs space-y-3 pt-2 text-slate-700 dark:text-slate-300">
          <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
            <span class="text-gray-500 dark:text-gray-400 block font-medium">Organization: <strong class="text-slate-800 dark:text-slate-200">${payment.organization_name}</strong></span>
            <span class="text-sm text-emerald-700 dark:text-emerald-300 font-bold block">Amount: ${amountFormatted}</span>
            <span class="text-[11px] text-gray-500 block">Plan: ${payment.plan_name} • Invoice: ${payment.invoice_number || `#${payment.id}`}</span>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Received Payment Method *</label>
            <select id="swal-mark-method" class="swal2-input !w-full !text-xs !h-9 !m-0 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800">
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Reference / Voucher / UTR #</label>
            <input id="swal-mark-ref" class="swal2-input !w-full !text-xs !h-9 !m-0 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800" placeholder="e.g. CASH-REC-${Date.now().toString().slice(-5)}" />
          </div>

          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes (Optional)</label>
            <input id="swal-mark-notes" class="swal2-input !w-full !text-xs !h-9 !m-0 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-800" placeholder="e.g. Paid in full at office" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Confirm & Mark as Paid ✓",
      confirmButtonColor: "#10b981",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const method = (document.getElementById("swal-mark-method") as HTMLSelectElement)?.value || "Cash";
        const reference = (document.getElementById("swal-mark-ref") as HTMLInputElement)?.value;
        const notes = (document.getElementById("swal-mark-notes") as HTMLInputElement)?.value;
        return { method, reference, notes };
      },
    });

    if (!formValues) return;

    try {
      Swal.fire({
        title: "Updating Payment...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await adminApi.post(`/admin/payments/${payment.id}/mark-paid`, {
        payment_method: formValues.method,
        reference: formValues.reference,
        notes: formValues.notes,
      });

      if (res.data && res.data.success) {
        await Swal.fire({
          icon: "success",
          title: "Payment Received! 🎉",
          text: `Payment of ${amountFormatted} for ${payment.organization_name} marked as Paid. Pay Later commitment cleared.`,
          confirmButtonColor: "#10b981",
        });
        fetchPayments();
      } else {
        throw new Error(res.data?.message || "Failed to mark payment as paid");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || err.message || "Failed to update payment", "error");
    }
  };

  // Webhooks State
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [webhookStatusFilter, setWebhookStatusFilter] = useState("All");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [webhookPage, setWebhookPage] = useState(1);
  const [webhookPageSize, setWebhookPageSize] = useState(10);
  const [selectedWebhookPayload, setSelectedWebhookPayload] = useState<WebhookLog | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  // Fetch organizations list for dropdown
  const fetchOrgOptions = async () => {
    try {
      const response = await adminApi.get("/admin/organizations");
      if (response.data && response.data.success) {
        setOrganizations(
          response.data.data.map((o: any) => ({ id: o.id, name: o.name }))
        );
      }
    } catch (e) {
      console.error("Error loading organizations list for dropdown:", e);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedOrgId) params.org_id = selectedOrgId;
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "All") params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await adminApi.get("/admin/payments", { params });
      if (response.data && response.data.success) {
        setPayments(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching payments:", err);
      Swal.fire("Error", "Failed to load payment history", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Webhook Logs
  const fetchWebhookLogs = async () => {
    setLoadingWebhooks(true);
    try {
      const params: any = {};
      if (webhookStatusFilter !== "All") params.status = webhookStatusFilter;
      if (webhookSearch.trim()) params.search = webhookSearch.trim();

      const response = await adminApi.get("/admin/webhooks", { params });
      if (response.data && response.data.success) {
        setWebhookLogs(response.data.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching webhook logs:", err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchOrgOptions();
  }, []);

  useEffect(() => {
    const urlOrgId = searchParams.get("org_id") || "";
    setSelectedOrgId(urlOrgId);
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "payments") {
      fetchPayments();
    } else {
      fetchWebhookLogs();
    }
  }, [activeTab, selectedOrgId, statusFilter, webhookStatusFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentPage(1);
    fetchPayments();
  };

  const handleWebhookFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookPage(1);
    fetchWebhookLogs();
  };

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    setPaymentPage(1);
    if (orgId) {
      setSearchParams({ org_id: orgId });
    } else {
      setSearchParams({});
    }
  };

  const handleClearFilters = () => {
    setSelectedOrgId("");
    setSearchParams({});
    setSearch("");
    setStatusFilter("All");
    setDateFrom("");
    setDateTo("");
    setPaymentPage(1);
    setTimeout(() => {
      fetchPayments();
    }, 0);
  };

  const handleSimulateWebhook = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Simulate Payment Webhook",
      html: `
        <div class="text-left text-xs space-y-3 text-slate-700 dark:text-slate-300">
          <p>Trigger an automated webhook event to test lifecycle tracking (<code>Captured</code> &rarr; <code>Processing</code> &rarr; <code>Success</code>) and automatic invoice generation.</p>
          <div>
            <label class="block font-semibold mb-1">Target Organization:</label>
            <select id="sim-org" class="swal2-select !mt-0 !w-full !text-xs !h-9">
              ${organizations.map((o) => `<option value="${o.id}">${o.name}</option>`).join("")}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-semibold mb-1">Event Type:</label>
              <select id="sim-event" class="swal2-select !mt-0 !w-full !text-xs !h-9">
                <option value="payment.captured">payment.captured (Success)</option>
                <option value="payment.failed">payment.failed (Failed)</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold mb-1">Plan Code:</label>
              <select id="sim-plan" class="swal2-select !mt-0 !w-full !text-xs !h-9">
                <option value="starter">Starter (₹9,999)</option>
                <option value="professional">Professional (₹19,999)</option>
                <option value="enterprise">Enterprise (Custom)</option>
              </select>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simulate Webhook ⚡",
      confirmButtonColor: "#4f46e5",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const orgId = (document.getElementById("sim-org") as HTMLSelectElement)?.value;
        const eventType = (document.getElementById("sim-event") as HTMLSelectElement)?.value;
        const planCode = (document.getElementById("sim-plan") as HTMLSelectElement)?.value;
        return {
          organization_id: Number(orgId),
          event_type: eventType,
          plan_code: planCode,
          amount: planCode === "professional" ? 19999 : 9999,
          currency: "INR",
        };
      },
    });

    if (!formValues) return;

    setSimulatingWebhook(true);
    try {
      const res = await adminApi.post("/admin/webhooks/simulate", formValues);
      if (res.data && res.data.success) {
        Swal.fire({
          title: "Webhook Executed! 🚀",
          html: `<div class="text-left text-xs space-y-1.5 text-slate-700 dark:text-slate-200">
            <p><strong>Lifecycle Status:</strong> <span class="text-emerald-600 font-bold">${res.data.data?.status}</span></p>
            <p><strong>Generated Invoice:</strong> <code>${res.data.data?.invoice_number || "N/A"}</code></p>
            <p><strong>Event ID:</strong> <code>${res.data.data?.event_id}</code></p>
          </div>`,
          icon: "success",
        });
        fetchWebhookLogs();
        fetchPayments();
      }
    } catch (err: any) {
      console.error("Webhook simulation error:", err);
      Swal.fire("Error", err.response?.data?.message || "Simulation failed", "error");
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const rawStatus = (status || "Unknown").trim();
    const lower = rawStatus.toLowerCase();

    if (lower === "paid" || lower === "success" || lower === "completed" || lower === "captured") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          <i className="mgc_check_circle_fill text-xs text-emerald-600 dark:text-emerald-400"></i> {rawStatus}
        </span>
      );
    }

    if (lower === "pending" || lower === "processing" || lower === "created" || lower === "initiated") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <i className="mgc_time_fill text-xs text-amber-600 dark:text-amber-400"></i> {rawStatus}
        </span>
      );
    }

    if (lower === "failed" || lower === "cancelled" || lower === "canceled") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
          <i className="mgc_alert_fill text-xs text-rose-600 dark:text-rose-400"></i> {rawStatus}
        </span>
      );
    }

    if (lower === "refunded") {
      return (
        <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          <i className="mgc_refresh_3_line text-xs text-purple-600 dark:text-purple-400"></i> {rawStatus}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        {rawStatus}
      </span>
    );
  };

  const renderLifecycleBadge = (status: string) => {
    switch (status) {
      case "Captured":
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Captured
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-spin"></span> Processing
          </span>
        );
      case "Success":
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <i className="mgc_check_circle_fill text-xs text-emerald-600"></i> Success
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <i className="mgc_close_circle_fill text-xs text-rose-600"></i> Failed
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const selectedOrgName = organizations.find((o) => String(o.id) === String(selectedOrgId))?.name;

  return (
    <>
      
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h4 className="text-slate-900 dark:text-slate-200 text-xl font-semibold">Payment Transactions, Invoices & Webhooks</h4>
          <p className="text-sm text-gray-500 mt-1">
            Track subscription revenue, generate & download customer invoices, and monitor gateway webhook event lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          
          {activeTab === "payments" && (
            <button
              type="button"
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition"
              onClick={() => {
                setRecordForm(prev => ({
                  ...prev,
                  organization_id: selectedOrgId || (organizations[0]?.id ? String(organizations[0].id) : ""),
                  reference: `REC-${Date.now().toString().slice(-6)}`,
                }));
                setShowRecordModal(true);
              }}
            >
              <i className="mgc_wallet_2_line text-sm"></i> Record Payment (Cash / Online)
            </button>
          )}

          {activeTab === "webhooks" && (
            <button
              type="button"
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition"
              onClick={handleSimulateWebhook}
              disabled={simulatingWebhook}
            >
              <i className="mgc_flash_line text-sm"></i> Simulate Test Webhook
            </button>
          )}

          {selectedOrgId && activeTab === "payments" && (
            <button
              type="button"
              className="btn border border-gray-300 text-xs px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-1.5"
              onClick={handleClearFilters}
            >
              <i className="mgc_close_line text-xs"></i> View All Organizations
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs: Payment Transactions */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-2">
        <button
          className="py-2.5 px-4 font-bold text-sm border-b-2 border-primary text-primary transition flex items-center gap-2"
          onClick={() => setActiveTab("payments")}
        >
          <i className="mgc_wallet_2_line text-base"></i> Payment Transactions ({payments.length})
        </button>
      </div>

      {/* TAB 1: PAYMENT TRANSACTIONS */}
      {activeTab === "payments" && (
        <>
          {/* Filter Bar */}
          <div className="card mb-6 p-4">
            <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Organization</label>
                <select
                  className="form-select text-xs w-full py-1.5 px-2"
                  value={selectedOrgId}
                  onChange={(e) => handleOrgChange(e.target.value)}
                >
                  <option value="">All Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Search ID / Invoice</label>
                <input
                  type="text"
                  className="form-input text-xs w-full py-1.5 px-2"
                  placeholder="Invoice #, Txn ID, Order ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="w-40 min-w-[130px]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Status</label>
                <select
                  className="form-select text-xs w-full py-1.5 px-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Success / Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="w-36 min-w-[135px]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">From</label>
                <input
                  type="date"
                  className="form-input text-xs w-full py-1.5 px-2"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="w-36 min-w-[135px]">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">To</label>
                <input
                  type="date"
                  className="form-input text-xs w-full py-1.5 px-2"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="btn bg-primary text-white text-xs px-4 py-2 rounded-lg hover:bg-primary-600 transition"
                >
                  Filter
                </button>
                <button
                  type="button"
                  className="btn border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  onClick={handleClearFilters}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Payments Table */}
          <div className="card">
            {(() => {
              const totalItems = payments.length;
              const totalPages = Math.max(1, Math.ceil(totalItems / paymentPageSize));
              const startIndex = (paymentPage - 1) * paymentPageSize;
              const endIndex = Math.min(startIndex + paymentPageSize, totalItems);
              const paginatedPayments = payments.slice(startIndex, endIndex);

              return (
                <>
                  <div className="card-header border-b border-gray-200 dark:border-gray-700 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h5 className="card-title text-slate-900 dark:text-slate-200 font-bold text-sm">
                      {selectedOrgId ? `Payment History for ${selectedOrgName}` : `All Payment Transactions`} ({totalItems})
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Rows per page:</span>
                      <select
                        value={paymentPageSize}
                        onChange={(e) => {
                          setPaymentPageSize(Number(e.target.value));
                          setPaymentPage(1);
                        }}
                        className="form-select form-select-sm text-xs py-1 px-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-0">
                    {loading ? (
                      <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : payments.length === 0 ? (
                      <div className="text-center p-12 text-gray-500 text-xs">
                        No payment transactions found.
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[850px] divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-500 uppercase">
                            <tr>
                              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-16">Sr. No.</th>
                              <th className="px-4 py-3 text-left">Invoice / Txn ID</th>
                              <th className="px-4 py-3 text-left">Organization</th>
                              <th className="px-3 py-3 text-left">Plan</th>
                              <th className="px-3 py-3 text-left">Amount</th>
                              <th className="px-3 py-3 text-left">Method</th>
                              <th className="px-3 py-3 text-center">Status</th>
                              <th className="px-3 py-3 text-left">Date</th>
                              <th className="px-4 py-3 text-right">Invoice Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                            {paginatedPayments.map((p, index) => (
                              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <td className="px-3 py-3 text-center text-xs text-gray-500 dark:text-gray-400 font-mono font-medium w-16">
                                  {startIndex + index + 1}
                                </td>
                                {/* Invoice / Txn ID */}
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {p.invoice_number || `INV-${new Date(p.created_at).getFullYear()}-${String(p.id).padStart(5, '0')}`}
                                  </div>
                                  <div className="text-[11px] text-gray-400 font-mono">
                                    Ref: {p.razorpay_payment_id || `Txn #${p.id}`}
                                  </div>
                                </td>

                                {/* Organization */}
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={p.organization_name}>
                                    <Link
                                      to={`${basePath}/organizations?org_id=${p.organization_id}`}
                                      className="hover:text-primary transition"
                                    >
                                      {p.organization_name}
                                    </Link>
                                  </div>
                                  <div className="text-[11px] text-gray-500 font-mono truncate max-w-[180px]">
                                    {p.organization_slug}
                                  </div>
                                </td>

                                {/* Plan */}
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <span className="font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 text-xs">
                                    {p.plan_name}
                                  </span>
                                </td>

                                {/* Amount */}
                                <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                                  {p.currency === "USD" ? `$${Number(p.amount).toLocaleString()}` : `₹${Number(p.amount).toLocaleString()}`}
                                  <span className="text-[10px] text-gray-400 font-normal ml-1">{p.currency}</span>
                                </td>

                                {/* Method */}
                                <td className="px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                  <span className="inline-flex items-center gap-1">
                                    <i className="mgc_bank_card_line text-sm text-primary"></i> {p.payment_method}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="px-3 py-3 whitespace-nowrap text-center">
                                  {renderStatusBadge(p.payment_status)}
                                </td>

                                {/* Date */}
                                <td className="px-3 py-3 whitespace-nowrap text-gray-500 text-[11px]">
                                  {new Date(p.created_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>

                                {/* Action: View / Download Invoice */}
                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                  <div className="flex items-center justify-end gap-1.5">
  {(p.payment_status?.toLowerCase() === "pending" || p.payment_status?.toLowerCase().includes("pay later") || p.payment_status?.toLowerCase().includes("pay_later")) && (
    <button
      type="button"
      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-600 transition shadow-xs inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5 cursor-pointer"
      onClick={() => handleMarkPaymentPaid(p)}
      title="Confirm receipt of payment and mark as Paid"
    >
      <i className="mgc_check_circle_line text-base"></i>
      <span>Mark as Paid</span>
    </button>
  )}
<button
                                    type="button"
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-600 transition shadow-xs inline-flex items-center justify-center gap-1 text-xs font-semibold px-2.5"
                                    onClick={() => setSelectedInvoice(p)}
                                    title="View, Print & Download Invoice"
                                  >
                                    <i className="mgc_receipt_line text-base"></i>
                                    <span>Invoice</span>
                                  </button>
</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalItems > 0 && (
                      <PaginationControls
                        currentPage={paymentPage}
                        totalPages={totalPages}
                        startIndex={startIndex}
                        totalItems={totalItems}
                        itemsPerPage={paymentPageSize}
                        onPageChange={setPaymentPage}
                      />
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* TAB 2: WEBHOOK EVENT TRACKING */}
      {activeTab === "webhooks" && (
        <>
          {/* Webhooks Filter Bar */}
          <div className="card mb-6 p-4">
            <form onSubmit={handleWebhookFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Search Event / Organization</label>
                <input
                  type="text"
                  className="form-input text-xs w-full py-1.5 px-2"
                  placeholder="Event ID, Org name, Invoice #..."
                  value={webhookSearch}
                  onChange={(e) => setWebhookSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Lifecycle State</label>
                <select
                  className="form-select text-xs w-full py-1.5 px-2"
                  value={webhookStatusFilter}
                  onChange={(e) => setWebhookStatusFilter(e.target.value)}
                >
                  <option value="All">All Lifecycle States</option>
                  <option value="Captured">Captured (Initial)</option>
                  <option value="Processing">Processing</option>
                  <option value="Success">Success (Provisioned)</option>
                  <option value="Failed">Failed (Error)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn bg-primary text-white text-xs px-4 py-2 rounded-lg flex-1 hover:bg-primary-600 transition font-bold"
                >
                  Filter Events
                </button>
                <button
                  type="button"
                  className="btn border border-gray-300 text-gray-700 text-xs px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                  onClick={() => {
                    setWebhookSearch("");
                    setWebhookStatusFilter("All");
                    setWebhookPage(1);
                    setTimeout(() => fetchWebhookLogs(), 0);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Webhook Logs Table */}
          <div className="card">
            {(() => {
              const totalItems = webhookLogs.length;
              const totalPages = Math.max(1, Math.ceil(totalItems / webhookPageSize));
              const startIndex = (webhookPage - 1) * webhookPageSize;
              const endIndex = Math.min(startIndex + webhookPageSize, totalItems);
              const paginatedLogs = webhookLogs.slice(startIndex, endIndex);

              return (
                <>
                  <div className="card-header border-b border-gray-200 dark:border-gray-700 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h5 className="card-title text-slate-900 dark:text-slate-200 font-bold text-sm">
                      Captured Webhook Events ({totalItems})
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Rows per page:</span>
                      <select
                        value={webhookPageSize}
                        onChange={(e) => {
                          setWebhookPageSize(Number(e.target.value));
                          setWebhookPage(1);
                        }}
                        className="form-select form-select-sm text-xs py-1 px-2 border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-0">
                    {loadingWebhooks ? (
                      <div className="flex justify-center items-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : webhookLogs.length === 0 ? (
                      <div className="text-center p-12 text-gray-500 text-xs">
                        No webhook events captured yet. Click "Simulate Test Webhook" above to test.
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[850px] divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-xs font-semibold text-gray-500 uppercase">
                            <tr>
                              <th className="px-4 py-3 text-left">Event ID</th>
                              <th className="px-4 py-3 text-left">Event Type</th>
                              <th className="px-4 py-3 text-left">Organization</th>
                              <th className="px-3 py-3 text-left">Amount</th>
                              <th className="px-3 py-3 text-center">Lifecycle State</th>
                              <th className="px-3 py-3 text-left">Generated Invoice</th>
                              <th className="px-3 py-3 text-left">Timestamp</th>
                              <th className="px-4 py-3 text-right">Payload</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                            {paginatedLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                {/* Event ID */}
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                                  #{log.id} <span className="text-gray-400">({log.event_id})</span>
                                </td>

                                {/* Event Type */}
                                <td className="px-4 py-3">
                                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded text-[11px]">
                                    {log.event_type}
                                  </span>
                                </td>

                                {/* Organization */}
                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {log.organization_name || (log.organization_id ? `Org #${log.organization_id}` : "—")}
                                </td>

                                {/* Amount */}
                                <td className="px-3 py-3 font-bold text-slate-900 dark:text-slate-100">
                                  {log.amount ? (
                                    <span>
                                      {log.currency === "USD" ? `$${Number(log.amount).toLocaleString()}` : `₹${Number(log.amount).toLocaleString()}`}
                                    </span>
                                  ) : "—"}
                                </td>

                                {/* Lifecycle State */}
                                <td className="px-3 py-3 text-center">
                                  {renderLifecycleBadge(log.status)}
                                </td>

                                {/* Invoice # */}
                                <td className="px-3 py-3 font-mono font-bold text-primary">
                                  {log.invoice_number || "—"}
                                </td>

                                {/* Timestamp */}
                                <td className="px-3 py-3 text-gray-500 text-[11px]">
                                  {new Date(log.created_at).toLocaleDateString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>

                                {/* Action: Inspect Payload */}
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 transition shadow-xs inline-flex items-center gap-1 text-xs font-semibold px-2"
                                    onClick={() => setSelectedWebhookPayload(log)}
                                    title="View Raw Webhook Payload"
                                  >
                                    <i className="mgc_code_line text-sm"></i> Raw
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {!loadingWebhooks && totalItems > 0 && (
                      <PaginationControls
                        currentPage={webhookPage}
                        totalPages={totalPages}
                        startIndex={startIndex}
                        totalItems={totalItems}
                        itemsPerPage={webhookPageSize}
                        onPageChange={setWebhookPage}
                      />
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* MODAL: DOWNLOAD / PRINT INVOICE */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-invoice-wrapper, #printable-invoice-wrapper * {
                visibility: visible !important;
              }
              #printable-invoice-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
            }
          `}</style>

          <div
            id="printable-invoice-wrapper"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 text-slate-800 dark:text-slate-100 relative my-auto overflow-hidden animate-in fade-in zoom-in duration-200 print:shadow-none print:border-none print:rounded-none print:max-w-none"
          >
            {/* Modal Screen-only Top Bar */}
            <div className="no-print bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                  <i className="mgc_receipt_line text-lg"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-wide">Tax Invoice & Payment Receipt</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedInvoice.invoice_number || `INV-${new Date(selectedInvoice.created_at).getFullYear()}-${String(selectedInvoice.id).padStart(5, '0')}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-invoice-print !bg-blue-600 hover:!bg-blue-700 !text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                  onClick={() => window.print()}
                >
                  <i className="mgc_print_line text-base !text-white text-white"></i> <span className="!text-white text-white font-bold">Print / Download PDF</span>
                </button>
                <button
                  type="button"
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg transition"
                  onClick={() => setSelectedInvoice(null)}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Document Body (A4 Paper Styled) */}
            <div className="p-8 sm:p-10 space-y-7 text-xs bg-white text-slate-900 print:p-0">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b-2 border-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-sm">
                      <i className="mgc_globe_line"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                        CRM & SAAS PLATFORM
                      </h2>
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                        Cloud Platform & Services
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Enterprise SaaS Subscription & Cloud Operations
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block bg-slate-900 text-white px-3.5 py-1 rounded text-xs font-black tracking-wider uppercase">
                    TAX INVOICE
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-900">
                    {selectedInvoice.invoice_number || `INV-${new Date(selectedInvoice.created_at).getFullYear()}-${String(selectedInvoice.id).padStart(5, '0')}`}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Original for Recipient
                  </div>
                </div>
              </div>

              {/* Billed From & Billed To Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Billed From */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <span>ISSUED BY (SERVICE PROVIDER)</span>
                    <i className="mgc_building_1_line text-slate-400 text-xs"></i>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    CRM SaaS Platform Inc.
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed space-y-0.5">
                    <div>Plot No. 42, Tech Cyber Zone, MIDC</div>
                    <div>Navi Mumbai, Maharashtra - 400701, India</div>
                    <div className="pt-1"><strong className="text-slate-700">GSTIN:</strong> 27AABCN1234F1Z8</div>
                    <div><strong className="text-slate-700">PAN:</strong> AABCN1234F | <strong className="text-slate-700">SAC:</strong> 998313</div>
                    <div><strong className="text-slate-700">Support:</strong> billing@crmsaas.com</div>
                  </div>
                </div>

                {/* Billed To */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary border-b border-primary/20 pb-1.5 flex items-center justify-between">
                    <span>BILLED TO (TENANT CLIENT)</span>
                    <i className="mgc_user_check_line text-primary text-xs"></i>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {selectedInvoice.organization_name}
                  </div>
                  <div className="text-[11px] text-slate-600 leading-relaxed space-y-0.5">
                    <div><strong className="text-slate-700">Organization ID:</strong> #{selectedInvoice.organization_id}</div>
                    <div><strong className="text-slate-700">Tenant Domain:</strong> <span className="font-mono text-slate-800">{selectedInvoice.organization_slug}.crmsaas.com</span></div>
                    <div><strong className="text-slate-700">Account Type:</strong> Enterprise SaaS Client</div>
                    <div><strong className="text-slate-700">Place of Supply:</strong> Maharashtra (State Code 27)</div>
                  </div>
                </div>
              </div>

              {/* Invoice Meta Overview Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 rounded-xl p-3 border border-slate-200 font-medium">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Invoice Date</span>
                  <strong className="text-slate-900 text-xs">
                    {new Date(selectedInvoice.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Subscription Validity</span>
                  <strong className="text-slate-900 text-xs">
                    {selectedInvoice.billing_end_date
                      ? new Date(selectedInvoice.billing_end_date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "+1 Year Active"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Method</span>
                  <strong className="text-slate-900 text-xs flex items-center gap-1">
                    <i className="mgc_bank_card_line text-primary"></i> {selectedInvoice.payment_method || "Razorpay Online"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Status</span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 text-xs">
                    <i className="mgc_check_circle_fill text-emerald-500"></i> PAID & VERIFIED
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4 w-10 text-center">#</th>
                      <th className="py-3 px-4">Service Description</th>
                      <th className="py-3 px-3 text-center">SAC</th>
                      <th className="py-3 px-3 text-center">Period</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Unit Rate</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    <tr className="bg-white">
                      <td className="py-4 px-4 text-center font-bold text-slate-400">1</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {selectedInvoice.plan_name} SaaS Subscription Plan
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-normal">
                          Includes CRM modules provisioning, lead & contact management, deal pipelines, multi-user role access, automated encrypted cloud backups, and SLA uptime guarantee.
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center font-mono text-[11px] text-slate-600">998313</td>
                      <td className="py-4 px-3 text-center text-slate-600 whitespace-nowrap">1 Year</td>
                      <td className="py-4 px-3 text-center font-bold text-slate-800">1</td>
                      <td className="py-4 px-4 text-right font-mono text-slate-700">
                        {selectedInvoice.currency === "USD" ? `$${Number(selectedInvoice.amount).toLocaleString()}` : `₹${Number(selectedInvoice.amount).toLocaleString()}`}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                        {selectedInvoice.currency === "USD" ? `$${Number(selectedInvoice.amount).toLocaleString()}` : `₹${Number(selectedInvoice.amount).toLocaleString()}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment References & Tax Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 items-start">
                {/* Left: Transaction Metadata & Stamp */}
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-200">
                      Payment Verification Details
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedInvoice.razorpay_payment_id || `TXN_${selectedInvoice.id}`}</span>
                    </div>
                    {selectedInvoice.razorpay_order_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gateway Order ID:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedInvoice.razorpay_order_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Settlement Gateway:</span>
                      <span className="font-semibold text-slate-700">Razorpay Auto-Capture</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Processed At:</span>
                      <span className="text-slate-700 font-mono">
                        {new Date(selectedInvoice.created_at).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Digital Signature Stamp */}
                  <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                      <i className="mgc_shield_check_line"></i>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 text-xs">Digitally Signed & Verified</div>
                      <div className="text-[10px] text-emerald-700">Authenticated by CRM SaaS Billing Core</div>
                    </div>
                  </div>
                </div>

                {/* Right: Calculations & Grand Total */}
                <div className="space-y-2">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount (Subtotal):</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedInvoice.currency === "USD" ? `$${Number(selectedInvoice.amount).toLocaleString()}` : `₹${Number(selectedInvoice.amount).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span className="font-mono text-slate-600">Included in Total</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span className="font-mono text-slate-600">Included in Total</span>
                    </div>
                    <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-2 font-medium">
                      <span>Total Tax Amount:</span>
                      <span className="font-mono text-slate-700">₹0.00 (Inclusive)</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-3 border-t-2 border-slate-900">
                      <span className="uppercase tracking-wider">Total Paid:</span>
                      <span className="text-primary font-mono text-lg">
                        {selectedInvoice.currency === "USD" ? `$${Number(selectedInvoice.amount).toLocaleString()}` : `₹${Number(selectedInvoice.amount).toLocaleString()}`} {selectedInvoice.currency}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-right italic pt-1">
                    Amount is inclusive of applicable GST under SAC 998313.
                  </p>
                </div>
              </div>

              {/* Terms & Footer Section */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-slate-500">
                <div>
                  <h6 className="font-bold uppercase text-slate-600 mb-1">Terms & Conditions</h6>
                  <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                    <li>This invoice acts as an official electronic receipt for subscription provisioning.</li>
                    <li>Subscription licenses are renewed on an annual basis according to the selected plan.</li>
                    <li>For questions or GST input tax credit queries, contact billing@crmsaas.com.</li>
                  </ul>
                </div>
                <div className="text-left sm:text-right flex flex-col justify-end space-y-1">
                  <div className="font-bold text-slate-700">CRM SaaS Systems Private Limited</div>
                  <div className="text-slate-400">Authorized Electronic Billing Authority</div>
                  <div className="text-[9px] text-slate-400 italic">This is a computer-generated tax invoice. No physical signature is required.</div>
                </div>
              </div>
            </div>

            {/* Modal Screen-only Bottom Actions */}
            <div className="no-print bg-slate-50 dark:bg-slate-800/80 px-8 py-4 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 italic">
                Press <strong>Ctrl + P</strong> or click Print to generate an A4 PDF receipt.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-invoice-print !bg-blue-600 hover:!bg-blue-700 !text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                  onClick={() => window.print()}
                >
                  <i className="mgc_print_line text-base !text-white text-white"></i> <span className="!text-white text-white font-bold">Print / Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RAW WEBHOOK PAYLOAD INSPECTOR */}
      {selectedWebhookPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200 border border-gray-200 dark:border-gray-700 text-slate-800 dark:text-slate-100">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
              <h5 className="text-base font-bold flex items-center gap-2">
                <i className="mgc_code_line text-primary"></i>
                Raw Webhook Event Payload — <span className="font-mono text-xs">{selectedWebhookPayload.event_id}</span>
              </h5>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                onClick={() => setSelectedWebhookPayload(null)}
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg font-mono">
                <span><strong>Event:</strong> {selectedWebhookPayload.event_type}</span>
                <span><strong>Status:</strong> {renderLifecycleBadge(selectedWebhookPayload.status)}</span>
                <span><strong>Gateway:</strong> {selectedWebhookPayload.gateway}</span>
              </div>

              {selectedWebhookPayload.error_message && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  <strong>Error Trace:</strong> {selectedWebhookPayload.error_message}
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-500 uppercase tracking-wider text-[11px] mb-1">
                  JSON Body:
                </label>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] max-h-72 overflow-y-auto border border-gray-800">
                  {JSON.stringify(selectedWebhookPayload.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                className="btn border border-gray-300 text-gray-700 text-xs px-4 py-2 rounded-lg hover:bg-gray-100 font-semibold"
                onClick={() => setSelectedWebhookPayload(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <i className="mgc_wallet_2_line text-lg"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Record Payment & Activate Plan</h3>
                  <p className="text-xs text-gray-500">Record offline cash, UPI, bank transfer or manual online payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 my-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Select Organization <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={recordForm.organization_id}
                  onChange={(e) => setRecordForm({ ...recordForm, organization_id: e.target.value })}
                  className="form-select text-xs w-full rounded-xl py-2"
                >
                  <option value="">-- Choose Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} (ID: #{org.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Subscription Plan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={recordForm.plan_name}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="form-select text-xs w-full rounded-xl py-2"
                  >
                    <option value="Starter">Starter Plan</option>
                    <option value="Growth">Growth Plan</option>
                    <option value="Business">Business Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={recordForm.currency}
                    onChange={(e) => handleCurrencyToggle(e.target.value)}
                    className="form-select text-xs w-full rounded-xl py-2"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Plan Base Amount ({recordForm.currency === "USD" ? "$" : "₹"})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: Number(e.target.value) })}
                    className="form-input text-xs w-full rounded-xl py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Discount Amount ({recordForm.currency === "USD" ? "$" : "₹"})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={recordForm.discount_amount}
                    onChange={(e) => setRecordForm({ ...recordForm, discount_amount: Number(e.target.value) })}
                    className="form-input text-xs w-full rounded-xl py-2 font-mono text-emerald-600"
                  />
                </div>
              </div>

              {/* Live Net Amount Summary */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-500 block">Net Amount to Record:</span>
                  <strong className="text-slate-800 dark:text-slate-100 text-sm">
                    {recordForm.currency === "USD" ? "$" : "₹"}
                    {Math.max(0, recordForm.amount - recordForm.discount_amount).toLocaleString()}
                  </strong>
                </div>
                {recordForm.discount_amount > 0 && (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px]">
                    Discount: -{recordForm.currency === "USD" ? "$" : "₹"}{recordForm.discount_amount.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={recordForm.payment_method}
                    onChange={(e) => setRecordForm({ ...recordForm, payment_method: e.target.value })}
                    className="form-select text-xs w-full rounded-xl py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online / Razorpay</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Receipt / Transaction Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CASH-84920"
                    value={recordForm.reference}
                    onChange={(e) => setRecordForm({ ...recordForm, reference: e.target.value })}
                    className="form-input text-xs w-full rounded-xl py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={recordForm.paid_at}
                  onChange={(e) => setRecordForm({ ...recordForm, paid_at: e.target.value })}
                  className="form-input text-xs w-full rounded-xl py-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid in cash at office, special approved discount"
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  className="form-input text-xs w-full rounded-xl py-1.5"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="btn border border-gray-300 dark:border-gray-600 text-xs px-4 py-2 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
                >
                  {recordingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Saving Payment...</span>
                    </>
                  ) : (
                    <>
                      <i className="mgc_check_circle_fill text-sm"></i>
                      <span>Record Payment & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SuperAdminPayments;
