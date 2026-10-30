import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API } from "@/config";
import { getSuperAdminToken } from "@/lib/auth-utils";
import { useSuperAdminStore } from "@/store/superAdminStore";
import { MATRIX_MODULES } from "@/constants/matrixModules";
import { showConfirmDialog, showSuccessAlert } from "@/utils/swalAlert";
import PaymentLinkDialog from "@/pages/SuperAdmin/PaymentLinkDialog";
import Swal from "sweetalert2";
import {
  Calendar,
  Check,
  ExternalLink,
  Eye,
  Inbox,
  Mail,
  MailOpen,
  Pencil,
  Power,
  RefreshCw,
  Send,
  Trash2,
  Zap,
} from "lucide-react";

type RecordValue = Record<string, unknown>;
type Field = { name: string; label: string; type?: "text" | "number" | "email" | "textarea" | "select"; options?: string[]; required?: boolean; secret?: boolean };
type ModuleConfig = {
  listPath: string;
  fields?: Field[];
  scoped?: boolean;
};
const ENDPOINTS: Record<string, ModuleConfig> = {
  organizations: {
    listPath: "/super-admin/tenants",
    fields: [
      { name: "name", label: "Organization name", required: true },
      { name: "slug", label: "Subdomain slug (e.g. acme)", required: true },
      { name: "admin_name", label: "Administrator name", required: true },
      { name: "admin_email", label: "Administrator email", type: "email", required: true },
      { name: "admin_password", label: "Administrator password", type: "text", required: true, secret: true },
      { name: "plan", label: "Subscription plan", type: "select" },
      { name: "status", label: "Status", type: "select", options: ["active", "suspended"] },
      { name: "registration_no", label: "Registration / Tax No." },
      { name: "phone", label: "Phone number" },
      { name: "email", label: "Organization official email", type: "email" },
      { name: "website", label: "Website URL" },
      { name: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP"] },
      { name: "timezone", label: "Timezone", type: "select", options: ["Asia/Kolkata", "America/New_York", "Europe/London", "UTC"] },
      { name: "street", label: "Street address" },
      { name: "city", label: "City" },
      { name: "state", label: "State / Province" },
      { name: "country", label: "Country" },
      { name: "pincode", label: "Postal / ZIP code" },
      { name: "description", label: "Description / About", type: "textarea" },
    ],
  },
  domains: { listPath: "/super-admin/tenants" },
  subscriptions: {
    listPath: "",
    scoped: true,
    fields: [
      { name: "pricing_tier_id", label: "Plan", type: "select" },
      { name: "status", label: "Status", type: "select", options: ["trialing", "pending", "active", "past_due", "cancelled", "expired"] },
      { name: "trial_days", label: "Trial period (days)", type: "number" },
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
    listPath: "/platform-users",
    fields: [
      { name: "name", label: "Full name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "password", label: "Password", type: "text", required: true, secret: true },
      { name: "platform_role_id", label: "Role", type: "select", required: true },
      { name: "status", label: "Account status", type: "select", options: ["active", "suspended"], required: true },
    ],
  },
  roles: {
    listPath: "/platform-roles",
    fields: [
      { name: "parent_role_id", label: "Parent role", type: "select", required: true },
      { name: "name", label: "Role name", required: true },
      { name: "description", label: "Description" },
      { name: "permission_type", label: "Permission type", type: "select", options: ["all", "custom"] },
    ],
  },
  "access-management": { listPath: "/platform-roles" },
  demos: { listPath: "/demo-requests" },
  pricing: {
    listPath: "/pricing-tiers",
    fields: [
      { name: "name", label: "Plan name", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "amount_cents", label: "Amount (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", required: true },
      { name: "billing_interval", label: "Billing interval", type: "select", options: ["monthly", "yearly", "one_time"] },
      { name: "trial_days", label: "Trial period (days)", type: "number", required: true },
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
      { name: "delivery_enabled", label: "Enable email delivery", type: "select", options: ["true", "false"] },
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
      { name: "email_to", label: "Also email (optional)", type: "email" },
    ],
  },
};

const TENANT_SCOPED = new Set(["subscriptions"]);
const SECRET_KEY = /password|secret|token|private.?key|api.?key/i;
const PLATFORM_PERMISSION_MODULE: Record<string, string> = {
  organizations: "organizations",
  domains: "domains",
  subscriptions: "subscriptions",
  payments: "payments",
  users: "users",
  roles: "roles",
  "access-management": "access_management",
  demos: "demos",
  pricing: "pricing",
  "email-templates": "email_templates",
  smtp: "smtp",
  notifications: "notifications",
};
const PLATFORM_MATRIX_MODULES = MATRIX_MODULES.filter((module) => module.viewKey.startsWith("platform."));
const ALL_PLATFORM_PERMISSION_KEYS = PLATFORM_MATRIX_MODULES.flatMap((module) => [
  module.viewKey,
  module.addKey,
  module.updateKey,
  module.deleteKey,
]);

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

const roleHierarchy = (roles: RecordValue[]) => {
  const roleById = new Map(roles.map((role) => [String(role.id), role]));
  const children = new Map<string, RecordValue[]>();
  const roots: RecordValue[] = [];

  for (const role of roles) {
    const parentId = role.parent_role_id == null ? "" : String(role.parent_role_id);
    if (!parentId || parentId === String(role.id) || !roleById.has(parentId)) {
      roots.push(role);
      continue;
    }
    const siblings = children.get(parentId) || [];
    siblings.push(role);
    children.set(parentId, siblings);
  }

  const byName = (left: RecordValue, right: RecordValue) =>
    String(left.name || "").localeCompare(String(right.name || ""));
  const ordered: Array<{ role: RecordValue; depth: number }> = [];
  const visited = new Set<string>();
  const visit = (role: RecordValue, depth: number) => {
    const id = String(role.id);
    if (visited.has(id)) return;
    visited.add(id);
    ordered.push({ role, depth });
    (children.get(id) || []).sort(byName).forEach((child) => visit(child, depth + 1));
  };

  roots.sort(byName).forEach((role) => visit(role, 0));
  roles.slice().sort(byName).forEach((role) => visit(role, 0));
  return ordered;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const displayDateOnly = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "—";
  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (datePart) return datePart;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatTierPrice = (record: RecordValue): string => {
  const amount = Number(record.amount_cents);
  const currency = typeof record.currency === "string" ? record.currency.toUpperCase() : "";
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(currency)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return "Price unavailable";
  }
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
  if (normalized.startsWith("/super-admin/tenants") || normalized.startsWith("/super-admin/users")) return normalized;
  return normalized.replace(/^\/super-admin/, "/super-admin/modules");
};

const SuperAdminModulePage: React.FC<{ moduleKey: string; title: string }> = ({ moduleKey, title }) => {
  const token = getSuperAdminToken();
  const tenants = useSuperAdminStore((state) => state.tenants);
  const fetchTenants = useSuperAdminStore((state) => state.fetchTenants);
  const admin = useSuperAdminStore((state) => state.admin);
  const [records, setRecords] = useState<RecordValue[]>([]);
  const [platformRoles, setPlatformRoles] = useState<RecordValue[]>([]);
  const [planOptions, setPlanOptions] = useState<RecordValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ message: string; success: boolean } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [editing, setEditing] = useState<RecordValue | null>(null);
  const [viewing, setViewing] = useState<RecordValue | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savedPermissions, setSavedPermissions] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [paymentLinkTenant, setPaymentLinkTenant] = useState<RecordValue | null>(null);
  const [paymentFilterDraft, setPaymentFilterDraft] = useState({
    search: "",
    status: "",
    date_from: "",
    date_to: "",
  });
  const [appliedPaymentFilters, setAppliedPaymentFilters] = useState(paymentFilterDraft);
  const [trialDemo, setTrialDemo] = useState<RecordValue | null>(null);
  const [trialDays, setTrialDays] = useState("14");
  const [trialPassword, setTrialPassword] = useState("");
  const [trialPlanId, setTrialPlanId] = useState("");

  const config = ENDPOINTS[moduleKey];
  const scoped = TENANT_SCOPED.has(moduleKey);
  const tenantOptions = tenants;
  const permissionModule = PLATFORM_PERMISSION_MODULE[moduleKey] ?? moduleKey;
  const hasPermission = (action: "view" | "create" | "edit" | "delete") =>
    Boolean(
      admin?.is_platform_owner ||
      (permissionModule &&
        (admin?.permissions?.includes(`platform.${permissionModule}.${action}`) ||
         admin?.permissions?.includes(`${permissionModule}.${action}`)))
    );
  const canEditSelectedRole = hasPermission("edit") && roleId !== String(admin?.platform_role_id ?? "");
  const canEditRecord = (record: RecordValue) =>
    hasPermission("edit") &&
    !(moduleKey === "roles" && String(record.id) === String(admin?.platform_role_id));
  const canDeleteRecord = (record: RecordValue) =>
    hasPermission("delete") &&
    !((moduleKey === "users" && String(record.id) === String(admin?.id)) ||
      (moduleKey === "roles" && String(record.id) === String(admin?.platform_role_id)));

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
    if (envelope && "data" in envelope) {
      const data = envelope.data;
      if (envelope.email_sent !== undefined && data !== null && typeof data === "object") {
        return { ...(data as RecordValue), email_sent: envelope.email_sent, response_message: envelope.message };
      }
      return data;
    }
    return payload;
  }, [token]);

  const load = useCallback(async () => {
    if (!config) {
      setLoading(false);
      setError("This module is not available.");
      return;
    }
    if ((scoped || moduleKey === "domains" || moduleKey === "payments") && tenants.length === 0) await fetchTenants();
    if (scoped && !tenantId && moduleKey !== "subscriptions") {
      setRecords([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      let path = config.listPath;
      if (moduleKey === "subscriptions") path = "/subscriptions";
      if (moduleKey === "users") path = "/platform-users";
      if (moduleKey === "access-management") path = "/platform-roles";
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
      if (moduleKey === "subscriptions" || moduleKey === "demos" || moduleKey === "organizations") {
        setPlanOptions(asRecords(await request("get", "/subscription-plans")));
      }
      if (moduleKey === "users") {
        const roleList = asRecords(await request("get", "/platform-roles"));
        setPlatformRoles(roleHierarchy(roleList).map(({ role, depth }) => ({ ...role, hierarchy_depth: depth })));
      }
      if (moduleKey === "smtp" && list.length === 1) {
        setRecords(list.map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => !SECRET_KEY.test(key)))));
        setForm((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(list[0]).map(([key, value]) => [
              key,
              value === undefined || value === null ? "" : String(value),
            ]),
          ),
          password: "",
        }));
      } else if (moduleKey === "roles" || moduleKey === "access-management") {
        const roleById = new Map(list.map((role) => [String(role.id), role]));
        setRecords(roleHierarchy(list).map(({ role, depth }) => ({
          ...role,
          hierarchy_depth: depth,
          parent_role_name: role.parent_role_id == null
            ? null
            : roleById.get(String(role.parent_role_id))?.name || null,
        })));
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
    setViewing(null);
    setForm(moduleKey === "organizations"
      ? { status: "active", plan: "pro", currency: "INR", timezone: "Asia/Kolkata" }
      : moduleKey === "users"
      ? { status: "active", platform_role_id: "" }
      : moduleKey === "subscriptions"
        ? { pricing_tier_id: "" }
      : moduleKey === "roles" && admin?.platform_role_id
        ? { parent_role_id: String(admin.platform_role_id) }
        : {});
    setShowForm(true);
    setNotice("");
  };

  const beginEdit = (record: RecordValue) => {
    setViewing(null);
    setEditing(record);
    if (moduleKey === "subscriptions" && record.tenant_id !== undefined) {
      setTenantId(String(record.tenant_id));
    }
    const next: Record<string, string> = {};
    for (const field of fields) {
      const value = record[field.name];
      next[field.name] = value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    }
    setForm(next);
    setShowForm(true);
  };

  const beginView = (record: RecordValue) => {
    setEditing(null);
    setShowForm(false);
    setViewing(record);
    setNotice("");
    setError("");
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    setError("");
    setNotice("");
    let actionResult: RecordValue | null = null;
    try {
      const payload: RecordValue = {};
      for (const field of fields) {
        const value = form[field.name]?.trim();
        if (value !== undefined && value !== "") {
          if (field.type === "number") payload[field.name] = Number(value);
          else if (["active", "auto_renew", "secure", "delivery_enabled", "clear_password"].includes(field.name)) payload[field.name] = value === "true";
          else if (field.name === "features" || field.name === "limits") payload[field.name] = jsonField(value, field.label);
          else payload[field.name] = value;
        }
      }
      if (moduleKey === "payments" && !tenantId) payload.tenant_id = Number(form.tenant_id);
      if (moduleKey === "roles") {
        payload.parent_role_id = form.parent_role_id ? Number(form.parent_role_id) : null;
      }
      if (moduleKey === "subscriptions") {
        payload.pricing_tier_id = form.pricing_tier_id ? Number(form.pricing_tier_id) : null;
      }
      if (moduleKey === "smtp") {
        if (form.password?.trim()) payload.password = form.password.trim();
        else delete payload.password;
      }
      const id = editing?.id;
      if (editing && id !== undefined) {
        const path = moduleKey === "organizations"
          ? `/super-admin/tenants/${id}`
          : moduleKey === "users"
          ? `/platform-users/${id}`
          : moduleKey === "email-templates"
            ? `/email-templates/${id}`
            : moduleKey === "pricing"
              ? `/pricing-tiers/${id}`
              : moduleKey === "subscriptions"
                ? `/tenants/${tenantId}/subscriptions/${id}`
                : moduleKey === "roles"
                  ? `/platform-roles/${id}`
                  : `/tenants/${tenantId}/roles/${id}`;
        const method = ["subscriptions", "roles", "users"].includes(moduleKey) ? "patch" : "put";
        await request(method, path, payload);
      } else if (moduleKey === "organizations") {
        await request("post", "/super-admin/tenants", payload);
      } else if (moduleKey === "smtp") {
        await request("put", "/smtp-config", payload);
      } else if (moduleKey === "payments") {
        await request("post", tenantId ? `/tenants/${tenantId}/payments` : "/payments", payload);
      } else if (moduleKey === "demos") {
        setError("Demo requests are received through the public intake form; this authenticated module is read-only.");
        setSaving(false);
        return;
      } else if (moduleKey === "subscriptions") {
        actionResult = asObject(await request("post", `/tenants/${tenantId}/subscriptions/payment-link`, {
          pricing_tier_id: Number(form.pricing_tier_id),
        }));
      } else if (moduleKey === "pricing") {
        await request("post", "/pricing-tiers", payload);
      } else if (moduleKey === "email-templates") {
        await request("post", "/email-templates", payload);
      } else if (moduleKey === "users") {
        await request("post", "/platform-users", payload);
      } else if (moduleKey === "roles") {
        await request("post", "/platform-roles", payload);
      } else if (moduleKey === "notifications") {
        actionResult = asObject(await request("post", "/notifications", payload));
      } else {
        throw new Error("Creating records is not supported for this module.");
      }
      setShowForm(false);
      setForm({});
      const successMessage = moduleKey === "users"
        ? editing ? "Super Admin user updated successfully." : "Super Admin user created successfully."
        : editing ? "Role updated successfully." : "Role created successfully.";
      const emailFailed = actionResult?.email_sent === false;
      const subscriptionEmailFailure = moduleKey === "subscriptions" && !editing && emailFailed;
      const responseMessage = String(actionResult?.response_message || "");
      setNotice(moduleKey === "subscriptions" && !editing
        ? subscriptionEmailFailure ? "" : responseMessage || "Payment link emailed."
        : emailFailed
        ? String(actionResult?.response_message || "Notification saved, but email delivery failed. Check SMTP configuration.")
        : moduleKey === "notifications" && actionResult?.email_sent === true
          ? "Notification saved and email sent."
          : moduleKey === "roles" ? "" : editing ? "Changes saved." : "Record created.");
      await load();
      if (subscriptionEmailFailure) {
        setError(responseMessage || "Payment link was created, but its email could not be sent. Resend it after checking SMTP settings.");
      }
      if (moduleKey === "roles" || moduleKey === "users") {
        await showSuccessAlert("Success!", successMessage);
      }
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
      if (moduleKey === "organizations" || moduleKey === "domains") {
        if (action === "status") {
          const status = currentStatus === "active" ? "suspended" : "active";
          await request("patch", `/super-admin/tenants/${id}/status`, { status });
        } else if (action === "delete") {
          const confirmation = await showConfirmDialog(
            "Delete Organization?",
            `Delete organization "${String(record.name || `Tenant ${id}`)}"? All users, data, and subscriptions will be permanently deleted.`
          );
          if (!confirmation.isConfirmed) return;
          await request("delete", `/super-admin/tenants/${id}`);
          setNotice("Organization deleted successfully.");
        }
      } else if (moduleKey === "users" && action === "delete") {
        if (String(id) === String(admin?.id)) {
          setError("You cannot delete the Super Admin account you are currently using.");
          return;
        }
        const confirmation = await showConfirmDialog(
          "Delete Super Admin user?",
          `Delete ${String(record.name || record.email || "this user")}? This action cannot be undone.`
        );
        if (!confirmation.isConfirmed) return;
        await request("delete", `/platform-users/${id}`);
        setNotice("Super Admin user deleted successfully.");
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
      } else if (moduleKey === "roles" && action === "delete") {
        await request("delete", `/platform-roles/${id}`);
      }
      setNotice("Action completed.");
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const impersonateTenant = async (record: RecordValue) => {
    try {
      const res = await request("post", `/super-admin/tenants/${record.id}/impersonate`);
      const payload = res as any;
      if (payload?.redirectUrl) {
        window.open(payload.redirectUrl, "_blank");
        await showSuccessAlert("Impersonating", `Redirecting to ${record.name} workspace...`);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const impersonateUser = async (record: RecordValue) => {
    try {
      const res = await request("post", `/super-admin/users/${record.id}/impersonate`);
      const payload = res as any;
      if (payload?.token) {
        await showSuccessAlert("Token Generated", `Impersonation token ready for ${record.name || record.email}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const updateExpiry = async (record: RecordValue) => {
    const { value: date } = await Swal.fire({
      title: "Update Subscription Expiry",
      input: "date",
      inputLabel: `Enter new expiry date for ${record.name}`,
      inputValue: record.ends_at ? String(record.ends_at).substring(0, 10) : new Date().toISOString().substring(0, 10),
      showCancelButton: true,
      confirmButtonText: "Update Expiry",
      confirmButtonColor: "#4f46e5",
    });
    if (date) {
      try {
        await request("patch", `/super-admin/tenants/${record.id}/expiry`, { expiry_date: date });
        await showSuccessAlert("Updated", `Expiry date updated for ${record.name}.`);
        await load();
      } catch (err) {
        setError(errorMessage(err));
      }
    }
  };

  const activateDemoTrial = async () => {
    if (!trialDemo?.id) return;
    try {
      setSaving(true);
      setError("");
      const result = asObject(await request("post", `/demo-requests/${trialDemo.id}/activate-trial`, {
        trial_days: Number(trialDays),
        admin_password: trialPassword,
        pricing_tier_id: trialPlanId ? Number(trialPlanId) : null,
      }));
      setTrialDemo(null);
      setTrialPassword("");
      setNotice(String(result?.response_message || (result?.email_sent === false
        ? "Trial activated, but credentials email failed. Check SMTP settings."
        : "Trial activated and credentials email sent.")));
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const sendPaymentLink = async (record: RecordValue) => {
    try {
      setError("");
      setNotice("");
      const result = asObject(await request("post", `/tenants/${record.tenant_id}/subscriptions/${record.id}/payment-link`));
      await load();
      const responseMessage = String(result?.response_message || "Payment link email request completed.");
      if (result?.email_sent === false) setError(responseMessage);
      else setNotice(responseMessage);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const saveAccess = async () => {
    if (!roleId) return;
    try {
      setSaving(true);
      const permissions = selectedPermissions.filter((permission) => ALL_PLATFORM_PERMISSION_KEYS.includes(permission));
      const isAll = ALL_PLATFORM_PERMISSION_KEYS.every((permission) => permissions.includes(permission));
      await request("patch", `/platform-roles/${roleId}`, {
        permission_type: isAll ? "all" : "custom",
        permissions,
      });
      setRecords((current) => current.map((role) => String(role.id) === roleId
        ? { ...role, permission_type: isAll ? "all" : "custom", permissions }
        : role));
      setSelectedPermissions(permissions);
      setSavedPermissions(permissions);
      setNotice("Platform role access updated.");
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((current) => current.includes(permission)
      ? current.filter((value) => value !== permission)
      : [...current, permission]);
  };

  const toggleModulePermissions = (module: typeof MATRIX_MODULES[number]) => {
    const keys = [module.viewKey, module.addKey, module.updateKey, module.deleteKey];
    const hasAll = keys.every((key) => selectedPermissions.includes(key));
    setSelectedPermissions((current) => hasAll
      ? current.filter((key) => !keys.includes(key))
      : Array.from(new Set([...current, ...keys])));
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
    if (moduleKey !== "access-management" || !roleId) {
      setSelectedPermissions([]);
      setSavedPermissions([]);
      return;
    }
    const role = records.find((item) => String(item.id) === roleId);
    const storedPermissions = role?.permission_type === "all"
      ? [...ALL_PLATFORM_PERMISSION_KEYS]
      : Array.isArray(role?.permissions)
        ? role.permissions.filter((permission): permission is string =>
            typeof permission === "string" && ALL_PLATFORM_PERMISSION_KEYS.includes(permission))
        : role?.permissions && typeof role.permissions === "object"
          ? Object.entries(role.permissions)
              .filter(([permission, enabled]) => enabled === true && ALL_PLATFORM_PERMISSION_KEYS.includes(permission))
              .map(([permission]) => permission)
          : [];
    setSelectedPermissions(storedPermissions);
    setSavedPermissions(storedPermissions);
  }, [moduleKey, records, roleId]);

  const visibleColumns = useMemo(() => {
    if (moduleKey === "organizations") return ["name", "slug", "plan", "status", "email", "created_at"];
    if (moduleKey === "users") return ["name", "email", "role_name", "status", "created_at"];
    if (moduleKey === "roles") return ["id", "name", "description", "parent_role_name", "permission_type", "created_at"];
    if (moduleKey === "subscriptions") return ["tenant_name", "tier_name", "status", "payment_status", "starts_at", "ends_at", "amount_cents", "currency"];
    if (moduleKey === "demos") return [
      "name",
      "email",
      "organization",
      "city",
      "state",
      "preferred_demo_date",
      "preferred_demo_time",
      "status",
      "trial_tenant_id",
      "trial_subdomain",
      "created_at",
    ];
    const first = records.find((item) => Object.keys(item).length > 0);
    return first
      ? Object.keys(first)
          .filter((key) => !SECRET_KEY.test(key) && !(moduleKey === "roles" && key === "permissions"))
          .slice(0, 6)
      : [];
  }, [moduleKey, records]);
  const displayedRecords = moduleKey === "subscriptions" && tenantId
    ? records.filter((record) => String(record.tenant_id) === tenantId)
    : records;

  const createLabel = moduleKey === "organizations"
    ? "Create Organization"
    : moduleKey === "users"
    ? "Add User"
    : moduleKey === "payments"
      ? "Create manual payment"
      : moduleKey === "subscriptions"
        ? "Send payment link"
      : moduleKey === "smtp"
        ? "Edit SMTP settings"
        : "Add record";
  const userDetails: Array<[string, unknown]> = viewing
    ? moduleKey === "organizations"
      ? [
          ["Name", viewing.name],
          ["Subdomain Slug", viewing.slug],
          ["Plan", viewing.plan],
          ["Status", viewing.status],
          ["Admin Email", viewing.email || viewing.admin_email],
          ["Phone", viewing.phone],
          ["Registration No", viewing.registration_no],
          ["Created at", viewing.created_at],
          ["Updated at", viewing.updated_at],
        ]
      : [
          ["Name", viewing.name],
          ["Email", viewing.email],
          ["Role", viewing.role_name],
          ["Status", viewing.status],
          ["Created at", viewing.created_at],
          ["Updated at", viewing.updated_at],
        ]
    : [];
  const canCreate = Boolean(fields.length) && !["demos"].includes(moduleKey) && hasPermission("create") &&
    (moduleKey !== "subscriptions" || admin?.permissions?.includes("platform.payments.create"));

  return (
    <section className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      {moduleKey !== "smtp" && <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Super Admin Console</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">Manage platform {title.toLowerCase()}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {scoped && (
            <label className="text-xs text-slate-400">
              {moduleKey === "subscriptions" ? "Filter by tenant" : "Tenant"}
              <select value={tenantId} onChange={(event) => { setTenantId(event.target.value); setRoleId(""); }} className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                <option value="">{moduleKey === "subscriptions" ? "All tenants (default)" : "Select a tenant"}</option>
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
          {moduleKey !== "smtp" && <button type="button" onClick={() => void load()} className="self-end rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">Refresh</button>}
          {moduleKey !== "smtp" && canCreate && (!scoped || tenantId) && (
            <button type="button" onClick={beginCreate} className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{createLabel}</button>
          )}
          {moduleKey === "notifications" && records.length > 0 && (
            <button type="button" onClick={async () => { try { await request("delete", "/notifications"); await load(); setNotice("All notifications deleted."); } catch (e) { setError(errorMessage(e)); } }} className="self-end rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">Clear all</button>
          )}
        </div>
      </header>}

      {moduleKey === "subscriptions" && <div className="mb-5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4 text-sm text-indigo-200">Choose an organization and plan to create a pending subscription. The customer pays through a hosted Razorpay link emailed to its administrator; access activates only after Razorpay confirms payment.</div>}
      {moduleKey === "smtp" && smtpTestResult && <div role={smtpTestResult.success ? "status" : "alert"} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${smtpTestResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{smtpTestResult.message}</div>}
      {moduleKey === "domains" && paymentLinkTenant && (
        <PaymentLinkDialog
          tenantId={Number(paymentLinkTenant.id)}
          tenantName={String(paymentLinkTenant.name || `Organization ${paymentLinkTenant.id}`)}
          currentPlan={typeof paymentLinkTenant.plan === "string" ? paymentLinkTenant.plan : null}
          onClose={() => setPaymentLinkTenant(null)}
          onComplete={() => { void load(); }}
        />
      )}
      {moduleKey === "demos" && <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">Demo requests are listed here. New requests are collected by the public intake form, not this authenticated screen.</div>}
      {trialDemo && moduleKey === "demos" && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-slate-900 p-4 sm:p-5">
          <h2 className="font-semibold text-white">Activate trial for {String(trialDemo.company || trialDemo.name)}</h2>
          <p className="mt-1 text-sm text-slate-400">This provisions an organization, assigns its trial plan, and emails login details if SMTP is configured.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-medium text-slate-300">Trial plan
              <select value={trialPlanId} onChange={(event) => {
                const id = event.target.value;
                setTrialPlanId(id);
                const plan = planOptions.find((item) => String(item.id) === id);
                if (plan?.trial_days) setTrialDays(String(plan.trial_days));
              }} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                <option value="">No plan / trial only</option>
                {planOptions.map((plan) => <option key={String(plan.id)} value={String(plan.id)}>{String(plan.name)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-300">Trial duration (days)
              <input type="number" min="1" max="365" required value={trialDays} onChange={(event) => setTrialDays(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </label>
            <label className="text-xs font-medium text-slate-300">Temporary admin password
              <input type="password" minLength={8} maxLength={50} required value={trialPassword} onChange={(event) => setTrialPassword(event.target.value)} autoComplete="new-password" className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setTrialDemo(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button type="button" disabled={saving || !trialPassword || Number(trialDays) < 1} onClick={() => void activateDemoTrial()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Activating…" : "Activate trial and email access"}</button>
          </div>
        </div>
      )}
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

      {viewing && moduleKey === "users" && (
        <section className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5" aria-labelledby="user-details-heading">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Super Admin User</p>
              <h2 id="user-details-heading" className="mt-1 text-lg font-semibold text-white">User details</h2>
            </div>
            <button type="button" onClick={() => setViewing(null)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Back to users</button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userDetails.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="mt-1 break-words text-sm text-slate-200">{displayValue(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => beginEdit(viewing)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Edit user</button>
          </div>
        </section>
      )}

      {showForm && (
        <form onSubmit={(event) => void submitForm(event)} className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">{editing ? "Edit record" : createLabel}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((field) =>
              !(moduleKey === "payments" && tenantId && field.name === "tenant_id") &&
              !(moduleKey === "subscriptions" && editing && field.name === "trial_days") &&
              !(moduleKey === "subscriptions" && !editing && field.name !== "pricing_tier_id")
            ).map((field) => (
              <label key={field.name} className={`text-xs font-medium text-slate-300 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                {field.label}
                {field.secret && <span className="ml-1 font-normal text-slate-500">(never shown after saving)</span>}
                {field.name === "tenant_id" && moduleKey === "payments" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">Select a tenant</option>
                    {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
                  </select>
                ) : field.name === "parent_role_id" && moduleKey === "roles" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    {records
                      .filter((role) => !editing || String(role.id) !== String(editing.id))
                      .map((role) => <option key={String(role.id)} value={String(role.id)}>{`${"— ".repeat(Number(role.hierarchy_depth) || 0)}${String(role.name || `Role ${role.id}`)}`}</option>)}
                  </select>
                ) : field.name === "platform_role_id" && moduleKey === "users" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">Select a platform role</option>
                    {platformRoles.map((role) => <option key={String(role.id)} value={String(role.id)}>{`${"— ".repeat(Number(role.hierarchy_depth) || 0)}${String(role.name)}`}</option>)}
                  </select>
                ) : field.name === "pricing_tier_id" && moduleKey === "subscriptions" ? (
                  <select value={form[field.name] || ""} onChange={(event) => {
                    const pricingTierId = event.target.value;
                    setForm((current) => ({ ...current, [field.name]: pricingTierId }));
                  }} required={!editing || field.required} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">{editing ? "No plan / trial only" : "Select a plan"}</option>
                    {planOptions.map((plan) => <option key={String(plan.id)} value={String(plan.id)}>{String(plan.name)} — {String(plan.currency)} {Number(plan.amount_cents || 0) / 100} / {String(plan.billing_interval)}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required && !(moduleKey === "users" && editing && field.name === "password")} rows={5} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                ) : field.type === "select" ? (
                  <select value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                    <option value="">Select…</option>{field.options?.filter((option) =>
                      !(moduleKey === "subscriptions" && field.name === "status" && option === "active" && editing?.status !== "active")
                    ).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input type={field.secret ? "password" : field.type || "text"} value={form[field.name] || ""} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} required={field.required && !(moduleKey === "users" && editing && field.name === "password")} min={field.type === "number" ? 0 : undefined} autoComplete={field.secret ? "new-password" : undefined} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                )}
              </label>
            ))}
            {moduleKey === "users" && editing && <p className="text-xs text-slate-400 sm:col-span-2">Leave Password blank to keep the current password.</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      {moduleKey === "access-management" && !loading && (
        <section className="mb-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="font-semibold text-white">Role Access Management</h2>
              <p className="mt-1 text-xs text-slate-400">Configure access for all {PLATFORM_MATRIX_MODULES.length} Super Admin modules.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="access-role" className="text-sm text-slate-300">Select role</label>
              <select id="access-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} disabled={records.length === 0} className="min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50">
                {records.length === 0 && <option value="">No accessible roles</option>}
                {records.map((role) => <option key={String(role.id)} value={String(role.id)}>{String(role.name || `Role ${role.id}`)}</option>)}
              </select>
              <button type="button" disabled={!canEditSelectedRole} onClick={() => setSelectedPermissions([...ALL_PLATFORM_PERMISSION_KEYS])} className="rounded-lg border border-indigo-500/40 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/10 disabled:opacity-50">Grant all</button>
              <button type="button" disabled={!canEditSelectedRole} onClick={() => setSelectedPermissions(Array.from(new Set(PLATFORM_MATRIX_MODULES.map((module) => module.viewKey))))} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Read only</button>
              <button type="button" disabled={!canEditSelectedRole} onClick={() => setSelectedPermissions([])} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50">Clear all</button>
            </div>
          </div>
          {records.length === 0 && <p role="status" className="border-b border-slate-800 px-5 py-3 text-sm text-amber-200">No platform roles are available in your role hierarchy. The module list is shown below, but permission changes require an accessible role.</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              {selectedPermissions.length} permission{selectedPermissions.length === 1 ? "" : "s"} selected
              {JSON.stringify([...selectedPermissions].sort()) !== JSON.stringify([...savedPermissions].sort()) && <span className="ml-2 font-semibold text-amber-300">Unsaved changes</span>}
            </p>
            <button type="button" disabled={saving || !roleId || !canEditSelectedRole} onClick={() => void saveAccess()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save permissions"}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Module</th>
                  <th className="px-3 py-3 text-center">View</th>
                  <th className="px-3 py-3 text-center">Add</th>
                  <th className="px-3 py-3 text-center">Update</th>
                  <th className="px-3 py-3 text-center">Delete</th>
                  <th className="px-5 py-3 text-center">All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {PLATFORM_MATRIX_MODULES.map((module) => {
                  const keys = [module.viewKey, module.addKey, module.updateKey, module.deleteKey];
                  const allSelected = keys.every((key) => selectedPermissions.includes(key));
                  return (
                    <tr key={module.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-100">{module.name}</div>
                        <div className="text-xs text-slate-500">{module.slug}</div>
                      </td>
                      {keys.map((key, index) => (
                        <td key={key} className="px-3 py-3 text-center">
                          <input type="checkbox" checked={selectedPermissions.includes(key)} disabled={!canEditSelectedRole} onChange={() => togglePermission(key)} aria-label={`${module.name} ${["view", "add", "update", "delete"][index]}`} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50" />
                        </td>
                      ))}
                      <td className="px-5 py-3 text-center">
                        <input type="checkbox" checked={allSelected} disabled={!canEditSelectedRole} onChange={() => toggleModulePermissions(module)} aria-label={`${module.name} all permissions`} className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">Changes apply to this global Super Admin role and are saved when you select “Save permissions.”</p>
        </section>
      )}

      {moduleKey === "smtp" && !loading && records.length > 0 && (
        <form onSubmit={(event) => void submitForm(event)} className="smtp-settings-card mb-6 max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail aria-hidden="true" size={19} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Mail server settings</h2>
                <p className="mt-1 text-sm text-slate-500">Use these credentials for Super Admin outbound emails and notifications.</p>
              </div>
            </div>
          </div>
          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              {([
                ["host", "Host", "smtp.gmail.com", "text"],
                ["port", "Port", "587", "number"],
                ["username", "Username", "mail@example.com", "text"],
                ["password", "Password", form.password_configured === "true" ? "Saved password is configured" : "Enter SMTP password", "password"],
                ["from_name", "From Name", "MORSE CRM", "text"],
                ["from_email", "From Email", "mail@example.com", "email"],
              ] as const).map(([field, label, placeholder, type]) => (
                <label key={field} className="block text-sm font-medium text-slate-700">
                  {label}
                  <input
                    type={type}
                    inputMode={type === "number" ? "numeric" : undefined}
                    value={form[field] || ""}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={placeholder}
                    required={field !== "password"}
                    min={type === "number" ? 1 : undefined}
                    disabled={!hasPermission("edit")}
                    className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              ))}
            </div>

            {([
              {
                key: "secure",
                title: "Secure (TLS / SSL)",
                description: "Use an encrypted connection when connecting to the mail server.",
              },
              {
                key: "delivery_enabled",
                title: "Enable Email Delivery",
                description: "Turn this on to send real emails from Super Admin workflows.",
              },
            ] as const).map(({ key, title: settingTitle, description }) => {
              const checked = form[key] === "true";
              return (
                <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{settingTitle}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={settingTitle}
                    disabled={!hasPermission("edit")}
                    onClick={() => setForm((current) => ({ ...current, [key]: checked ? "false" : "true" }))}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${checked ? "bg-blue-600" : "bg-slate-300"}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              );
            })}

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">
                {form.password_configured === "true"
                  ? "Leave Password blank to keep the saved credential."
                  : "SMTP credentials are encrypted before they are stored."}
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" disabled={testingSmtp} onClick={() => void testSmtp()} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {testingSmtp ? "Testing…" : "Test SMTP"}
                </button>
                {hasPermission("edit") && <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving…" : "Save SMTP Configuration"}
                </button>}
              </div>
            </div>
          </div>
        </form>
      )}

      {moduleKey === "smtp" && loading && (
        <p role="status" className="max-w-5xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading mail server settings…</p>
      )}

      {moduleKey !== "smtp" && moduleKey !== "access-management" && !showForm && !viewing && <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
        {loading ? (
          <div role="status" className="space-y-3 p-5"><div className="h-4 w-40 animate-pulse rounded bg-slate-800" /><div className="h-10 animate-pulse rounded bg-slate-800/70" /><div className="h-10 animate-pulse rounded bg-slate-800/70" /><span className="sr-only">Loading {title.toLowerCase()}…</span></div>
        ) : scoped && !tenantId ? (
          <div className="p-10 text-center"><h2 className="font-semibold text-white">Select a tenant</h2><p className="mt-1 text-sm text-slate-400">Choose a tenant above to load its {title.toLowerCase()}.</p></div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Inbox aria-hidden="true" size={21} /></div><h2 className="mt-3 font-semibold text-white">{error ? "Unable to load records" : "Nothing here yet"}</h2><p className="mt-1 text-sm text-slate-400">{error ? "Check the error above and retry." : `No ${title.toLowerCase()} were found.`}</p></div>
        ) : moduleKey === "pricing" ? (
          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6 2xl:grid-cols-3">
            {records.map((record, index) => {
              const features = Array.isArray(record.features) ? record.features : [];
              const interval = record.billing_interval === "yearly"
                ? "per year"
                : record.billing_interval === "monthly"
                  ? "per month"
                  : "one-time";
              return (
                <article
                  key={String(record.id ?? index)}
                  className={`flex min-w-0 flex-col rounded-2xl border bg-white p-6 text-slate-900 shadow-sm ${
                    records.length === 3 && index === 1
                      ? "border-indigo-300 shadow-indigo-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
                        {displayValue(record.name)}
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{displayValue(record.name)}</h2>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      record.active === true
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {record.active === true ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <strong className="text-3xl font-bold tracking-tight text-slate-900">
                      {formatTierPrice(record)}
                    </strong>
                    <span className="text-sm text-slate-500">/{interval}</span>
                  </div>
                  <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">
                    {displayValue(record.description)}
                  </p>
                  <ul className="mt-5 grid gap-3">
                    {features.map((feature, featureIndex) => (
                      <li key={`${String(record.id)}-${featureIndex}`} className="flex gap-2.5 text-sm text-slate-700">
                        <Check className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" size={17} />
                        <span>{displayValue(feature)}</span>
                      </li>
                    ))}
                    {features.length === 0 && (
                      <li className="text-sm text-slate-500">No features listed.</li>
                    )}
                  </ul>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <span className="text-xs text-slate-500">
                      {displayValue(record.trial_days)}-day trial
                    </span>
                    <div className="flex gap-2">
                      {canEditRecord(record) && (
                        <button
                          type="button"
                          onClick={() => beginEdit(record)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteRecord(record) && (
                        <button
                          type="button"
                          onClick={() => void performAction("delete", record)}
                          className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase tracking-wide text-slate-500"><tr>{visibleColumns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column.replace(/_/g, " ")}</th>)}<th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {displayedRecords.map((record, index) => (
                    <tr key={String(record.id ?? index)} className="hover:bg-slate-800/30">
                      {visibleColumns.map((column) => (
                        <td key={column} className="max-w-xs px-4 py-3 text-slate-300">
                          <span className="block truncate">
                            {moduleKey === "demos" && column === "preferred_demo_date"
                              ? displayDateOnly(record[column])
                              : moduleKey === "roles" && column === "name"
                              ? `${"— ".repeat(Number(record.hierarchy_depth) || 0)}${displayValue(record[column])}`
                              : displayValue(record[column])}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {moduleKey === "organizations" && <>
                            <button type="button" aria-label="View organization" title="View organization" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                            <button type="button" aria-label="Impersonate organization" title="Impersonate organization admin" onClick={() => void impersonateTenant(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                            <button type="button" aria-label="Update expiry" title="Update subscription expiry date" onClick={() => void updateExpiry(record)} className="super-admin-action-icon text-amber-400 hover:text-amber-300"><Calendar aria-hidden="true" size={16} /></button>
                            {admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => setPaymentLinkTenant(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                            {hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} title={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                            {canEditRecord(record) && <button type="button" aria-label="Edit organization" title="Edit organization" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                            {hasPermission("delete") && <button type="button" aria-label="Delete organization" title="Delete organization" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                          </>}
                          {moduleKey === "users" && <>
                            <button type="button" aria-label="View user" title="View user" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                            <button type="button" aria-label="Impersonate user" title="Impersonate user" onClick={() => void impersonateUser(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                            {canEditRecord(record) && <button type="button" aria-label="Edit user" title="Edit user" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                            {canDeleteRecord(record) && <button type="button" aria-label="Delete user" title="Delete user" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                          </>}
                          {moduleKey === "domains" && hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} title={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                          {moduleKey === "domains" && admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => setPaymentLinkTenant(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                          {moduleKey === "demos" && hasPermission("edit") && !record.trial_tenant_id && <button type="button" aria-label="Activate trial" title="Activate trial" onClick={() => { setTrialDemo(record); setTrialDays("14"); setTrialPassword(""); setTrialPlanId(""); }} className="super-admin-action-icon super-admin-action-icon-warning"><Zap aria-hidden="true" size={17} /></button>}
                          {moduleKey === "demos" && hasPermission("edit") && <button type="button" aria-label="Advance status" title="Advance status" onClick={() => void performAction("status", record)} className="super-admin-action-icon"><RefreshCw aria-hidden="true" size={16} /></button>}
                          {moduleKey === "subscriptions" && record.status === "pending" && typeof record.provider_payment_link_url === "string" && admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Resend payment link" title="Resend payment link" onClick={() => void sendPaymentLink(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                          {["roles", "pricing", "subscriptions", "email-templates", "smtp"].includes(moduleKey) && fields.length > 0 && canEditRecord(record) && <button type="button" aria-label={`Edit ${title.toLowerCase()}`} title={`Edit ${title.toLowerCase()}`} onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                          {moduleKey === "notifications" && <>
                            {hasPermission("edit") && <button type="button" aria-label={record.is_read === true ? "Mark unread" : "Mark read"} title={record.is_read === true ? "Mark unread" : "Mark read"} onClick={() => void performAction("read", record)} className="super-admin-action-icon">{record.is_read === true ? <Mail aria-hidden="true" size={17} /> : <MailOpen aria-hidden="true" size={17} />}</button>}
                            {hasPermission("delete") && <button type="button" aria-label="Delete notification" title="Delete notification" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                          </>}
                          {(moduleKey === "email-templates" || moduleKey === "pricing" || moduleKey === "roles") && canDeleteRecord(record) && <button type="button" aria-label={`Delete ${title.toLowerCase()}`} title={`Delete ${title.toLowerCase()}`} onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-800 md:hidden">
              {displayedRecords.map((record, index) => (
                <article key={String(record.id ?? index)} className="p-4">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {visibleColumns.map((column) => (
                      <div key={column} className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">{column.replace(/_/g, " ")}</p>
                        <p className="truncate text-sm text-slate-200">
                          {moduleKey === "demos" && column === "preferred_demo_date"
                            ? displayDateOnly(record[column])
                            : moduleKey === "roles" && column === "name"
                            ? `${"— ".repeat(Number(record.hierarchy_depth) || 0)}${displayValue(record[column])}`
                            : displayValue(record[column])}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moduleKey === "organizations" && <>
                    <button type="button" aria-label="View organization" title="View organization" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                    <button type="button" aria-label="Impersonate organization" title="Impersonate organization admin" onClick={() => void impersonateTenant(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                    <button type="button" aria-label="Update expiry" title="Update subscription expiry date" onClick={() => void updateExpiry(record)} className="super-admin-action-icon text-amber-400 hover:text-amber-300"><Calendar aria-hidden="true" size={16} /></button>
                    {admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => setPaymentLinkTenant(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                    {hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} title={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                    {canEditRecord(record) && <button type="button" aria-label="Edit organization" title="Edit organization" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                    {hasPermission("delete") && <button type="button" aria-label="Delete organization" title="Delete organization" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                    </>}
                    {moduleKey === "users" && <>
                    <button type="button" aria-label="View user" title="View user" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                    <button type="button" aria-label="Impersonate user" title="Impersonate user" onClick={() => void impersonateUser(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                    {canEditRecord(record) && <button type="button" aria-label="Edit user" title="Edit user" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                    {canDeleteRecord(record) && <button type="button" aria-label="Delete user" title="Delete user" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                    </>}
                    {moduleKey === "domains" && hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} title={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                    {moduleKey === "domains" && admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => setPaymentLinkTenant(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                    {moduleKey === "demos" && hasPermission("edit") && !record.trial_tenant_id && <button type="button" aria-label="Activate trial" title="Activate trial" onClick={() => { setTrialDemo(record); setTrialDays("14"); setTrialPassword(""); setTrialPlanId(""); }} className="super-admin-action-icon super-admin-action-icon-warning"><Zap aria-hidden="true" size={17} /></button>}
                    {moduleKey === "demos" && hasPermission("edit") && <button type="button" aria-label="Advance status" title="Advance status" onClick={() => void performAction("status", record)} className="super-admin-action-icon"><RefreshCw aria-hidden="true" size={16} /></button>}
                    {moduleKey === "subscriptions" && record.status === "pending" && typeof record.provider_payment_link_url === "string" && admin?.permissions?.includes("platform.payments.create") && <button type="button" aria-label="Resend payment link" title="Resend payment link" onClick={() => void sendPaymentLink(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                    {["roles", "pricing", "subscriptions", "email-templates", "smtp"].includes(moduleKey) && fields.length > 0 && canEditRecord(record) && <button type="button" aria-label={`Edit ${title.toLowerCase()}`} title={`Edit ${title.toLowerCase()}`} onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                    {moduleKey === "notifications" && <>
                    {hasPermission("edit") && <button type="button" aria-label={record.is_read === true ? "Mark unread" : "Mark read"} title={record.is_read === true ? "Mark unread" : "Mark read"} onClick={() => void performAction("read", record)} className="super-admin-action-icon">{record.is_read === true ? <Mail aria-hidden="true" size={17} /> : <MailOpen aria-hidden="true" size={17} />}</button>}
                    {hasPermission("delete") && <button type="button" aria-label="Delete notification" title="Delete notification" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                    </>}
                    {(moduleKey === "email-templates" || moduleKey === "pricing" || moduleKey === "roles") && canDeleteRecord(record) && <button type="button" aria-label={`Delete ${title.toLowerCase()}`} title={`Delete ${title.toLowerCase()}`} onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>}
      {moduleKey === "domains" && <p className="mt-3 text-xs text-slate-500">Domain management uses the platform tenant directory. Domain values are shown only when provided by the API.</p>}
    </section>
  );
};

export default SuperAdminModulePage;
