import { Link, useSearchParams } from "react-router-dom";
import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API } from "@/config";
import adminApi from "@/lib/adminApi";
import { getSuperAdminToken } from "@/lib/auth-utils";
import { useSuperAdminStore } from "@/store/superAdminStore";
import { MATRIX_MODULES } from "@/constants/matrixModules";
import { showConfirmDialog, showSuccessAlert } from "@/utils/swalAlert";
import PaymentLinkDialog from "@/pages/SuperAdmin/PaymentLinkDialog";
import { buildTenantUrl } from "@/utils/subdomain";
import { PaginationControls } from "@/components/PaginationControls";
import Swal from "sweetalert2";
import { calculateProratedUpgrade } from "@/helpers/proratedUpgrade";
import {
  ArrowLeft,
  Calendar,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  Mail,
  MailOpen,
  Pencil,
  Power,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
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
      { name: "phone", label: "Phone number", type: "text", required: true },
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

const isDateColumn = (column?: string): boolean => {
  if (!column) return false;
  const col = column.toLowerCase().trim();
  if (col.endsWith("_time") || col.includes("time_")) return false;
  return (
    col.endsWith("_at") ||
    col.endsWith("_date") ||
    col === "date" ||
    col.startsWith("created") ||
    col.startsWith("updated") ||
    col.startsWith("starts") ||
    col.startsWith("ends") ||
    col.startsWith("expires") ||
    col.startsWith("expiry") ||
    col === "preferred_demo_date" ||
    col === "latest_payment_date" ||
    col === "billing_start_date" ||
    col === "billing_end_date"
  );
};

const isDateString = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(trimmed);
};

