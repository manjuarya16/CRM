import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSuperAdminStore } from "@/store/superAdminStore";
import SuperAdminDashboard from "@/pages/SuperAdmin/Dashboard";
import SuperAdminModulePage from "@/pages/SuperAdmin/ModulePage.tsx";
import NotificationDropdown from "@/pages/SuperAdmin/NotificationDropdown";
import EmailTemplatesPage from "@/pages/SuperAdmin/EmailTemplatesPage";
import "@/pages/SuperAdmin/superAdminTheme.css";
import { API } from "@/config";
import {
  Bell,
  Building2,
  CalendarDays,
  FileText,
  Gem,
  Globe2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Receipt,
  Shield,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

const menuItems = [
  { key: "dashboard", permission: "platform.dashboard.view", label: "Dashboard", icon: LayoutDashboard },
  { key: "organizations", permission: "platform.organizations.view", label: "Organizations", icon: Building2 },
  { key: "domains", permission: "platform.domains.view", label: "Domains & Subdomains", icon: Globe2 },
  { key: "subscriptions", permission: "platform.subscriptions.view", label: "Subscriptions", icon: Gem },
  { key: "payments", permission: "platform.payments.view", label: "Payment Details", icon: Receipt },
  { key: "users", permission: "platform.users.view", label: "Users", icon: Users },
  { key: "roles", permission: "platform.roles.view", label: "Roles", icon: ShieldCheck },
  { key: "access-management", permission: "platform.access_management.view", label: "Access Management", icon: KeyRound },
  { key: "demos", permission: "platform.demos.view", label: "Demo Requests", icon: CalendarDays },
  { key: "pricing", permission: "platform.pricing.view", label: "Pricing Tiers", icon: Tags },
  { key: "email-templates", permission: "platform.email_templates.view", label: "Email Templates", icon: FileText },
  { key: "smtp", permission: "platform.smtp.view", label: "SMTP Configuration", icon: Mail },
  { key: "notifications", permission: "platform.notifications.view", label: "Notifications", icon: Bell },
];

const SuperAdminPortal: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [moduleRefreshKey, setModuleRefreshKey] = useState(0);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const admin = useSuperAdminStore((state) => state.admin);
  const token = useSuperAdminStore((state) => state.token);
  const logout = useSuperAdminStore((state) => state.logout);
  const refreshAdminProfile = useSuperAdminStore((state) => state.refreshAdminProfile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const permissions = admin?.permissions || [];
  const isPlatformOwner = Boolean(admin?.is_platform_owner);
  const hasPermission = useCallback(
    (perm: string) =>
      isPlatformOwner ||
      permissions.includes(perm) ||
      permissions.includes(perm.replace(/^platform\./, "")),
    [isPlatformOwner, permissions]
  );
  const accessibleMenuItems = useMemo(
    () => menuItems.filter((item) => hasPermission(item.permission)),
    [hasPermission]
  );
  const section = pathname
    .replace(/^\/super-admin(?:\/|$)/i, "")
    .replace(/^\/+/, "")
    .split("/")[0]
    .toLowerCase() || "dashboard";
  const activeItem = menuItems.find((item) => item.key === section);
  const activeSection = activeItem?.key || "dashboard";
  const isPathBasedPortal = pathname.toLowerCase().startsWith("/super-admin");
  const portalBasePath = isPathBasedPortal ? "/super-admin" : "";

  useEffect(() => {
    if (!token) return;
    API.get("/super-admin/sidebar-counts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          setCounts(res.data.data);
        }
      })
      .catch(() => {});
  }, [token, pathname, moduleRefreshKey]);

  useEffect(() => {
    let active = true;
    setProfileLoading(true);
    refreshAdminProfile()
      .then(() => setProfileError(""))
      .catch((error: Error) => setProfileError(error.message))
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => { active = false; };
  }, [refreshAdminProfile]);

  useEffect(() => {
    let active = true;
    const refreshOnFocus = () => {
      void refreshAdminProfile()
        .then(() => {
          if (active) setProfileError("");
        })
        .catch((error: Error) => {
          if (active) setProfileError(error.message);
        });
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshAdminProfile]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    if (profileLoading || profileError || accessibleMenuItems.length === 0) return;
    if (!activeItem || !hasPermission(activeItem.permission)) {
      const next = accessibleMenuItems[0];
      navigate(`${portalBasePath}/${next.key === "dashboard" ? "" : next.key}`, { replace: true });
    }
  }, [accessibleMenuItems, activeItem, hasPermission, navigate, portalBasePath, profileError, profileLoading]);

  return (
    <div className="super-admin-theme min-h-screen bg-[#f3f4f7] text-gray-800 xl:flex">
      <aside className="border-b border-gray-200 bg-white xl:fixed xl:inset-y-0 xl:flex xl:w-64 xl:flex-col xl:border-b-0 xl:border-r shadow-sm">
        {/* Brand Header matching domain theme logo box */}
        <div
          className="flex h-[70px] items-center gap-3 border-b border-[#03075e] bg-[#040975] px-5"
          style={{ height: "70px", background: "#040975" }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white shadow-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white leading-tight">Super Admin</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200/80">CRM Console</p>
          </div>
        </div>

        <nav aria-label="Super admin menu" className="flex gap-1 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:overflow-y-auto">
          <p className="hidden px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 xl:block">
            Super Admin Suite
          </p>
          {accessibleMenuItems.map((item) => {
            const active = activeSection === item.key;
            return (
              <Link
                key={item.key}
                to={`${portalBasePath}/${item.key === "dashboard" ? "" : item.key}`}
                onClick={() => {
                  if (active) setModuleRefreshKey((current) => current + 1);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all xl:w-full ${
                  active
                    ? "bg-[#040975] text-white shadow-sm font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-[#040975]"
                }`}
              >
                <item.icon aria-hidden="true" size={18} strokeWidth={active ? 2.4 : 2} className={active ? "text-white" : "text-gray-400 group-hover:text-[#040975]"} />
                <span className="whitespace-nowrap">{item.label}</span>
                {counts[item.key] !== undefined && counts[item.key] > 0 && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-blue-50 text-[#040975] border border-blue-100"
                  }`}>
                    {counts[item.key]}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-gray-200 bg-gray-50/60 p-4 xl:block">
          <p className="truncate text-xs font-bold text-gray-800">{admin?.name || "Super Admin"}</p>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">{admin?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-red-600"
          >
            <LogOut aria-hidden="true" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 xl:pl-64 bg-[#f3f4f7]">
        {/* Topbar matching domain theme style */}
        <div
          className="sticky top-0 z-40 flex h-[70px] items-center justify-between border-b border-gray-200 bg-white/95 px-6 backdrop-blur shadow-sm"
          style={{ height: "70px" }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-gray-800">{activeItem?.label || "Super Admin"}</h1>
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#040975] border border-blue-100">
              Platform Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            {permissions.includes("platform.notifications.view") && (
              <NotificationDropdown
                canEdit={permissions.includes("platform.notifications.edit")}
                canDelete={permissions.includes("platform.notifications.delete")}
              />
            )}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200 text-xs">
              <span className="font-semibold text-gray-800">{admin?.name || "Super Admin"}</span>
              <span className="text-[10px] rounded bg-blue-50 px-2 py-0.5 text-[#040975] font-semibold border border-blue-100">Platform Admin</span>
            </div>
          </div>
        </div>
        {profileLoading ? (
          <div role="status" className="p-8 text-sm text-slate-400">Loading role access…</div>
        ) : profileError ? (
          <div role="alert" className="m-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{profileError}</div>
        ) : accessibleMenuItems.length === 0 ? (
          <div role="status" className="m-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h1 className="font-semibold text-white">No platform access assigned</h1>
            <p className="mt-1 text-sm text-slate-400">Ask a Super Admin to assign permissions to your role.</p>
          </div>
        ) : activeSection === "dashboard" || activeSection === "organizations" ? (
          <SuperAdminDashboard
            key={activeSection}
            showMetrics={activeSection === "dashboard"}
            canViewOrganizations={hasPermission("platform.organizations.view")}
            canCreateOrganizations={hasPermission("platform.organizations.create")}
            canEditOrganizations={hasPermission("platform.organizations.edit")}
            canSendPaymentLinks={hasPermission("platform.payments.create")}
          />
        ) : activeSection === "email-templates" ? (
          <EmailTemplatesPage
            key={`email-templates-${moduleRefreshKey}`}
            title={activeItem?.label || "Email Templates"}
            canCreate={hasPermission("platform.email_templates.create")}
            canEdit={hasPermission("platform.email_templates.edit")}
            canDelete={hasPermission("platform.email_templates.delete")}
          />
        ) : (
          activeItem && <SuperAdminModulePage key={`${activeItem.key}-${moduleRefreshKey}`} moduleKey={activeItem.key} title={activeItem.label} />
        )}
      </main>
    </div>
  );
};

export default SuperAdminPortal;
