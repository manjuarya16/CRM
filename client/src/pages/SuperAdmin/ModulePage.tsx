import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API } from "@/config";
import { getSuperAdminToken } from "@/lib/auth-utils";
import { useSuperAdminStore } from "@/store/superAdminStore";

type RecordValue = Record<string, unknown>;
type Field = { name: string; label: string; type?: "text" | "number" | "email" | "textarea" | "select"; options?: string[]; required?: boolean; secret?: boolean };
type ModuleConfig = {
  listPath: string;
  fields?: Field[];
  scoped?: boolean;
};
type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (result: RazorpayCheckoutResult) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

let razorpayCheckoutScript: Promise<void> | null = null;

const loadRazorpayCheckout = async (): Promise<void> => {
  if (window.Razorpay) return;
  if (!razorpayCheckoutScript) {
    razorpayCheckoutScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayCheckoutScript = null;
        reject(new Error("Could not load Razorpay Checkout. Check your internet connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  await razorpayCheckoutScript;
};

const ENDPOINTS: Record<string, ModuleConfig> = {
  domains: { listPath: "/super-admin/tenants" },
  subscriptions: {
    listPath: "",
    scoped: true,
    fields: [
      { name: "pricing_tier_id", label: "Pricing tier ID", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["trialing", "active", "past_due", "cancelled", "expired"] },
      { name: "starts_at", label: "Starts at", type: "text" },
      { name: "ends_at", label: "Ends at", type: "text" },
      { name: "auto_renew", label: "Auto renew", type: "select", options: ["true", "false"] },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  payments: {
    listPath: "/super-admin/payments",
    fields: [
      { name: "tenant_id", label: "Tenant ID", required: true },
      { name: "amount_cents", label: "Amount (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", required: true },
      { name: "subscription_id", label: "Subscription ID", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["recorded", "paid", "pending", "failed", "refunded"] },
      { name: "reference", label: "Reference" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
  },
  users: {
    listPath: "/super-admin/tenants",
    scoped: true,
    fields: [
      { name: "name", label: "Full name" },
      { name: "email", label: "Email", type: "email" },
      { name: "status", label: "Active", type: "select", options: ["true", "false"] },
      { name: "view_permission", label: "Data visibility", type: "select", options: ["global", "group", "individual"] },
      { name: "role_id", label: "Role ID", type: "number" },
    ],
  },
  roles: {
    listPath: "/super-admin/tenants",
    scoped: true,
    fields: [
      { name: "name", label: "Role name", required: true },
      { name: "description", label: "Description" },
      { name: "permission_type", label: "Permission type", type: "select", options: ["all", "custom"] },
    ],
  },
  "access-management": { listPath: "/super-admin/tenants", scoped: true },
  demos: { listPath: "/demo-requests" },
  pricing: {
    listPath: "/pricing-tiers",
    fields: [
      { name: "name", label: "Plan name", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "amount_cents", label: "Amount (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", required: true },
      { name: "billing_interval", label: "Billing interval", type: "select", options: ["monthly", "yearly", "one_time"] },
      { name: "features", label: "Features (JSON array)", type: "textarea" },
      { name: "limits", label: "Limits (JSON object)", type: "textarea" },
      { name: "active", label: "Active", type: "select", options: ["true", "false"] },
    ],
  },
  "email-templates": {
    listPath: "/super-admin/email-templates",
    fields: [
      { name: "name", label: "Template name", required: true },
      { name: "subject", label: "Subject", required: true },
      { name: "content", label: "Message body", type: "textarea", required: true },
    ],
  },
  smtp: {
    listPath: "/smtp-config",
    fields: [
      { name: "host", label: "SMTP host" },
      { name: "port", label: "Port", type: "number" },
      { name: "secure", label: "Secure connection", type: "select", options: ["true", "false"] },
      { name: "username", label: "Username" },
      { name: "password", label: "Credential (write only)", type: "text", secret: true },
      { name: "clear_password", label: "Clear saved credential", type: "select", options: ["true", "false"] },
      { name: "from_email", label: "Sender email", type: "email" },
      { name: "from_name", label: "Sender name" },
    ],
  },
  notifications: {
    listPath: "/notifications",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "message", label: "Message", type: "textarea", required: true },
      { name: "type", label: "Type", type: "select", options: ["info", "success", "warning", "error"] },
    ],
  },
};

const TENANT_SCOPED = new Set(["subscriptions", "users", "roles", "access-management"]);
const SECRET_KEY = /password|secret|token|private.?key|api.?key/i;

const asObject = (value: unknown): RecordValue | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : null;

const asRecords = (value: unknown): RecordValue[] => {
  if (Array.isArray(value)) return value.map(asObject).filter((item): item is RecordValue => item !== null);
  const object = asObject(value);
  if (!object) return [];
  for (const key of ["items", "records", "tenants", "users", "roles", "plans", "payments", "subscriptions", "notifications", "demos", "templates", "data"]) {
    if (Array.isArray(object[key])) return asRecords(object[key]);
  }
  return [object];
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const jsonField = (value: string, field: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${field} must be valid JSON.`);
  }
};

const errorMessage = (error: unknown): string => {
  const object = asObject(error);
  const response = asObject(object?.response);
  const data = asObject(response?.data);
  return String(data?.message || object?.message || "The request could not be completed.");
};

const apiPath = (path: string) => {
  const normalized = path.startsWith("/super-admin") ? path : `/super-admin${path}`;
  if (normalized === "/super-admin/tenants" || /^\/super-admin\/tenants\/\d+\/status$/.test(normalized)) return normalized;
  return normalized.replace(/^\/super-admin/, "/super-admin/modules");
};

const SuperAdminModulePage: React.FC<{ moduleKey: string; title: string }> = ({ moduleKey, title }) => {
  const token = getSuperAdminToken();
  const tenants = useSuperAdminStore((state) => state.tenants);
  const fetchTenants = useSuperAdminStore((state) => state.fetchTenants);
  const [records, setRecords] = useState<RecordValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [editing, setEditing] = useState<RecordValue | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [accessText, setAccessText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState<RecordValue | null>(null);
  const [orderTenantId, setOrderTenantId] = useState("");
  const [newOrder, setNewOrder] = useState({
    tenant_id: "",
    amount_cents: "",
    currency: "INR",
    subscription_id: "",
  });
  const [paymentFilterDraft, setPaymentFilterDraft] = useState({
    search: "",
    status: "",
    date_from: "",
    date_to: "",
  });
  const [appliedPaymentFilters, setAppliedPaymentFilters] = useState(paymentFilterDraft);

  const config = ENDPOINTS[moduleKey];
  const scoped = TENANT_SCOPED.has(moduleKey);
  const tenantOptions = tenants;

  const request = useCallback(async (method: "get" | "post" | "put" | "patch" | "delete", path: string, data?: unknown) => {
    const response = await API.request({
      method,
      url: apiPath(path),
      data,
      headers: token ? { Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` } : undefined,
    });
    const payload = response.data as unknown;
    const envelope = asObject(payload);
    if (envelope && envelope.success === false) throw new Error(String(envelope.message || "Request failed."));
    return envelope && "data" in envelope ? envelope.data : payload;
  }, [token]);

  const load = useCallback(async () => {
    if (!config) {
      setLoading(false);
      setError("This module is not available.");
      return;
    }
    if ((scoped || moduleKey === "domains" || moduleKey === "payments") && tenants.length === 0) await fetchTenants();
    if (scoped && !tenantId) {
      setRecords([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let path = config.listPath;
      if (moduleKey === "subscriptions") path = `/tenants/${encodeURIComponent(tenantId)}/subscriptions`;
      if (moduleKey === "users") path = `/tenants/${encodeURIComponent(tenantId)}/users`;
      if (moduleKey === "roles" || moduleKey === "access-management") path = `/tenants/${encodeURIComponent(tenantId)}/roles`;
      if (moduleKey === "payments") {
        const params = new URLSearchParams();
        if (tenantId) params.set("tenant_id", tenantId);
        if (appliedPaymentFilters.search.trim()) params.set("search", appliedPaymentFilters.search.trim());
        if (appliedPaymentFilters.status) params.set("status", appliedPaymentFilters.status);
        if (appliedPaymentFilters.date_from) params.set("date_from", appliedPaymentFilters.date_from);
        if (appliedPaymentFilters.date_to) params.set("date_to", appliedPaymentFilters.date_to);
        path = `/payments${params.size ? `?${params.toString()}` : ""}`;
      }
      const result = await request("get", path);
      const list = asRecords(result);
      if (moduleKey === "smtp" && list.length === 1) {
        setRecords(list.map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => !SECRET_KEY.test(key)))));
      } else {
        setRecords(list);
      }
      if (moduleKey === "access-management") {
        const selectedRole = list.find((role) => String(role.id) === roleId) || list[0];
        setRoleId(selectedRole?.id === undefined ? "" : String(selectedRole.id));
      }
    } catch (requestError) {
      setRecords([]);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [appliedPaymentFilters, config, fetchTenants, moduleKey, request, roleId, scoped, tenantId, tenants.length]);

  useEffect(() => {
    void load();
  }, [load]);

  const fields = useMemo(() => config?.fields || [], [config]);

  const beginCreate = () => {
    setEditing(null);
    setForm({});
    setShowForm(true);
    setNotice("");
  };

  const beginEdit = (record: RecordValue) => {
    setEditing(record);
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = record[field.name];
      next[field.name] = value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    }
    setForm(next);
    setShowForm(true);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload: RecordValue = {};
      for (const field of fields) {
        const value = form[field.name]?.trim();
        if (value !== undefined && value !== "") {
          if (field.type === "number") payload[field.name] = Number(value);
          else if (["active", "auto_renew", "secure", "clear_password"].includes(field.name)) payload[field.name] = value === "true";
          else if (field.name === "features" || field.name === "limits") payload[field.name] = jsonField(value, field.label);
          else payload[field.name] = value;
        }
      }
      if (moduleKey === "payments" && !tenantId) payload.tenant_id = Number(form.tenant_id);
      if (moduleKey === "smtp") {
        if (form.password?.trim()) payload.password = form.password.trim();
        else delete payload.password;
      }
      const id = editing?.id;
      if (editing && id !== undefined) {
        const path = moduleKey === "email-templates"
          ? `/email-templates/${id}`
          : moduleKey === "pricing"
            ? `/pricing-tiers/${id}`
            : moduleKey === "subscriptions"
              ? `/tenants/${tenantId}/subscriptions/${id}`
              : moduleKey === "users"
                ? `/tenants/${tenantId}/users/${id}`
                : `/tenants/${tenantId}/roles/${id}`;
        const method = ["subscriptions", "roles", "users"].includes(moduleKey) ? "patch" : "put";
        await request(method, path, payload);
      } else if (moduleKey === "smtp") {
        await request("put", "/smtp-config", payload);
      } else if (moduleKey === "payments") {
        await request("post", tenantId ? `/tenants/${tenantId}/payments` : "/payments", payload);
      } else if (moduleKey === "demos") {
        setError("Demo requests are received through the public intake form; this authenticated module is read-only.");
        setSaving(false);
        return;
      } else if (moduleKey === "subscriptions") {
        await request("post", `/tenants/${tenantId}/subscriptions`, payload);
      } else if (moduleKey === "pricing") {
        await request("post", "/pricing-tiers", payload);
      } else if (moduleKey === "email-templates") {
        await request("post", "/email-templates", payload);
      } else if (moduleKey === "roles") {
        await request("post", `/tenants/${tenantId}/roles`, payload);
      } else if (moduleKey === "notifications") {
        await request("post", "/notifications", payload);
      } else {
        throw new Error("Creating records is not supported for this module.");
      }
      setShowForm(false);
      setForm({});
      setNotice(editing ? "Changes saved." : "Record created.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (action: "status" | "read" | "delete", record: RecordValue) => {
    const id = record.id;
    if (id === undefined) return;
    const currentStatus = String(record.status || "").toLowerCase();
    try {
      setError("");
      setNotice("");
      if (moduleKey === "users") {
        await request("patch", `/tenants/${tenantId}/users/${id}`, { status: record.status !== true && currentStatus !== "active" });
      } else if (moduleKey === "domains") {
        const status = currentStatus === "active" ? "suspended" : "active";
        await request("patch", `/super-admin/tenants/${id}/status`, { status });
      } else if (moduleKey === "demos") {
        const status = ({ new: "contacted", contacted: "qualified", qualified: "closed", closed: "new" } as Record<string, string>)[currentStatus] || "contacted";
        await request("patch", `/demo-requests/${id}/status`, { status });
      } else if (moduleKey === "notifications" && action === "read") {
        await request("patch", `/notifications/${id}/read`, { is_read: record.is_read !== true });
      } else if (moduleKey === "notifications" && action === "delete") {
        await request("delete", `/notifications/${id}`);
      } else if (moduleKey === "email-templates" && action === "delete") {
        await request("delete", `/email-templates/${id}`);
      } else if (moduleKey === "pricing" && action === "delete") {
        await request("delete", `/pricing-tiers/${id}`);
      }
      setNotice("Action completed.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const startOrder = async (payment: RecordValue) => {
    const paymentTenantId = payment.tenant_id === undefined ? "" : String(payment.tenant_id);
    if (!paymentTenantId || typeof payment.amount_cents !== "number" || !Number.isSafeInteger(payment.amount_cents) || payment.amount_cents <= 0) {
      setError("Select an organization and enter a positive whole-number amount in the currency's minor unit.");
      return;
    }
    try {
      setError("");
      setNotice("");
      setOrderDetails(null);
      const result = asObject(await request("post", `/tenants/${paymentTenantId}/payments/razorpay/orders`, {
        amount_cents: payment.amount_cents,
        currency: payment.currency || "INR",
        ...(typeof payment.subscription_id === "number" ? { subscription_id: payment.subscription_id } : {}),
      }));
      const order = asObject(result?.order);
      setOrderTenantId(paymentTenantId);
      if (typeof order?.id === "string" && typeof result?.key_id === "string") {
        setOrderDetails({ ...order, key_id: result.key_id });
      } else {
        setOrderDetails(null);
        setError("The server did not return the order ID and public key required to continue.");
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const verifyOrder = async (result: RazorpayCheckoutResult) => {
    try {
      setSaving(true);
      setError("");
      await request("post", `/tenants/${orderTenantId}/payments/razorpay/verify`, result);
      setOrderDetails(null);
      setNotice("Payment verified successfully.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const openRazorpayCheckout = async () => {
    if (!orderDetails || typeof orderDetails.id !== "string" || typeof orderDetails.key_id !== "string") return;
    try {
      setSaving(true);
      setError("");
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not initialize. Please try again.");
      const checkout = new window.Razorpay({
        key: orderDetails.key_id,
        amount: Number(orderDetails.amount),
        currency: String(orderDetails.currency || "INR"),
        name: "CRM Platform",
        description: `Organization payment order ${orderDetails.id}`,
        order_id: orderDetails.id,
        handler: (result) => { void verifyOrder(result); },
        modal: {
          ondismiss: () => setNotice("Checkout was closed. The payment order remains pending."),
        },
        theme: { color: "#4f46e5" },
      });
      checkout.open();
    } catch (checkoutError) {
      setError(errorMessage(checkoutError));
    } finally {
      setSaving(false);
    }
  };

  const saveAccess = async () => {
    if (!tenantId || !roleId) return;
    try {
      setSaving(true);
      const access = JSON.parse(accessText) as RecordValue;
      await request("put", `/tenants/${tenantId}/roles/${roleId}/access`, {
        permission_type: access.permission_type,
        permissions: access.permissions,
      });
      setNotice("Role access updated.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? "Access must be valid JSON." : errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    try {
      setTestingSmtp(true);
      setSmtpTestResult(null);
      const result = asObject(await request("post", "/smtp-config/test", {}));
      setSmtpTestResult({
        message: String(result?.message || "SMTP test completed."),
        success: result?.success !== false,
      });
    } catch (requestError) {
      setSmtpTestResult({ message: errorMessage(requestError), success: false });
    } finally {
      setTestingSmtp(false);
    }
  };

  useEffect(() => {
    if (moduleKey !== "access-management" || !tenantId || !roleId) {
      setAccessText("");
      return;
    }
    let active = true;
    const fetchAccess = async () => {
      try {
        const result = asObject(await request("get", `/tenants/${tenantId}/roles/${roleId}/access`));
        if (active) setAccessText(JSON.stringify({
          permission_type: result?.permission_type || "custom",
          permissions: result?.permissions ?? {},
        }, null, 2));
      } catch (requestError) {
        if (active) setError(errorMessage(requestError));
      }
    };
    void fetchAccess();
    return () => { active = false; };
  }, [moduleKey, request, roleId, tenantId]);

  const visibleColumns = useMemo(() => {
    const first = records.find((item) => Object.keys(item).length > 0);
    return first ? Object.keys(first).filter((key) => !SECRET_KEY.test(key)).slice(0, 6) : [];
  }, [records]);

  const createLabel = moduleKey === "payments" ? "Create manual payment" : moduleKey === "smtp" ? "Edit SMTP settings" : "Add record";
  const canCreate = Boolean(fields.length) && !["demos", "users"].includes(moduleKey);

  return (
    <section className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Super Admin Console</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">Manage platform {title.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scoped && (
            <label className="text-xs text-slate-400">
              Tenant
              <select value={tenantId} onChange={(event) => { setTenantId(event.target.value); setRoleId(""); }} className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="">Select a tenant</option>
                {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
              </select>
            </label>
          )}
          {moduleKey === "payments" && (
            <label className="text-xs text-slate-400">
              Tenant filter <span className="text-slate-500">(optional)</span>
              <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="">All tenants</option>
                {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
              </select>
            </label>
          )}
          <button type="button" onClick={() => void load()} className="self-end rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Refresh</button>
          {moduleKey === "smtp" && <button type="button" disabled={testingSmtp} onClick={() => void testSmtp()} className="self-end rounded-lg border border-indigo-500/40 px-3 py-2 text-sm text-indigo-300 disabled:opacity-50">{testingSmtp ? "Testing…" : "Test SMTP"}</button>}
          {canCreate && (!scoped || tenantId) && (
            <button type="button" onClick={beginCreate} className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{createLabel}</button>
          )}
          {moduleKey === "notifications" && records.length > 0 && (
            <button type="button" onClick={async () => { try { await request("delete", "/notifications"); await load(); setNotice("All notifications deleted."); } catch (e) { setError(errorMessage(e)); } }} className="self-end rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">Clear all</button>
          )}
        </div>
      </header>

      {moduleKey === "smtp" && <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">Saved SMTP credentials are never displayed. Credential writes only work when server-side encryption is configured; leave the credential blank to keep the current value.</div>}
      {moduleKey === "smtp" && smtpTestResult && <div role={smtpTestResult.success ? "status" : "alert"} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${smtpTestResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{smtpTestResult.message}</div>}
      {moduleKey === "demos" && <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Demo requests are listed here. New requests are collected by the public intake form, not this authenticated screen.</div>}
      {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={() => void load()} className="shrink-0 underline">Retry</button></div>}

      {moduleKey === "payments" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedPaymentFilters(paymentFilterDraft);
          }}
          className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="text-xs font-medium text-slate-300">
            Search payments
            <input value={paymentFilterDraft.search} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Organization, reference, payment ID" className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Status
            <select value={paymentFilterDraft.status} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, status: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">All statuses</option>
              {["created", "recorded", "pending", "paid", "failed", "refunded"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-300">
            From
            <input type="date" value={paymentFilterDraft.date_from} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, date_from: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            To
            <input type="date" value={paymentFilterDraft.date_to} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, date_to: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Apply filters</button>
            <button type="button" onClick={() => { const emptyFilters = { search: "", status: "", date_from: "", date_to: "" }; setPaymentFilterDraft(emptyFilters); setAppliedPaymentFilters(emptyFilters); setTenantId(""); }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Clear</button>
          </div>
        </form>
      )}

      {moduleKey === "payments" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void startOrder({
              tenant_id: newOrder.tenant_id,
              amount_cents: Number(newOrder.amount_cents),
              currency: newOrder.currency,
              ...(newOrder.subscription_id ? { subscription_id: Number(newOrder.subscription_id) } : {}),
            });
          }}
          className="mb-6 grid gap-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="text-xs font-medium text-slate-300">
            Tenant
            <select required value={newOrder.tenant_id} onChange={(event) => setNewOrder((current) => ({ ...current, tenant_id: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              <option value="">Select a tenant</option>
              {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-300">
            Amount (minor units)
            <input type="number" min="1" required value={newOrder.amount_cents} onChange={(event) => setNewOrder((current) => ({ ...current, amount_cents: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Currency
            <input required maxLength={3} value={newOrder.currency} onChange={(event) => setNewOrder((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Subscription ID <span className="font-normal text-slate-500">(optional)</span>
            <input type="number" min="1" value={newOrder.subscription_id} onChange={(event) => setNewOrder((current) => ({ ...current, subscription_id: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
          </label>
          <button type="submit" className="self-end rounded-lg border border-indigo-500/40 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Create Razorpay order</button>
        </form>
      )}

      {showForm && (
        <form onSubmit={(event) => void submitForm(event)} className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">{editing ? "Edit record" : createLabel}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((field) => !(moduleKey === "payments" && tenantId && field.name === "tenant_id")).map((field) => (
              <label key={field.name} className={`text-xs font-medium text-slate-300 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                {field.label}
                {field.secret && <span className="ml-1 font-normal text-slate-500">(never shown after saving)</span>}
                {field.name === "tenant_id" && moduleKey === "payments" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">Select a tenant</option>
                    {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} rows={5} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                ) : field.type === "select" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">Select…</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input type={field.secret ? "password" : field.type || "text"} value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} min={field.type === "number" ? 0 : undefined} autoComplete={field.secret ? "new-password" : undefined} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      {moduleKey === "access-management" && !loading && records.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold text-white">Role access rules</h2><p className="text-xs text-slate-400">Edit the selected role’s access configuration as JSON.</p></div>
            <select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
              {records.map((role) => <option key={String(role.id)} value={String(role.id)}>{String(role.name || `Role ${role.id}`)}</option>)}
            </select>
          </div>
          <textarea aria-label="Role access JSON" value={accessText} onChange={(event) => setAccessText(event.target.value)} rows={10} className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-100" />
          <div className="mt-3 flex justify-end"><button type="button" disabled={saving || !roleId} onClick={() => void saveAccess()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save access"}</button></div>
        </section>
      )}

      {moduleKey === "payments" && orderDetails && (
        <section className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
          <h2 className="font-semibold text-white">Complete Razorpay payment</h2>
          <p className="mt-1 text-sm text-slate-300">Open Razorpay Checkout to complete the payment. The payment response will be verified with the server automatically.</p>
          <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
            {["id", "amount", "currency", "key_id"].filter((key) => orderDetails[key] !== undefined).map((key) => <div key={key} className="rounded-lg bg-slate-900 p-2"><span className="text-slate-500">{key === "id" ? "order_id" : key}: </span>{displayValue(orderDetails[key])}</div>)}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setOrderDetails(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void openRazorpayCheckout()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Opening checkout…" : "Pay with Razorpay"}</button>
          </div>
        </section>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        {loading ? (
          <div role="status" className="space-y-3 p-5"><div className="h-4 w-40 animate-pulse rounded bg-slate-800" /><div className="h-10 animate-pulse rounded bg-slate-800/70" /><div className="h-10 animate-pulse rounded bg-slate-800/70" /><span className="sr-only">Loading {title.toLowerCase()}…</span></div>
        ) : scoped && !tenantId ? (
          <div className="p-10 text-center"><h2 className="font-semibold text-white">Select a tenant</h2><p className="mt-1 text-sm text-slate-400">Choose a tenant above to load its {title.toLowerCase()}.</p></div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-slate-400"><i className="mgc_inbox_2_line text-xl" /></div><h2 className="mt-3 font-semibold text-white">{error ? "Unable to load records" : "Nothing here yet"}</h2><p className="mt-1 text-sm text-slate-400">{error ? "Check the error above and retry." : `No ${title.toLowerCase()} were found.`}</p></div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase tracking-wide text-slate-500"><tr>{visibleColumns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column.replace(/_/g, " ")}</th>)}<th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {records.map((record, index) => <tr key={String(record.id ?? index)} className="hover:bg-slate-800/30">{visibleColumns.map((column) => <td key={column} className="max-w-xs px-4 py-3 text-slate-300"><span className="block truncate">{displayValue(record[column])}</span></td>)}<td className="px-4 py-3"><div className="flex justify-end gap-2">{(moduleKey === "users" || moduleKey === "domains") && <button type="button" onClick={() => void performAction("status", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{moduleKey === "users" ? (record.status === true ? "Deactivate" : "Activate") : (String(record.status).toLowerCase() === "active" ? "Suspend" : "Activate")}</button>}{moduleKey === "demos" && <button type="button" onClick={() => void performAction("status", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">Advance status</button>}                  {(moduleKey === "roles" || moduleKey === "pricing" || moduleKey === "subscriptions" || moduleKey === "email-templates" || moduleKey === "smtp" || moduleKey === "users") && fields.length > 0 && <button type="button" onClick={() => beginEdit(record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">Edit</button>}{moduleKey === "notifications" && <><button type="button" onClick={() => void performAction("read", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{record.is_read === true ? "Mark unread" : "Mark read"}</button><button type="button" onClick={() => void performAction("delete", record)} className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300">Delete</button></>}{(moduleKey === "email-templates" || moduleKey === "pricing") && <button type="button" onClick={() => void performAction("delete", record)} className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300">Delete</button>}</div></td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-800 md:hidden">
              {records.map((record, index) => <article key={String(record.id ?? index)} className="p-4"><div className="grid grid-cols-2 gap-x-3 gap-y-2">{visibleColumns.map((column) => <div key={column} className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-slate-500">{column.replace(/_/g, " ")}</p><p className="truncate text-sm text-slate-200">{displayValue(record[column])}</p></div>)}</div><div className="mt-3 flex flex-wrap gap-2">{(moduleKey === "users" || moduleKey === "domains") && <button type="button" onClick={() => void performAction("status", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{moduleKey === "users" ? (record.status === true ? "Deactivate" : "Activate") : (String(record.status).toLowerCase() === "active" ? "Suspend" : "Activate")}</button>}{moduleKey === "demos" && <button type="button" onClick={() => void performAction("status", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">Advance status</button>}{["roles", "pricing", "subscriptions", "email-templates", "smtp", "users"].includes(moduleKey) && fields.length > 0 && <button type="button" onClick={() => beginEdit(record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">Edit</button>}{moduleKey === "notifications" && <><button type="button" onClick={() => void performAction("read", record)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">{record.is_read === true ? "Mark unread" : "Mark read"}</button><button type="button" onClick={() => void performAction("delete", record)} className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300">Delete</button></>}{(moduleKey === "email-templates" || moduleKey === "pricing") && <button type="button" onClick={() => void performAction("delete", record)} className="rounded border border-rose-500/30 px-2 py-1 text-xs text-rose-300">Delete</button>}</div></article>)}
            </div>
          </>
        )}
      </div>
      {moduleKey === "domains" && <p className="mt-3 text-xs text-slate-500">Domain management uses the platform tenant directory. Domain values are shown only when provided by the API.</p>}
    </section>
  );
};

export default SuperAdminModulePage;