const displayDateOnly = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? "—"
      : value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  const str = String(value).trim();
  if (!str) return "—";
  const pureDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (pureDateMatch) {
    const [, y, m, d] = pureDateMatch;
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  const date = new Date(str);
  return isNaN(date.getTime())
    ? str
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const displayValue = (value: unknown, column?: string): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (isDateColumn(column) || isDateString(value)) {
    return displayDateOnly(value);
  }
  return String(value);
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
  const trimmed = value.trim();
  const isFeatures = field.toLowerCase().includes("feature");
  const isLimits = field.toLowerCase().includes("limit");
  if (!trimmed) {
    return isFeatures ? [] : isLimits ? {} : null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    if (isFeatures) {
      return trimmed
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
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
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(() => searchParams.get("org_id") || searchParams.get("tenant_id") || "");
  const [roleId, setRoleId] = useState("");
  const [editing, setEditing] = useState<RecordValue | null>(null);
  const [viewing, setViewing] = useState<RecordValue | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  }, [moduleKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tenantId]);

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
      if (moduleKey === "subscriptions") path = tenantId ? `/subscriptions?tenant_id=${tenantId}` : "/subscriptions";
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
      console.error("Save record error:", requestError);
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
      : moduleKey === "roles"
        ? {
            parent_role_id: admin?.platform_role_id
              ? String(admin.platform_role_id)
              : records[0]?.id
                ? String(records[0].id)
                : "",
            permission_type: "custom",
          }
      : moduleKey === "pricing"
        ? {
            currency: "INR",
            billing_interval: "yearly",
            trial_days: "14",
            features: "[]",
            limits: "{}",
            active: "true",
          }
        : {});
    setFieldErrors({});
    setShowPasswordMap({});
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
    setFieldErrors({});
    setShowPasswordMap({});
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

  const validateSingleField = (name: string, rawVal: string): string => {
    const val = rawVal.trim();
    if (["admin_name", "from_name"].includes(name) || (name === "name" && moduleKey === "users")) {
      if (!val) return "Full name is required.";
      if (!/^[a-zA-Z\s.'-]+$/.test(val)) return "Full name must only contain letters and spaces (no special characters).";
      if (val.length < 2) return "Full name must be at least 2 characters.";
    }
    if (name === "email" || name.includes("email")) {
      if (!val) return "Email address is required.";
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
        return "Please enter a valid email address (e.g. user@example.com).";
      }
    }
    if (name.includes("phone") || name.includes("mobile") || name.includes("contact")) {
      if (!val || !val.trim()) {
        if (moduleKey === "users") return "Phone number is required.";
        return "";
      }
      const digits = val.replace(/\D/g, "");
      if (!digits) {
        if (moduleKey === "users") return "Phone number is required.";
        return "";
      }
      if (digits.startsWith("0") || /^0+$/.test(digits)) {
        return "Phone number cannot start with 0 or be all zeroes.";
      }
      if (!/^[6-9]/.test(digits)) {
        return "Phone number must start with 6, 7, 8, or 9.";
      }
      if (digits.length !== 10) {
        return "Phone number must be exactly 10 digits.";
      }
      if (/^(\d)\1{9}$/.test(digits)) {
        return "Phone number cannot contain all identical digits.";
      }
      if (!/^[6-9]\d{9}$/.test(digits)) {
        return "Phone number must be a valid 10-digit number starting with 6, 7, 8, or 9.";
      }
    }
    if (name === "password" || name === "admin_password") {
      if (!editing && !val) return "Password is required.";
      if (val && val.length < 8) return "Password must be at least 8 characters.";
    }
    if (name === "platform_role_id" && moduleKey === "users") {
      if (!val) return "Please select a platform role.";
    }
    if (name === "slug") {
      if (!val) return "Slug is required.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) {
        return "Slug must contain only lowercase letters, numbers, and single hyphens.";
      }
    }
    return "";
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;
    setError("");
    setNotice("");

    // Comprehensive client-side validation
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const isHidden =
        (moduleKey === "payments" && tenantId && field.name === "tenant_id") ||
        (moduleKey === "subscriptions" && editing && field.name === "trial_days") ||
        (moduleKey === "subscriptions" && !editing && field.name !== "pricing_tier_id");
      if (isHidden) continue;

      const val = form[field.name] || "";
      if (field.required && !(moduleKey === "users" && editing && field.name === "password")) {
        if (!val.trim()) {
          newErrors[field.name] = `${field.label} is required.`;
          continue;
        }
      }
      const err = validateSingleField(field.name, val);
      if (err) {
        newErrors[field.name] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      setError(firstError);
      return;
    }

    setSaving(true);
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
      if (moduleKey === "pricing") {
        if (!Array.isArray(payload.features)) payload.features = [];
        if (!payload.limits || typeof payload.limits !== "object" || Array.isArray(payload.limits)) payload.limits = {};
        if (!payload.billing_interval) payload.billing_interval = "yearly";
        if (payload.active === undefined) payload.active = true;
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
        const confirmSend = await Swal.fire({
          title: "Send Payment Link?",
          text: "Create and email a subscription payment link for the selected organization?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, Send Link",
          confirmButtonColor: "#059669",
          cancelButtonText: "Cancel",
        });
        if (!confirmSend.isConfirmed) {
          setSaving(false);
          return;
        }
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
      const roleObj = platformRoles.find((r) => String(r.id) === String(form.platform_role_id || editing?.platform_role_id));
      const roleName = roleObj?.name ? String(roleObj.name).trim() : (editing?.role_name ? String(editing.role_name).trim() : "User");
      const entityName = /user|admin/i.test(roleName) ? roleName : `${roleName} user`;
      const successMessage = moduleKey === "users"
        ? editing ? `${entityName} updated successfully.` : `${entityName} created successfully.`
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
      if (moduleKey === "subscriptions" && !editing) {
        if (subscriptionEmailFailure) {
          await Swal.fire({
            icon: "warning",
            title: "Payment Link Active ⚠️",
            text: responseMessage || "Payment link was created, but its email could not be sent. Check SMTP settings.",
            confirmButtonColor: "#4f46e5",
          });
        } else {
          await Swal.fire({
            icon: "success",
            title: "Payment Link Sent! ✉️",
            text: responseMessage || "Payment link emailed successfully.",
            confirmButtonColor: "#059669",
          });
        }
      } else if (moduleKey === "roles" || moduleKey === "users") {
        await showSuccessAlert("Success!", successMessage);
      }
    } catch (requestError) {
      console.error("Save record error:", requestError);
      const msg = errorMessage(requestError);
      setError(msg);
      void Swal.fire({ icon: "error", title: "Could not save record", text: msg });
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
          "Delete User?",
          `Delete ${String(record.name || record.email || "this user")}? This action cannot be undone.`
        );
        if (!confirmation.isConfirmed) return;
        await request("delete", `/platform-users/${id}`);
        setNotice("User deleted successfully.");
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
      console.error("Save record error:", requestError);
    }
  };

  const impersonateTenant = async (record: RecordValue) => {
    try {
      const res = await request("post", `/super-admin/tenants/${record.id}/impersonate`);
      const payload = res as any;
      const token = payload?.token;
      if (token) {
        const slug = payload.tenant?.slug || record.slug || "";
        let targetUrl = "/dashboard";
        if (slug) {
          const queryParams: Record<string, string> = {
            impersonate_token: token,
            token: token,
            org_name: String(payload.tenant?.name || record.name || ""),
            org_slug: String(slug),
            org_id: String(record.id),
            user: JSON.stringify(payload.user),
          };
          targetUrl = buildTenantUrl(String(slug), "/dashboard", queryParams);

          try {
            sessionStorage.setItem("active_tenant_slug", slug);
            localStorage.setItem("active_tenant_slug", slug);
            sessionStorage.setItem("active_tenant_id", String(record.id));
            localStorage.setItem("active_tenant_id", String(record.id));
            sessionStorage.removeItem("current_tenant_profile");
            localStorage.removeItem("current_tenant_profile");
          } catch {}
        }
        window.open(targetUrl, "_blank");
        await showSuccessAlert("Impersonating", `Logging into ${record.name} workspace...`);
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
    const isPaid = String(record.payment_status || "").toLowerCase() === "paid" || (String(record.status || "").toLowerCase() === "active" && !String(record.plan || "").toLowerCase().includes("trial"));
    if (isPaid) {
      await Swal.fire({
        icon: "info",
        title: "Active Paid Subscription",
        text: `"${record.name || 'Organization'}" is on an active paid plan. Manual trial adjustments are disabled for paid accounts. Use "Change plan" or the payment portal to modify subscriptions.`,
        confirmButtonColor: "#4f46e5",
      });
      return;
    }
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

  const handleUpdateTrial = async (record: RecordValue) => {
    const orgName = String(record.tenant_name || record.name || "Organization");
    const tenantId = Number(record.tenant_id || record.id);
    const currentExpiry = record.ends_at ? String(record.ends_at).substring(0, 10) : "";

    const { value: selectedDate } = await Swal.fire({
      title: `Update Trial Period`,
      html: `
        <div class="text-left text-xs space-y-3.5 text-slate-700 dark:text-slate-300">
          <p>Extend or adjust the active trial period for <strong>${orgName}</strong>.</p>
          <div>
            <label class="block font-semibold mb-1 text-slate-600 dark:text-slate-300 uppercase tracking-wide">Quick Extend Presets:</label>
            <div class="flex flex-wrap gap-1.5" id="swal-trial-btn-container">
              <button type="button" class="swal-trial-btn text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold cursor-pointer" data-days="7">+7 Days</button>
              <button type="button" class="swal-trial-btn text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold cursor-pointer" data-days="14">+14 Days</button>
              <button type="button" class="swal-trial-btn text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold cursor-pointer" data-days="30">+30 Days</button>
              <button type="button" class="swal-trial-btn text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 font-semibold cursor-pointer" data-days="60">+60 Days</button>
            </div>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-600 dark:text-slate-300 uppercase tracking-wide">Trial End Date:</label>
            <input id="swal-trial-expiry" type="date" class="swal2-input !mt-0 !w-full !text-xs !h-9 !py-1 !px-3" value="${currentExpiry || new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10)}" />
          </div>
        </div>
      `,
      didOpen: () => {
        const dateInput = document.getElementById("swal-trial-expiry") as HTMLInputElement;
        const btns = document.querySelectorAll(".swal-trial-btn");
        btns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const days = Number(btn.getAttribute("data-days") || 14);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            if (dateInput) {
              dateInput.value = targetDate.toISOString().substring(0, 10);
            }
          });
        });
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update Trial Period ⏱️",
      confirmButtonColor: "#d97706",
      cancelButtonText: "Cancel",
      preConfirm: () => {
        const input = (document.getElementById("swal-trial-expiry") as HTMLInputElement)?.value;
        if (!input) {
          Swal.showValidationMessage("Please pick a trial end date.");
          return false;
        }
        return input;
      },
    });

    if (!selectedDate) return;

    try {
      Swal.fire({
        title: "Updating Trial...",
        text: `Applying trial extension to ${orgName}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      await request("patch", `/super-admin/tenants/${tenantId}/expiry`, { expiry_date: selectedDate });

      await Swal.fire({
        icon: "success",
        title: "Trial Period Updated! 🎉",
        text: `Trial for ${orgName} is now active until ${new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`,
        confirmButtonColor: "#059669",
      });

      await load();
    } catch (err: unknown) {
      Swal.fire("Error", errorMessage(err) || "Failed to update trial", "error");
    }
  };

  
  const handleChangePlan = async (record: RecordValue) => {
    const orgName = String(record.tenant_name || record.name || "Organization");
    const currentPlan = String(record.tier_name || record.plan || "Growth");
    const orgSlug = String(record.tenant_slug || record.slug || "");
    const orgId = Number(record.tenant_id || record.id);
    const paymentUrl = orgSlug ? buildTenantUrl(orgSlug, "/payment") : `/payment?id=${orgId}`;

    const statusStr = String(record.status || "trialing").toLowerCase();
    const isTrial = statusStr === "trial" || statusStr === "trialing";
    const rawExpiry = record.ends_at;
    const expiryDate = rawExpiry ? new Date(String(rawExpiry)) : null;
    const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : false;
    const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
    // Show Pay Later only when plan is expired OR plan expiry has 10 or fewer days remaining
    const showPayLaterCard = isExpired || (expiryDate !== null && daysRemaining <= 10);
    const isActivePaid = (statusStr === "active" || statusStr === "paid") && !isExpired;

    const fallbackPlans = [
      { name: "Starter", price: 9999, rank: 1, label: "Starter Plan (₹9,999/yr)" },
      { name: "Growth", price: 19999, rank: 2, label: "Growth Plan (₹19,999/yr)" },
      { name: "Business", price: 29999, rank: 3, label: "Business Plan (₹29,999/yr)" },
    ];
    const dynamicPlans = planOptions
      .filter((p) => p && p.name && p.active !== false)
      .slice()
      .sort((a, b) => Number(a.amount_cents || 0) - Number(b.amount_cents || 0))
      .map((p, idx) => {
        const price = Math.round(Number(p.amount_cents || 0) / 100);
        const name = String(p.name);
        return {
          name,
          price,
          rank: idx + 1,
          label: `${name} Plan (₹${price.toLocaleString()}/yr)`,
        };
      });
    const allPlans = dynamicPlans.length > 0 ? dynamicPlans : fallbackPlans;

    const currentPlanLower = currentPlan.toLowerCase();
    const currentMeta = allPlans.find((p) => currentPlanLower.includes(p.name.toLowerCase())) || allPlans[0];
    const currentPrice = currentMeta.price;
    const currentRank = currentMeta.rank;

    let availablePlans = allPlans;
    let isUpgradeFlow = false;

    if (isActivePaid) {
      isUpgradeFlow = true;
      // Lower packages not allowed to update; only upper plans allowed
      availablePlans = allPlans.filter((p) => p.rank > currentRank);
    }

    if (isActivePaid && availablePlans.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Already on Highest Plan",
        html: `
          <div class="text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
            <p><strong>${orgName}</strong> is currently active on the highest available plan (<strong>${currentMeta.name} Plan</strong>).</p>
            <p>Downgrading to a lower package is not permitted during an active subscription period.</p>
            <p class="text-slate-500">Subscription Expiry: <strong>${expiryDate ? expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</strong></p>
          </div>
        `,
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const defaultTargetPlan = availablePlans[0];
    const startDate = (record.starts_at || record.created_at) as string | Date | undefined;
    const firstUpgradeCalc = isUpgradeFlow
      ? calculateProratedUpgrade({
          currentAmount: currentPrice,
          targetAmount: defaultTargetPlan.price,
          startDate,
          upgradeDate: new Date(),
          currency: "INR",
          currentPlanName: currentMeta.name,
          targetPlanName: defaultTargetPlan.name,
        })
      : null;
    const defaultNetPrice = firstUpgradeCalc ? firstUpgradeCalc.payableUpgradeAmount : Math.max(0, defaultTargetPlan.price - (isUpgradeFlow ? currentPrice : 0));
    const expiryDisplay = expiryDate ? expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    // Calculate yearly anniversary continuation (expiry will be same yearly, only payment date differs)
    let yearlyContinuationDate = new Date();
    if (expiryDate) {
      yearlyContinuationDate = new Date(expiryDate);
      while (yearlyContinuationDate.getTime() <= Date.now()) {
        yearlyContinuationDate.setFullYear(yearlyContinuationDate.getFullYear() + 1);
      }
    } else {
      yearlyContinuationDate.setFullYear(yearlyContinuationDate.getFullYear() + 1);
      yearlyContinuationDate.setDate(yearlyContinuationDate.getDate() - 1);
    }
    const yearlyContinuationDisplay = yearlyContinuationDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const yearlyContinuationIsoDate = yearlyContinuationDate.toISOString().split("T")[0];

    const defaultPayLaterDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const defaultPayLaterIsoDate = defaultPayLaterDate.toISOString().split("T")[0];
    const defaultPayLaterFormatted = defaultPayLaterDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // 1. FIRST SHOW PAYMENT MODE: Cash, Online, or Pay Later?
    const modeChoice: any = await Swal.fire({
      title: `${showPayLaterCard ? "Change Plan / Continue Subscription" : "Change / Upgrade Plan"} - ${orgName}`,
      width: showPayLaterCard ? "880px" : "680px",
      showCloseButton: true,
      customClass: {
        popup: `${showPayLaterCard ? "!w-[880px]" : "!w-[680px]"} !max-w-[95vw] !p-8 !pb-9 rounded-3xl dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl relative !overflow-visible !h-auto !min-h-fit`,
        title: "!text-xl md:!text-2xl !font-bold !pt-2 !pb-1 !px-8 text-slate-900 dark:text-slate-100",
        closeButton: "!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200 !text-2xl !outline-none !shadow-none !top-5 !right-5 !p-2 !transition cursor-pointer",
        htmlContainer: "!overflow-visible !m-0 !pt-2 !pb-1 !max-h-none",
      },
      html: `
        <div class="text-left text-sm space-y-4 pt-1 text-slate-700 dark:text-slate-300">
          <div class="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/90 dark:border-indigo-800 text-center space-y-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 block font-medium">Organization: <strong class="text-slate-800 dark:text-slate-200">${orgName}</strong></span>
            <span class="text-sm text-indigo-950 dark:text-indigo-200 font-bold block">
              Current Plan: ${currentMeta.name} Plan (₹${currentPrice.toLocaleString()}/yr)
            </span>
            <span class="text-xs ${isExpired ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-700 dark:text-emerald-300 font-semibold'} block">
              ${isActivePaid ? `Active • Expiry: ${expiryDisplay}` : isTrial ? `Trial (${record.trial_days || 14} days)` : `Expired on ${expiryDisplay}`}
            </span>
          </div>

          <p class="text-center font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100 pt-1">
            Select payment mode${showPayLaterCard ? ' or continue subscription' : ''}:
          </p>

          <div class="${showPayLaterCard ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto'} pt-1 pb-1">
            <button id="swal-change-cash" type="button" class="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 text-left transition hover:shadow-lg cursor-pointer flex flex-col justify-between min-h-[190px]">
              <div>
                <div class="flex items-center gap-2.5 mb-2">
                  <span class="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">💵</span>
                  <strong class="text-sm font-bold text-emerald-950 dark:text-emerald-200">Cash Payment</strong>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Record an offline cash payment, deduct credit, and renew or upgrade plan directly.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-800/80 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                <span>Record Cash</span>
                <span>→</span>
              </div>
            </button>

            <button id="swal-change-online" type="button" class="p-5 rounded-2xl border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 text-left transition hover:shadow-lg cursor-pointer flex flex-col justify-between min-h-[190px]">
              <div>
                <div class="flex items-center gap-2.5 mb-2">
                  <span class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">💳</span>
                  <strong class="text-sm font-bold text-indigo-950 dark:text-indigo-200">Online Link</strong>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Redirect to hosted payment portal via secure Razorpay checkout link.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800/80 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span>Payment Link</span>
                <span>→</span>
              </div>
            </button>

            ${showPayLaterCard ? `
            <button id="swal-change-paylater" type="button" class="p-5 rounded-2xl border-2 border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 text-left transition hover:shadow-lg cursor-pointer flex flex-col justify-between min-h-[190px]">
              <div>
                <div class="flex items-center gap-2.5 mb-2">
                  <span class="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">⏳</span>
                  <strong class="text-sm font-bold text-amber-950 dark:text-amber-200">Pay Later</strong>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Continue subscription on yearly cycle. Set custom promised payment date.
                </p>
              </div>
              <div class="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/80 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>Continue (Pay Later)</span>
                <span>→</span>
              </div>
            </button>
            ` : ""}
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: false,
      didOpen: (el) => {
        const closeBtn = el.querySelector(".swal2-close");
        if (closeBtn) closeBtn.setAttribute("title", "Close");
        const cashBtn = document.getElementById("swal-change-cash");
        const onlineBtn = document.getElementById("swal-change-online");
        const payLaterBtn = document.getElementById("swal-change-paylater");
        if (cashBtn) {
          cashBtn.onclick = () => (Swal as any).close({ value: "cash" });
        }
        if (onlineBtn) {
          onlineBtn.onclick = () => (Swal as any).close({ value: "online" });
        }
        if (payLaterBtn) {
          payLaterBtn.onclick = () => (Swal as any).close({ value: "paylater" });
        }
      },
    });

    if (!modeChoice || !modeChoice.value) return;

    // IF ONLINE -> REDIRECT TO PAYMENT LINK / CHECKOUT PAGE!
    if (modeChoice.value === "online") {
      const win = window.open(paymentUrl, "_blank");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = paymentUrl;
      }
      return;
    }

    // IF CASH -> RECORD CASH PAYMENT AND ACTIVATE PLAN!
    if (modeChoice.value === "cash") {
      const { value: cashData } = await Swal.fire({
        title: `Record Cash Payment - ${orgName}`,
        width: "840px",
        showCloseButton: true,
        customClass: {
          popup: "!w-[840px] !max-w-[95vw] !p-8 !pb-9 rounded-3xl dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl relative",
          closeButton: "!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200 !text-2xl !outline-none !shadow-none !top-5 !right-5 !p-2 !transition cursor-pointer",
          htmlContainer: "!overflow-visible !m-0 !pt-2 !text-left !max-h-none",
          actions: "!mt-6 !gap-3",
          confirmButton: "!rounded-xl !px-7 !py-3 !font-bold !text-sm !bg-emerald-600 hover:!bg-emerald-500 !shadow-md transition cursor-pointer",
          cancelButton: "!rounded-xl !px-7 !py-3 !font-semibold !text-sm !bg-slate-200 dark:!bg-slate-700 !text-slate-800 dark:!text-slate-200 hover:!bg-slate-300 dark:hover:!bg-slate-600 transition cursor-pointer",
        },
        html: `
          <div class="text-left text-sm space-y-4 pt-1 text-slate-700 dark:text-slate-300">
            <!-- PREVIOUS / CURRENT PLAN BOX -->
            <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div class="flex justify-between items-center text-sm">
                <span class="text-slate-500">Previous / Current Plan:</span>
                <span class="font-bold text-slate-900 dark:text-slate-100">${currentMeta.name} Plan (₹${currentPrice.toLocaleString()}/yr)</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-slate-500">Current Plan Expiry:</span>
                <span class="font-semibold ${isActivePaid ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600'}">
                  ${isActivePaid ? `Active (Current plan expires: ${expiryDisplay})` : isTrial ? `Trial (${record.trial_days || 14} days)` : "Expired"}
                </span>
              </div>
              ${isUpgradeFlow && firstUpgradeCalc ? `
                <div class="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center justify-between">
                  <span>Days Used: <strong>${firstUpgradeCalc.daysUsed} days</strong> (@ ₹${firstUpgradeCalc.dailyRate}/day)</span>
                  <span>Unused Credit Deducted: <strong class="font-mono text-emerald-600 text-sm">-₹${firstUpgradeCalc.remainingCredit.toLocaleString()}</strong></span>
                </div>
                <div class="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
                  <span class="text-emerald-900 dark:text-emerald-200 font-semibold">✨ New 1-Year Expiry (After Upgrade):</span>
                  <span class="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-sm">${new Date(firstUpgradeCalc.newExpiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              ` : ''}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Select New Plan <span class="text-rose-500">*</span></label>
                <select id="swal-cash-plan" class="swal2-select !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm">
                  ${availablePlans.map((p, idx) => {
                    let rem = p.price;
                    let label = `${p.name} Plan (₹${p.price.toLocaleString()}/yr)`;
                    if (isUpgradeFlow) {
                      const uCalc = calculateProratedUpgrade({
                        currentAmount: currentPrice,
                        targetAmount: p.price,
                        startDate,
                        upgradeDate: new Date(),
                        currency: "INR",
                        currentPlanName: currentMeta.name,
                        targetPlanName: p.name,
                      });
                      rem = uCalc.payableUpgradeAmount;
                      label = `${p.name} Plan (₹${p.price.toLocaleString()} - ₹${uCalc.remainingCredit.toLocaleString()} credit [${uCalc.daysUsed}d used] = ₹${rem.toLocaleString()} payable)`;
                    }
                    return `<option value="${p.name}" data-price="${rem}" data-full="${p.price}" ${idx === 0 ? "selected" : ""}>${label}</option>`;
                  }).join("")}
                </select>
              </div>

              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Receipt / Voucher Ref #:</label>
                <input id="swal-cash-ref" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono" placeholder="e.g. CASH-REC-${Date.now().toString().slice(-5)}" value="CASH-REC-${Date.now().toString().slice(-5)}" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">${isUpgradeFlow ? "Remaining Upgrade (₹):" : "Plan Amount (₹):"}</label>
                <input id="swal-cash-amount" type="number" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono font-bold" value="${defaultNetPrice}" />
              </div>
              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Discount Amount (₹):</label>
                <input id="swal-cash-discount" type="number" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono text-emerald-600 font-bold" value="0" />
              </div>
            </div>

            <div class="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-sm">
              <span class="font-bold text-emerald-950 dark:text-emerald-200">Net Payable in Cash:</span>
              <span id="swal-cash-net" class="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-300">₹${defaultNetPrice.toLocaleString()}</span>
            </div>

            <div>
              <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Notes / Remarks:</label>
              <input id="swal-cash-notes" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm" placeholder="e.g. Paid in cash at office, plan upgraded" value="${isUpgradeFlow ? `Upgrade from ${currentMeta.name} Plan recorded in cash` : "Plan recorded in cash by Super Admin"}" />
            </div>
          </div>
        `,
        didOpen: (el) => {
          const closeBtn = el.querySelector(".swal2-close");
          if (closeBtn) closeBtn.setAttribute("title", "Close");
          const planSelect = document.getElementById("swal-cash-plan") as HTMLSelectElement;
          const amountInput = document.getElementById("swal-cash-amount") as HTMLInputElement;
          const discountInput = document.getElementById("swal-cash-discount") as HTMLInputElement;
          const netDisplay = document.getElementById("swal-cash-net");

          const updateNet = () => {
            const amt = Number(amountInput?.value) || 0;
            const disc = Number(discountInput?.value) || 0;
            const net = Math.max(0, amt - disc);
            if (netDisplay) {
              netDisplay.textContent = `₹${net.toLocaleString()}`;
            }
          };

          if (planSelect && amountInput) {
            planSelect.onchange = () => {
              const selectedOpt = planSelect.options[planSelect.selectedIndex];
              const price = selectedOpt.getAttribute("data-price") || "0";
              amountInput.value = price;
              updateNet();
            };
          }

          if (amountInput) {
            amountInput.oninput = updateNet;
          }
          if (discountInput) {
            discountInput.oninput = updateNet;
          }
        },
        showCancelButton: true,
        confirmButtonText: "Confirm Cash Payment & Update Plan 💵",
        confirmButtonColor: "#059669",
        cancelButtonText: "Cancel",
        cancelButtonColor: "#64748b",
        preConfirm: () => {
          const planSelect = document.getElementById("swal-cash-plan") as HTMLSelectElement;
          const amountInput = document.getElementById("swal-cash-amount") as HTMLInputElement;
          const discountInput = document.getElementById("swal-cash-discount") as HTMLInputElement;
          const refInput = document.getElementById("swal-cash-ref") as HTMLInputElement;
          const notesInput = document.getElementById("swal-cash-notes") as HTMLInputElement;

          const planName = planSelect?.value || defaultTargetPlan.name;
          const amount = Number(amountInput?.value ?? defaultNetPrice);
          const discount = Number(discountInput?.value ?? 0);
          if (!Number.isFinite(amount) || amount < 0) {
            Swal.showValidationMessage("Please enter a valid non-negative payment amount.");
            return false;
          }
          if (!Number.isFinite(discount) || discount < 0) {
            Swal.showValidationMessage("Discount cannot be negative.");
            return false;
          }
          if (discount > amount) {
            Swal.showValidationMessage("Discount amount cannot exceed payable amount.");
            return false;
          }
          if (amount - discount <= 0 && !isUpgradeFlow) {
            Swal.showValidationMessage("Net payable amount after discount must be greater than 0.");
            return false;
          }
          const reference = refInput?.value || `CASH-REC-${Date.now().toString().slice(-5)}`;
          const notes = notesInput?.value || "Plan changed via Cash Payment";

          return { planName, amount, discount, reference, notes };
        },
      });

      if (!cashData) return;

      try {
        Swal.fire({
          title: "Updating Plan & Recording Payment...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const res = await adminApi.post("/admin/payments/record", {
          organization_id: orgId,
          plan_name: cashData.planName,
          amount: cashData.amount,
          discount_amount: cashData.discount,
          currency: "INR",
          payment_method: "Cash",
          reference: cashData.reference,
          notes: cashData.notes,
        });

        if (res.data && res.data.success) {
          const netPaid = Math.max(0, cashData.amount - cashData.discount);
          await Swal.fire({
            icon: "success",
            title: "Plan Changed Successfully! 🎉",
            confirmButtonText: "Done",
            confirmButtonColor: "#4f46e5",
            customClass: {
              popup: "rounded-2xl dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl !p-6",
              confirmButton: "!rounded-xl !px-7 !py-2.5 !font-semibold !text-xs !bg-indigo-600 hover:!bg-indigo-500 !shadow-sm transition",
            },
            html: `
              <div class="space-y-3.5 pt-1 text-slate-700 dark:text-slate-300">
                <p class="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                  <strong>${orgName}</strong> is now updated to the <strong class="text-indigo-600 dark:text-indigo-400 font-bold">${cashData.planName} Plan</strong>.
                </p>

                <div class="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 text-xs space-y-2.5 text-left shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Cash Payment Received:</span>
                    <span class="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">₹${netPaid.toLocaleString()}</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Updated Plan:</span>
                    <span class="font-bold text-slate-800 dark:text-slate-200">${cashData.planName} (Yearly)</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">New Subscription Expiry:</span>
                    <span class="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>${firstUpgradeCalc ? new Date(firstUpgradeCalc.newExpiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : new Date(Date.now() + 364 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span class="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">1 Year Renewed</span>
                    </span>
                  </div>
                  ${cashData.reference ? `
                  <div class="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Receipt / Ref #:</span>
                    <span class="font-mono text-slate-600 dark:text-slate-400">${cashData.reference}</span>
                  </div>
                  ` : ""}
                </div>
              </div>
            `,
          });
          await load();
        } else {
          throw new Error(res.data?.message || "Failed to record cash payment");
        }
      } catch (err: any) {
        Swal.fire("Error", errorMessage(err) || "Failed to change plan via cash payment", "error");
      }
    }

    // IF PAY LATER -> CONTINUE SUBSCRIPTION WITH CUSTOM PROMISED PAYMENT DATE!
    if (modeChoice.value === "paylater") {
      const { value: payLaterData } = await Swal.fire({
        title: `Continue Subscription (Pay Later) - ${orgName}`,
        width: "840px",
        showCloseButton: true,
        customClass: {
          popup: "!w-[840px] !max-w-[95vw] !p-8 !pb-9 rounded-3xl dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl relative",
          title: "!text-xl md:!text-2xl !font-bold !pt-2 !pb-1 !px-8 text-slate-900 dark:text-slate-100",
          closeButton: "!text-slate-400 hover:!text-slate-700 dark:hover:!text-slate-200 !text-2xl !outline-none !shadow-none !top-5 !right-5 !p-2 !transition cursor-pointer",
          htmlContainer: "!overflow-visible !m-0 !pt-2 !text-left !max-h-none",
          actions: "!mt-6 !gap-3",
          confirmButton: "!rounded-xl !px-7 !py-3 !font-bold !text-sm !bg-amber-600 hover:!bg-amber-500 !shadow-md transition cursor-pointer text-white",
          cancelButton: "!rounded-xl !px-7 !py-3 !font-semibold !text-sm !bg-slate-200 dark:!bg-slate-700 !text-slate-800 dark:!text-slate-200 hover:!bg-slate-300 dark:hover:!bg-slate-600 transition cursor-pointer",
        },
        html: `
          <div class="text-left text-sm space-y-4 pt-1 text-slate-700 dark:text-slate-300">
            <!-- CURRENT STATUS BANNER -->
            <div class="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
              <div class="flex justify-between items-center text-sm">
                <span class="text-amber-900 dark:text-amber-200 font-semibold">Current Plan:</span>
                <span class="font-bold text-slate-900 dark:text-slate-100">${currentMeta.name} Plan (₹${currentPrice.toLocaleString()}/yr)</span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-amber-900 dark:text-amber-200 font-semibold">Current Status:</span>
                <span class="font-semibold ${isExpired ? 'text-rose-600' : 'text-emerald-600'}">
                  ${isExpired ? `Expired (${expiryDisplay})` : `Active (Expires: ${expiryDisplay})`}
                </span>
              </div>
              <div class="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 flex justify-between items-center text-xs">
                <span class="font-bold text-amber-950 dark:text-amber-200">✨ Preserved Yearly Expiry Date:</span>
                <span class="font-mono font-bold text-sm text-amber-900 dark:text-amber-100">${yearlyContinuationDisplay}</span>
              </div>
              <p class="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                ℹ️ <strong>Same Yearly Cycle Preserved:</strong> Subscription continues on its yearly anniversary cycle (${yearlyContinuationDisplay}). The organization is set to <strong>Active</strong> immediately so the client can continue using their CRM without disruption.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Select Plan <span class="text-rose-500">*</span></label>
                <select id="swal-paylater-plan" class="swal2-select !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm">
                  ${availablePlans.map((p) => `
                    <option value="${p.name}" data-price="${p.price}" ${p.name.toLowerCase() === currentMeta.name.toLowerCase() ? "selected" : ""}>
                      ${p.name} Plan (₹${p.price.toLocaleString()}/yr)
                    </option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                  Custom Pay Later Date (Client Promises Payment By) <span class="text-rose-500">*</span>
                </label>
                <input id="swal-paylater-due-date" type="date" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono font-semibold" value="${defaultPayLaterIsoDate}" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                  Subscription Expiry Date (Yearly Anniversary)
                </label>
                <input id="swal-paylater-expiry-date" type="date" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono font-semibold" value="${yearlyContinuationIsoDate}" />
              </div>

              <div>
                <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Pending Payment Amount (₹):</label>
                <input id="swal-paylater-amount" type="number" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm font-mono font-bold" value="${currentPrice}" />
              </div>
            </div>

            <div>
              <label class="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">Notes / Payment Commitment Details:</label>
              <input id="swal-paylater-notes" class="swal2-input !w-full !text-sm !h-11 !py-2 !px-3 !m-0 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm" placeholder="e.g. Client requested extension, cheque promised by ${defaultPayLaterFormatted}" value="Subscription continued under Pay Later. Payment promised by ${defaultPayLaterFormatted}." />
            </div>
          </div>
        `,
        didOpen: (el) => {
          const closeBtn = el.querySelector(".swal2-close");
          if (closeBtn) closeBtn.setAttribute("title", "Close");
          const planSelect = document.getElementById("swal-paylater-plan") as HTMLSelectElement;
          const amountInput = document.getElementById("swal-paylater-amount") as HTMLInputElement;
          if (planSelect && amountInput) {
            planSelect.onchange = () => {
              const selectedOpt = planSelect.options[planSelect.selectedIndex];
              const price = selectedOpt.getAttribute("data-price") || "0";
              amountInput.value = price;
            };
          }
        },
        showCancelButton: true,
        confirmButtonText: "Continue Subscription & Mark Pay Later ⏳",
        confirmButtonColor: "#d97706",
        cancelButtonText: "Cancel",
        cancelButtonColor: "#64748b",
        preConfirm: () => {
          const planSelect = document.getElementById("swal-paylater-plan") as HTMLSelectElement;
          const dueDateInput = document.getElementById("swal-paylater-due-date") as HTMLInputElement;
          const expiryDateInput = document.getElementById("swal-paylater-expiry-date") as HTMLInputElement;
          const amountInput = document.getElementById("swal-paylater-amount") as HTMLInputElement;
          const notesInput = document.getElementById("swal-paylater-notes") as HTMLInputElement;

          const planName = planSelect?.value || currentMeta.name;
          const expectedPaymentDate = dueDateInput?.value;
          const customExpiryDate = expiryDateInput?.value;
          const amount = Number(amountInput?.value) || currentPrice;
          const notes = notesInput?.value || `Pay Later commitment until ${expectedPaymentDate}`;

          if (!expectedPaymentDate) {
            Swal.showValidationMessage("Please specify the custom date when payment is expected.");
            return false;
          }
          return { planName, expectedPaymentDate, customExpiryDate, amount, notes };
        },
      });

      if (!payLaterData) return;

      try {
        Swal.fire({
          title: "Continuing Subscription...",
          text: "Updating organization status and setting Pay Later commitment.",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const res = await adminApi.post("/admin/payments/record", {
          organization_id: orgId,
          plan_name: payLaterData.planName,
          amount: payLaterData.amount,
          discount_amount: 0,
          currency: "INR",
          payment_method: "Pay Later",
          payment_status: "pending",
          expected_payment_date: payLaterData.expectedPaymentDate,
          custom_expiry_date: payLaterData.customExpiryDate,
          notes: payLaterData.notes,
        });

        if (res.data && res.data.success) {
          await Swal.fire({
            icon: "success",
            title: "Subscription Continued! ⏳",
            confirmButtonText: "Done",
            confirmButtonColor: "#4f46e5",
            customClass: {
              popup: "rounded-2xl dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl !p-6",
              confirmButton: "!rounded-xl !px-7 !py-2.5 !font-semibold !text-xs !bg-indigo-600 hover:!bg-indigo-500 !shadow-sm transition",
            },
            html: `
              <div class="space-y-3.5 pt-1 text-slate-700 dark:text-slate-300">
                <p class="text-sm text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                  <strong>${orgName}</strong> is now <strong class="text-emerald-600 dark:text-emerald-400 font-bold">Active</strong> and can continue using their CRM.
                </p>

                <div class="p-4 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200/90 dark:border-amber-700/80 text-xs space-y-2.5 text-left shadow-2xs">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Subscription Status:</span>
                    <span class="font-bold text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-amber-200/80 dark:border-amber-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Payment Status:</span>
                    <span class="font-bold text-xs bg-amber-100 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 px-2.5 py-0.5 rounded-full">Pay Later (Pending)</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-amber-200/80 dark:border-amber-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Payment Promised Date:</span>
                    <span class="font-mono font-bold text-amber-700 dark:text-amber-300">${new Date(payLaterData.expectedPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-amber-200/80 dark:border-amber-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Preserved Yearly Expiry:</span>
                    <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${new Date(payLaterData.customExpiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div class="flex items-center justify-between pt-2 border-t border-amber-200/80 dark:border-amber-700/70">
                    <span class="text-slate-500 dark:text-slate-400 font-medium">Amount Due:</span>
                    <span class="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">₹${Number(payLaterData.amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            `,
          });
          await load();
        } else {
          throw new Error(res.data?.message || "Failed to continue subscription under Pay Later");
        }
      } catch (err: any) {
        Swal.fire("Error", errorMessage(err) || "Failed to continue subscription", "error");
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
      console.error("Save record error:", requestError);
    } finally {
      setSaving(false);
    }
  };

  const isAlreadyPaidRecord = (record: RecordValue): boolean => {
    const payStatus = String(record.payment_status || "").toLowerCase();
    const recStatus = String(record.status || "").toLowerCase();
    const planStr = String(record.plan || record.tier_name || "").toLowerCase();
    const endsAt = record.ends_at || record.subscription_expiry_date;
    const unexpired = !endsAt || new Date(String(endsAt)) > new Date();
    if (payStatus === "paid") return unexpired;
    return recStatus === "active" && !planStr.includes("trial") && unexpired;
  };

  const openPaymentLinkDialog = (record: RecordValue) => {
    if (isAlreadyPaidRecord(record)) {
      void Swal.fire({
        icon: "info",
        title: "Already Paid",
        text: "This organization already has an active paid subscription. A new payment link cannot be created.",
        confirmButtonColor: "#040975",
      });
      return;
    }
    setPaymentLinkTenant(record);
  };

  const sendPaymentLink = async (record: RecordValue) => {
    if (isAlreadyPaidRecord(record)) {
      await Swal.fire({
        icon: "info",
        title: "Already Paid",
        text: "This subscription is already paid. A new payment link cannot be sent.",
        confirmButtonColor: "#040975",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Send Payment Link?",
      text: `Send the subscription payment link email for ${String(record.tenant_name || record.name || "this organization")}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Send Link",
      confirmButtonColor: "#059669",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      setError("");
      setNotice("");
      Swal.fire({
        title: "Sending Payment Link...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const result = asObject(await request("post", `/tenants/${record.tenant_id}/subscriptions/${record.id}/payment-link`));
      await load();
      const responseMessage = String(result?.response_message || "Payment link email sent successfully.");
      if (result?.email_sent === false) {
        setError(responseMessage);
        await Swal.fire({
          icon: "warning",
          title: "Payment Link Active ⚠️",
          text: responseMessage,
          confirmButtonColor: "#4f46e5",
        });
      } else {
        setNotice(responseMessage);
        await Swal.fire({
          icon: "success",
          title: "Payment Link Sent! ✉️",
          text: responseMessage,
          confirmButtonColor: "#059669",
        });
      }
    } catch (requestError: any) {
      console.error("Save record error:", requestError);
      const errMsg = requestError?.response?.data?.message || requestError?.message || "Failed to send payment link.";
      setError(errMsg);
      await Swal.fire({
        icon: "error",
        title: "Could Not Send Payment Link",
        text: errMsg,
        confirmButtonColor: "#e11d48",
      });
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
      console.error("Save record error:", requestError);
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
    if (moduleKey === "users") return ["name", "email", "phone", "role_name", "status", "created_at"];
    if (moduleKey === "roles") return ["name", "description", "parent_role_name", "permission_type", "created_at"];
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
          .filter((key) => key !== "id" && !SECRET_KEY.test(key) && !(moduleKey === "roles" && key === "permissions"))
          .slice(0, 6)
      : [];
  }, [moduleKey, records]);
  const baseRecords = useMemo(() => {
    let list = moduleKey === "subscriptions" && tenantId
      ? records.filter((record) => String(record.tenant_id) === tenantId)
      : records;

    if (moduleKey === "subscriptions") {
      // Last added on top: sort newest created_at / starts_at first, then tenant_id DESC, id DESC
      list = [...list].sort((a, b) => {
        const dateA = new Date(String(a.created_at || a.starts_at || 0)).getTime() || 0;
        const dateB = new Date(String(b.created_at || b.starts_at || 0)).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;

        const tenantA = Number(a.tenant_id ?? 0);
        const tenantB = Number(b.tenant_id ?? 0);
        if (tenantB !== tenantA) return tenantB - tenantA;

        return Number(b.id ?? 0) - Number(a.id ?? 0);
      });
    }

    return list;
  }, [moduleKey, tenantId, records]);

  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    baseRecords.forEach((record) => {
      const s = record.status ?? record.state;
      if (typeof s === "string" && s.trim()) {
        set.add(s.trim());
      }
    });
    return Array.from(set);
  }, [baseRecords]);

  const displayedRecords = useMemo(() => {
    if (moduleKey === "payments") return baseRecords;

    return baseRecords.filter((record) => {
      if (statusFilter !== "all") {
        const rawStatus = String(record.status ?? record.state ?? "").toLowerCase();
        if (rawStatus !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matches = Object.entries(record).some(([k, v]) => {
          if (v === null || v === undefined) return false;
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            return String(v).toLowerCase().includes(q);
          }
          return false;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [moduleKey, baseRecords, searchTerm, statusFilter]);

  // Pagination calculations
  const totalItems = displayedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedRecords = useMemo(() => {
    return displayedRecords.slice(startIndex, endIndex);
  }, [displayedRecords, startIndex, endIndex]);

  const createLabel = moduleKey === "organizations"
    ? "Create Organization"
    : moduleKey === "users"
    ? "Add User"
    : moduleKey === "roles"
    ? "Add Role"
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
          ["Phone", viewing.phone],
          ["Role", viewing.role_name],
          ["Status", viewing.status],
          ["Created at", viewing.created_at],
          ["Updated at", viewing.updated_at],
        ]
    : [];
  const canCreate = Boolean(fields.length) && !["demos"].includes(moduleKey) && hasPermission("create") &&
    (moduleKey !== "subscriptions" || admin?.permissions?.includes("platform.payments.create"));

  return (
    <section className="min-h-screen text-slate-100">
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
          {moduleKey !== "smtp" && moduleKey !== "notifications" && canCreate && (!scoped || tenantId || moduleKey === "subscriptions") && (
            <button type="button" onClick={beginCreate} className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">{createLabel}</button>
          )}
          {moduleKey === "notifications" && records.length > 0 && (
            <button type="button" onClick={async () => { try { await request("delete", "/notifications"); await load(); setNotice("All notifications deleted."); } catch (e) { setError(errorMessage(e)); } }} className="self-end rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">Clear all</button>
          )}
        </div>
      </header>}

      {moduleKey === "subscriptions" && <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs sm:text-sm text-indigo-950 dark:border-indigo-500/25 dark:bg-indigo-500/5 dark:text-indigo-200">Choose an organization and plan to create a pending subscription. The customer pays through a hosted Razorpay link emailed to its administrator; access activates only after Razorpay confirms payment.</div>}
      {moduleKey === "smtp" && smtpTestResult && <div role={smtpTestResult.success ? "status" : "alert"} className={`mb-4 rounded-lg border px-4 py-3 text-sm ${smtpTestResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{smtpTestResult.message}</div>}
      {(moduleKey === "domains" || moduleKey === "subscriptions") && paymentLinkTenant && (
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
              }} className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700">
                <option value="">No plan / trial only</option>
                {planOptions.map((plan) => <option key={String(plan.id)} value={String(plan.id)}>{String(plan.name)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-300">Trial duration (days)
              <input type="number" min="1" max="365" required value={trialDays} onChange={(event) => setTrialDays(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700" />
            </label>
            <label className="text-xs font-medium text-slate-300">Temporary admin password
              <input type="password" minLength={8} maxLength={50} required value={trialPassword} onChange={(event) => setTrialPassword(event.target.value)} autoComplete="new-password" className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700" />
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
            <input value={paymentFilterDraft.search} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Organization, reference, payment ID" className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            Status
            <select value={paymentFilterDraft.status} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, status: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700">
              <option value="">All statuses</option>
              {["created", "recorded", "pending", "paid", "failed", "refunded"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-300">
            From
            <input type="date" value={paymentFilterDraft.date_from} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, date_from: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700" />
          </label>
          <label className="text-xs font-medium text-slate-300">
            To
            <input type="date" value={paymentFilterDraft.date_to} onChange={(event) => setPaymentFilterDraft((current) => ({ ...current, date_to: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700" />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Apply filters</button>
            <button type="button" onClick={() => { const emptyFilters = { search: "", status: "", date_from: "", date_to: "" }; setPaymentFilterDraft(emptyFilters); setAppliedPaymentFilters(emptyFilters); setTenantId(""); }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300">Clear</button>
          </div>
        </form>
      )}

      {viewing && moduleKey === "users" && (
        <section className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-5 sm:p-7 shadow-sm transition-all" aria-labelledby="user-details-heading">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-lg font-black text-white shadow-sm ring-4 ring-indigo-50 dark:ring-indigo-950/40">
                {String(viewing.name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/80">
                    {String(viewing.role_name || "Platform Staff")}
                  </span>
                  <span className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    String(viewing.status || "").toLowerCase() === "active"
                      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80"
                      : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80"
                  }`}>
                    {String(viewing.status || "active")}
                  </span>
                </div>
                <h2 id="user-details-heading" className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                  {String(viewing.name || "User Details")}
                </h2>
                {Boolean(viewing.email) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{String(viewing.email)}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-2xs transition flex items-center gap-1.5"
            >
              <ArrowLeft aria-hidden="true" size={14} />
              <span>Back to users</span>
            </button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userDetails.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-200/90 dark:border-gray-700/80 bg-slate-50/70 dark:bg-slate-900/60 p-4 transition hover:border-gray-300 dark:hover:border-gray-600">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</dt>
                <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {displayValue(value, label) || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex justify-end border-t border-gray-100 dark:border-gray-700/80 pt-4">
            <button
              type="button"
              onClick={() => beginEdit(viewing)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Pencil aria-hidden="true" size={14} />
              <span>Edit user</span>
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <form noValidate onSubmit={(event) => void submitForm(event)} className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-5 sm:p-7 shadow-sm transition-all">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editing ? "Edit Record" : createLabel}</h2>
            <button type="button" title="Close" aria-label="Close" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition shadow-2xs cursor-pointer">Close</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter((field) =>
              !(moduleKey === "payments" && tenantId && field.name === "tenant_id") &&
              !(moduleKey === "subscriptions" && editing && field.name === "trial_days") &&
              !(moduleKey === "subscriptions" && !editing && field.name !== "pricing_tier_id")
            ).map((field) => {
              const hasErr = Boolean(fieldErrors[field.name]);
              const inputBorderClass = hasErr
                ? "border-rose-500 ring-1 ring-rose-500 focus:border-rose-500"
                : "border-slate-700 focus:border-indigo-500";

              return (
                <div key={field.name} className={`${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    {field.label}
                    {field.required && !(moduleKey === "users" && editing && field.name === "password") && (
                      <span className="text-rose-400 ml-1">*</span>
                    )}
                    {field.secret && <span className="ml-1 font-normal text-slate-500">(never shown after saving)</span>}
                  </label>
                  {field.name === "tenant_id" && moduleKey === "payments" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field.name]: event.target.value }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    >
                      <option value="">Select a tenant</option>
                      {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} (#{tenant.id})</option>)}
                    </select>
                  ) : field.name === "parent_role_id" && moduleKey === "roles" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field.name]: event.target.value }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    >
                      <option value="">Select a parent role</option>
                      {records
                        .filter((role) => !editing || String(role.id) !== String(editing.id))
                        .map((role) => <option key={String(role.id)} value={String(role.id)}>{`${"— ".repeat(Number(role.hierarchy_depth) || 0)}${String(role.name || `Role ${role.id}`)}`}</option>)}
                    </select>
                  ) : field.name === "platform_role_id" && moduleKey === "users" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field.name]: event.target.value }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    >
                      <option value="">Select a platform role</option>
                      {platformRoles.map((role) => <option key={String(role.id)} value={String(role.id)}>{`${"— ".repeat(Number(role.hierarchy_depth) || 0)}${String(role.name)}`}</option>)}
                    </select>
                  ) : field.name === "pricing_tier_id" && moduleKey === "subscriptions" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        const pricingTierId = event.target.value;
                        setForm((current) => ({ ...current, [field.name]: pricingTierId }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    >
                      <option value="">{editing ? "No plan / trial only" : "Select a plan"}</option>
                      {planOptions.map((plan) => <option key={String(plan.id)} value={String(plan.id)}>{String(plan.name)} — {String(plan.currency)} {Number(plan.amount_cents || 0) / 100} / {String(plan.billing_interval)}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field.name]: event.target.value }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      rows={5}
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, [field.name]: event.target.value }));
                        if (fieldErrors[field.name]) setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                      }}
                      
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    >
                      <option value="">Select…</option>
                      {field.options?.filter((option) =>
                        !(moduleKey === "subscriptions" && field.name === "status" && option === "active" && editing?.status !== "active")
                      ).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.secret ? (
                    <div className="relative">
                      <input
                        type={showPasswordMap[field.name] ? "text" : "password"}
                        maxLength={128}
                        value={form[field.name] || ""}
                        onChange={(event) => {
                          const val = event.target.value;
                          setForm((current) => ({ ...current, [field.name]: val }));
                          if (fieldErrors[field.name]) {
                            const err = validateSingleField(field.name, val);
                            setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                          }
                        }}
                        onBlur={() => {
                          const err = validateSingleField(field.name, form[field.name] || "");
                          if (err) setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                        }}
                        autoComplete="new-password"
                        placeholder="Min 8 characters"
                        className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordMap((prev) => ({ ...prev, [field.name]: !prev[field.name] }))}
                        className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label={showPasswordMap[field.name] ? "Hide password" : "Show password"}
                        title={showPasswordMap[field.name] ? "Hide password" : "Show password"}
                      >
                        {showPasswordMap[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={(field.name.includes("phone") || field.name.includes("mobile") || field.name.includes("contact")) ? "tel" : field.type || "text"}
                      maxLength={field.name.includes("phone") || field.name.includes("mobile") || field.name.includes("contact") ? 10 : undefined}
                      value={form[field.name] || ""}
                      onChange={(event) => {
                        let val = event.target.value;
                        if (field.name.includes("phone") || field.name.includes("mobile") || field.name.includes("contact")) {
                          // Allow digits only (max 10 digits)
                          val = val.replace(/\D/g, "").slice(0, 10);
                          if (val.startsWith("0")) {
                            val = val.replace(/^0+/, "");
                            setFieldErrors((prev) => ({
                              ...prev,
                              [field.name]: "Phone number cannot start with 0 or be all zeroes. Must start with 6, 7, 8, or 9.",
                            }));
                          } else if (val.length > 0 && !/^[6-9]/.test(val)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              [field.name]: "Phone number must start with 6, 7, 8, or 9.",
                            }));
                          } else if (val.length === 10 && /^(\d)\1{9}$/.test(val)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              [field.name]: "Phone number cannot contain all identical digits.",
                            }));
                          } else if (val.length === 10) {
                            const err = validateSingleField(field.name, val);
                            setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                          } else if (fieldErrors[field.name]) {
                            setFieldErrors((prev) => ({ ...prev, [field.name]: "" }));
                          }
                        } else if (field.name === "slug") {
                          val = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
                          if (fieldErrors[field.name]) {
                            const err = validateSingleField(field.name, val);
                            setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                          }
                        } else if (["name", "admin_name", "from_name"].includes(field.name)) {
                          // No invalid special characters (letters, spaces, dots, hyphens, apostrophes only)
                          val = val.replace(/[^a-zA-Z\s.'-]/g, "");
                          if (fieldErrors[field.name]) {
                            const err = validateSingleField(field.name, val);
                            setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                          }
                        } else {
                          if (fieldErrors[field.name]) {
                            const err = validateSingleField(field.name, val);
                            setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                          }
                        }
                        setForm((current) => ({ ...current, [field.name]: val }));
                      }}
                      onBlur={(event) => {
                        const currentVal = event.target.value;
                        const err = validateSingleField(field.name, currentVal);
                        setFieldErrors((prev) => ({ ...prev, [field.name]: err }));
                      }}
                      min={field.type === "number" ? 0 : undefined}
                      placeholder={
                        field.name.includes("phone") || field.name.includes("mobile") || field.name.includes("contact")
                          ? "e.g. 9876543210 (10 digits)"
                          : field.name === "name" || field.name === "admin_name"
                          ? "e.g. John Doe (letters only)"
                          : field.name === "email" || field.name === "admin_email"
                          ? "e.g. name@example.com"
                          : undefined
                      }
                      className={`block w-full rounded-lg border ${inputBorderClass} bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 outline-none`}
                    />
                  )}
                  {fieldErrors[field.name] && (
                    <p className="mt-1 text-xs font-semibold text-rose-400 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-rose-400 shrink-0"></span>
                      {fieldErrors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}
            {moduleKey === "users" && editing && <p className="text-xs text-slate-400 sm:col-span-2">Leave Password blank to keep the current password.</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2.5 border-t border-gray-100 dark:border-gray-700/80 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 shadow-2xs transition">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50">{saving ? "Saving…" : "Save Record"}</button>
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
              <select id="access-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} disabled={records.length === 0} className="min-w-48 rounded-lg border border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-700 disabled:opacity-50">
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

      {moduleKey !== "smtp" && moduleKey !== "payments" && !showForm && !viewing && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-white dark:bg-slate-900 p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            {availableStatuses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filters */}
            {(searchTerm || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="self-start sm:self-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline py-1 px-1.5"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Counts */}
          <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto shrink-0">
            {displayedRecords.length === baseRecords.length ? (
              <span>Total: <strong className="text-slate-700 dark:text-slate-200">{baseRecords.length}</strong></span>
            ) : (
              <span>Showing <strong className="text-indigo-600 dark:text-indigo-400">{displayedRecords.length}</strong> of {baseRecords.length}</span>
            )}
          </div>
        </div>
      )}

      {moduleKey !== "smtp" && moduleKey !== "access-management" && !showForm && !viewing && <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {loading ? (
          <div role="status" className="w-full">
            {/* Desktop Table Skeleton with grey strap lines */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                {moduleKey === "subscriptions" ? (
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">ORGANIZATION</th>
                      <th className="px-5 py-3.5">PLAN</th>
                      <th className="px-5 py-3.5">BILLING CYCLE</th>
                      <th className="px-5 py-3.5">NEXT RENEWAL</th>
                      <th className="px-5 py-3.5">STATUS</th>
                      <th className="px-5 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                ) : (
                  <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-16">Sr. No.</th>
                      {visibleColumns.map((column) => (
                        <th key={column} className="px-4 py-3 font-semibold">
                          {column.replace(/_/g, " ")}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {[1, 2, 3, 4, 5, 6].map((row) => (
                    <tr key={row} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {moduleKey === "subscriptions" ? (
                        <>
                          <td className="px-5 py-4"><div className="h-4 w-44 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-20 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-24 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" /></td>
                          <td className="px-5 py-4"><div className="h-4 w-28 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" /></td>
                          <td className="px-5 py-4"><div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" /></td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-7 w-20 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
                              <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 text-center w-16">
                            <div className="h-4 w-5 mx-auto rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />
                          </td>
                          {visibleColumns.map((col, idx) => {
                            let widthClass = "w-28";
                            if (col === "name") widthClass = row % 2 === 0 ? "w-36" : "w-28";
                            else if (col === "email") widthClass = row % 2 === 0 ? "w-44" : "w-36";
                            else if (col === "phone") widthClass = "w-24";
                            else if (col === "role_name" || col === "parent_role_name") widthClass = "w-24";
                            else if (col === "status") widthClass = "w-16 h-5 rounded-full";
                            else if (col === "created_at" || col === "updated_at") widthClass = "w-24";
                            else if (idx % 2 === 0) widthClass = "w-32";

                            return (
                              <td key={col} className="px-4 py-4">
                                <div className={`h-4 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse ${widthClass}`} />
                              </td>
                            );
                          })}
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                              <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                              <div className="h-4 w-4 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Skeleton Cards with grey strap lines */}
            <div className="divide-y divide-gray-100 dark:divide-slate-800 md:hidden bg-white dark:bg-slate-900 p-4 space-y-4">
              {[1, 2, 3, 4].map((card) => (
                <div key={card} className="pt-3 first:pt-0 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="h-3 w-44 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-28 rounded-md bg-gray-200 dark:bg-slate-700 animate-pulse" />
                </div>
              ))}
            </div>
            <span className="sr-only">Loading {title.toLowerCase()}…</span>
          </div>
        ) : scoped && !tenantId && moduleKey !== "subscriptions" ? (
          <div className="p-10 text-center"><h2 className="font-semibold text-slate-800 dark:text-white">Select a tenant</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a tenant above to load its {title.toLowerCase()}.</p></div>
        ) : displayedRecords.length === 0 ? (
          <div className="p-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Inbox aria-hidden="true" size={21} /></div><h2 className="mt-3 font-semibold text-slate-800 dark:text-white">{error ? "Unable to load records" : (searchTerm || statusFilter !== "all") ? "No matching records" : "Nothing here yet"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{error ? "Check the error above and retry." : (searchTerm || statusFilter !== "all") ? "Try adjusting your search or filter criteria." : `No ${title.toLowerCase()} were found.`}</p>{(searchTerm || statusFilter !== "all") && (<button type="button" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} className="mt-4 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold !text-white hover:bg-indigo-500 shadow-sm transition">Reset filters</button>)}</div>
        ) : moduleKey === "pricing" ? (
          <>
            <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6 2xl:grid-cols-3">
              {paginatedRecords.map((record, index) => {
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
          {totalItems > pageSize && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </>
        ) : (
          <>
            {moduleKey === "subscriptions" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Subscription status by organization
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage subscriptions, active plans, renewals, and payment commitments
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {totalItems > 0 ? `Showing ${startIndex + 1}–${endIndex} of ${totalItems} total` : "0 subscriptions"}
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs font-medium"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>
            )}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                {moduleKey === "subscriptions" ? (
                  <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">ORGANIZATION</th>
                      <th className="px-5 py-3.5">PLAN</th>
                      <th className="px-5 py-3.5">BILLING CYCLE</th>
                      <th className="px-5 py-3.5">NEXT RENEWAL</th>
                      <th className="px-5 py-3.5">STATUS</th>
                      <th className="px-5 py-3.5 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                ) : (
                  <thead className="border-b border-gray-200 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-16">Sr. No.</th>
                      {visibleColumns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column.replace(/_/g, " ")}</th>)}
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {moduleKey === "subscriptions" ? (
                    paginatedRecords.map((record, index) => {
                      const rawStatusStr = String(record.status || "trialing").toLowerCase();
                      const endsDateObj = record.ends_at ? new Date(String(record.ends_at)) : null;
                      const isPastDueDate = Boolean(endsDateObj && !isNaN(endsDateObj.getTime()) && endsDateObj.getTime() < Date.now());
                      const isSuspended = rawStatusStr === "suspended";
                      const isCancelled = rawStatusStr === "cancelled";
                      const isExpired = rawStatusStr === "expired" || (isPastDueDate && !isSuspended && !isCancelled);
                      const isTrial = !isExpired && (rawStatusStr === "trial" || rawStatusStr === "trialing");
                      const isActive = !isExpired && rawStatusStr === "active";
                      const statusStr = isExpired ? "expired" : rawStatusStr;
                      const orgName = String(record.tenant_name || record.name || "Organization");
                      const planName = String(record.tier_name || record.plan || "Growth");
                      const billingCycle = isTrial
                        ? `${record.trial_days || 14}-day trial`
                        : "Yearly";

                      let renewalDateStr = "—";
                      if (endsDateObj && !isNaN(endsDateObj.getTime())) {
                        if (isExpired) {
                          renewalDateStr = `Expired ${endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
                        } else if (isTrial) {
                          renewalDateStr = `Trial ends ${endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                        } else {
                          renewalDateStr = endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        }
                      }

                      const isPaid = String(record.payment_status || "").toLowerCase() === "paid";
                      const isPayLater =
                        !isPaid &&
                        (record.is_pay_later === true ||
                          String(record.payment_status || "").toLowerCase() === "pay_later" ||
                          Boolean(record.tenant_settings && typeof record.tenant_settings === "object" && (record.tenant_settings as any).pay_later === true));

                      let expectedDateStr = "";
                      if (record.expected_payment_date) {
                        const ed = new Date(String(record.expected_payment_date));
                        if (!isNaN(ed.getTime())) {
                          expectedDateStr = ed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }
                      } else if (record.tenant_settings && (record.tenant_settings as any).expected_payment_date) {
                        const ed = new Date(String((record.tenant_settings as any).expected_payment_date));
                        if (!isNaN(ed.getTime())) {
                          expectedDateStr = ed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }
                      }

                      return (
                        <tr key={String(record.id ?? index)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors bg-white dark:bg-slate-900">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {orgName}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                              {planName}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {billingCycle}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                              {renewalDateStr}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                  ACTIVE
                                </span>
                              ) : isTrial ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                                  TRIAL
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                                  EXPIRED
                                </span>
                              ) : isSuspended ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                                  SUSPENDED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                                  {statusStr.toUpperCase()}
                                </span>
                              )}
                              {isPayLater && (
                                <span
                                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 text-xs shadow-2xs cursor-help"
                                  title={`Pay Later Commitment${expectedDateStr ? ` • Payment promised by ${expectedDateStr}` : ""}`}
                                >
                                  ⏳
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(isTrial || isExpired) && (
                                <button
                                  type="button"
                                  onClick={() => void handleUpdateTrial(record)}
                                  className="px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-2xs"
                                  title={`Extend or update subscription for ${orgName}`}
                                >
                                  Update trial
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleChangePlan(record)}
                                className="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-2xs inline-flex items-center justify-center text-center cursor-pointer"
                                title={`Change plan for ${orgName}`}
                              >
                                Change plan
                              </button>
                              <Link
                                to={`/admin/payments?org_id=${record.tenant_id || record.id}`}
                                className="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-2xs"
                              >
                                Payment history
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : null}

                  {moduleKey !== "subscriptions" && paginatedRecords.map((record, index) => (
                    <tr key={String(record.id ?? index)} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-center font-mono text-xs text-slate-400 w-16">{startIndex + index + 1}</td>
                      {visibleColumns.map((column) => (
                        <td key={column} className="max-w-xs px-4 py-3 text-slate-300">
                          <span className="block truncate">
                            {moduleKey === "roles" && column === "name"
                              ? `${"— ".repeat(Number(record.hierarchy_depth) || 0)}${displayValue(record[column], column)}`
                              : displayValue(record[column], column)}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {moduleKey === "organizations" && <>
                            <button type="button" aria-label="View organization" title="View organization" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                            <button type="button" aria-label="Impersonate organization" title="Impersonate organization admin" onClick={() => void impersonateTenant(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                            {!(String(record.payment_status || "").toLowerCase() === "paid" || (String(record.status || "").toLowerCase() === "active" && !String(record.plan || "").toLowerCase().includes("trial"))) && (
                              <button type="button" aria-label="Update expiry" title="Update subscription expiry date" onClick={() => void updateExpiry(record)} className="super-admin-action-icon text-amber-400 hover:text-amber-300"><Calendar aria-hidden="true" size={16} /></button>
                            )}
                            {admin?.permissions?.includes("platform.payments.create") && !isAlreadyPaidRecord(record) && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => openPaymentLinkDialog(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                            {hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} title={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                            {canEditRecord(record) && <button type="button" aria-label="Edit organization" title="Edit organization" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                            {hasPermission("delete") && <button type="button" aria-label="Delete organization" title="Delete organization" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                          </>}
                          {moduleKey === "users" && <>
                            <button type="button" aria-label="View user" title="View user" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                            {canEditRecord(record) && <button type="button" aria-label="Edit user" title="Edit user" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                            {canDeleteRecord(record) && <button type="button" aria-label="Delete user" title="Delete user" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                          </>}
                          {moduleKey === "domains" && hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} title={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                          {moduleKey === "domains" && admin?.permissions?.includes("platform.payments.create") && !isAlreadyPaidRecord(record) && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => openPaymentLinkDialog(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
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
              {moduleKey === "subscriptions" ? paginatedRecords.map((record, index) => {
                const rawStatusStr = String(record.status || "trialing").toLowerCase();
                const endsDateObj = record.ends_at ? new Date(String(record.ends_at)) : null;
                const isPastDueDate = Boolean(endsDateObj && !isNaN(endsDateObj.getTime()) && endsDateObj.getTime() < Date.now());
                const isSuspended = rawStatusStr === "suspended";
                const isCancelled = rawStatusStr === "cancelled";
                const isExpired = rawStatusStr === "expired" || (isPastDueDate && !isSuspended && !isCancelled);
                const isTrial = !isExpired && (rawStatusStr === "trial" || rawStatusStr === "trialing");
                const isActive = !isExpired && rawStatusStr === "active";
                const statusStr = isExpired ? "expired" : rawStatusStr;
                const orgName = String(record.tenant_name || record.name || "Organization");
                const planName = String(record.tier_name || record.plan || "Growth");
                const billingCycle = isTrial ? `${record.trial_days || 14}-day trial` : "Yearly";
                let renewalDateStr = "—";
                if (endsDateObj && !isNaN(endsDateObj.getTime())) {
                  renewalDateStr = isExpired
                    ? `Expired ${endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : isTrial
                      ? `Trial ends ${endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : endsDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                }

                const isPaid = String(record.payment_status || "").toLowerCase() === "paid";
                const isPayLater =
                  !isPaid &&
                  (record.is_pay_later === true ||
                    String(record.payment_status || "").toLowerCase() === "pay_later" ||
                    Boolean(record.tenant_settings && typeof record.tenant_settings === "object" && (record.tenant_settings as any).pay_later === true));

                let expectedDateStr = "";
                if (record.expected_payment_date) {
                  const ed = new Date(String(record.expected_payment_date));
                  if (!isNaN(ed.getTime())) {
                    expectedDateStr = ed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }
                } else if (record.tenant_settings && (record.tenant_settings as any).expected_payment_date) {
                  const ed = new Date(String((record.tenant_settings as any).expected_payment_date));
                  if (!isNaN(ed.getTime())) {
                    expectedDateStr = ed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }
                }

                return (
                  <article key={String(record.id ?? index)} className="p-4 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{orgName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>
                        ) : isTrial ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">TRIAL</span>
                        ) : isExpired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">EXPIRED</span>
                        ) : isSuspended ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">SUSPENDED</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{statusStr.toUpperCase()}</span>
                        )}
                        {isPayLater && (
                          <span
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 text-[10px]"
                            title={`Pay Later Commitment${expectedDateStr ? ` • Payment promised by ${expectedDateStr}` : ""}`}
                          >
                            ⏳
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-400 block text-[10px] uppercase">Plan</span><span className="font-mono">{planName}</span></div>
                      <div><span className="text-slate-400 block text-[10px] uppercase">Billing Cycle</span><span>{billingCycle}</span></div>
                      <div><span className="text-slate-400 block text-[10px] uppercase">Next Renewal</span><span className="font-mono">{renewalDateStr}</span></div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                      {(isTrial || isExpired) && (
                        <button
                          type="button"
                          onClick={() => void handleUpdateTrial(record)}
                          className="flex-1 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-900 dark:text-amber-200 text-center"
                        >
                          Update trial
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleChangePlan(record)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-slate-800 dark:text-slate-200 text-center inline-flex items-center justify-center cursor-pointer"
                        title={`Change plan for ${orgName}`}
                      >
                        Change plan
                      </button>
                      <Link
                        to={`/admin/payments?org_id=${record.tenant_id || record.id}`}
                        className="flex-1 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-slate-800 dark:text-slate-200 text-center"
                      >
                        Payment history
                      </Link>
                    </div>
                  </article>
                );
              }) : paginatedRecords.map((record, index) => (
                <article key={String(record.id ?? index)} className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
                    {visibleColumns.map((column) => (
                      <div key={column} className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">{column.replace(/_/g, " ")}</p>
                        <p className="truncate text-sm text-slate-200">
                          {moduleKey === "roles" && column === "name"
                            ? `${"— ".repeat(Number(record.hierarchy_depth) || 0)}${displayValue(record[column], column)}`
                            : displayValue(record[column], column)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    {moduleKey === "organizations" && <>
                    <button type="button" aria-label="View organization" title="View organization" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                    <button type="button" aria-label="Impersonate organization" title="Impersonate organization admin" onClick={() => void impersonateTenant(record)} className="super-admin-action-icon text-indigo-400 hover:text-indigo-300"><ExternalLink aria-hidden="true" size={16} /></button>
                    {!(String(record.payment_status || "").toLowerCase() === "paid" || (String(record.status || "").toLowerCase() === "active" && !String(record.plan || "").toLowerCase().includes("trial"))) && (
                              <button type="button" aria-label="Update expiry" title="Update subscription expiry date" onClick={() => void updateExpiry(record)} className="super-admin-action-icon text-amber-400 hover:text-amber-300"><Calendar aria-hidden="true" size={16} /></button>
                            )}
                    {admin?.permissions?.includes("platform.payments.create") && !isAlreadyPaidRecord(record) && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => openPaymentLinkDialog(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
                    {hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} title={String(record.status).toLowerCase() === "active" ? "Suspend organization" : "Activate organization"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                    {canEditRecord(record) && <button type="button" aria-label="Edit organization" title="Edit organization" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                    {hasPermission("delete") && <button type="button" aria-label="Delete organization" title="Delete organization" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                    </>}
                    {moduleKey === "users" && <>
                    <button type="button" aria-label="View user" title="View user" onClick={() => beginView(record)} className="super-admin-action-icon"><Eye aria-hidden="true" size={17} /></button>
                    {canEditRecord(record) && <button type="button" aria-label="Edit user" title="Edit user" onClick={() => beginEdit(record)} className="super-admin-action-icon"><Pencil aria-hidden="true" size={16} /></button>}
                    {canDeleteRecord(record) && <button type="button" aria-label="Delete user" title="Delete user" onClick={() => void performAction("delete", record)} className="super-admin-action-icon super-admin-action-icon-danger"><Trash2 aria-hidden="true" size={17} /></button>}
                    </>}
                    {moduleKey === "domains" && hasPermission("edit") && <button type="button" aria-label={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} title={String(record.status).toLowerCase() === "active" ? "Suspend domain" : "Activate domain"} onClick={() => void performAction("status", record)} className="super-admin-action-icon"><Power aria-hidden="true" size={17} /></button>}
                    {moduleKey === "domains" && admin?.permissions?.includes("platform.payments.create") && !isAlreadyPaidRecord(record) && <button type="button" aria-label="Send payment link" title="Send payment link" onClick={() => openPaymentLinkDialog(record)} className="super-admin-action-icon"><Send aria-hidden="true" size={17} /></button>}
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

            {totalItems > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}
          </>
        )}
      </div>}
      {moduleKey === "domains" && <p className="mt-3 text-xs text-slate-500">Domain management uses the platform tenant directory. Domain values are shown only when provided by the API.</p>}
    </section>
  );
};

export default SuperAdminModulePage;
