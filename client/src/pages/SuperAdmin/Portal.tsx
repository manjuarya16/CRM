import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { useSuperAdminStore } from "@/store/superAdminStore";
import SuperAdminDashboard from "@/pages/SuperAdmin/Dashboard";
import SuperAdminOrganizations from "@/pages/admin/Organizations";
import SuperAdminDomains from "@/pages/admin/Domains";
import SuperAdminPayments from "@/pages/admin/Payments";
import SuperAdminOrganizationCreate from "@/pages/admin/CreateOrganization";
import SuperAdminOrganizationEdit from "@/pages/admin/EditOrganization";
import SuperAdminModulePage from "@/pages/SuperAdmin/ModulePage.tsx";
import NotificationDropdown from "@/pages/SuperAdmin/NotificationDropdown";
import EmailTemplatesPage from "@/pages/SuperAdmin/EmailTemplatesPage";
import useAppLogo from "@/hooks/useAppLogo";
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
  Menu,
  Receipt,
  Shield,
  ShieldCheck,
  Tags,
  Users,
  X,
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
  const { admin, token, logout, refreshAdminProfile } = useSuperAdminStore();
  const { logoLight, orgName } = useAppLogo();
  const [counts, setCounts] = useState<{ [key: string]: number }>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [moduleRefreshKey, setModuleRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const permissions = useMemo(() => admin?.permissions || [], [admin?.permissions]);

  const hasPermission = useCallback(
    (perm?: string) => {
      if (!perm) return true;
      if (perm === "platform.dashboard.view") return true;
      if (admin?.role_name === "Platform Owner" || admin?.role_name === "Super Admin") return true;
      return permissions.includes(perm);
    },
    [admin?.role_name, permissions]
  );

  const accessibleMenuItems = useMemo(
    () => menuItems.filter((item) => hasPermission(item.permission)),
    [hasPermission]
  );

  const portalBasePath = useMemo(() => {
    if (pathname.startsWith("/super-admin")) return "/super-admin";
    if (pathname.startsWith("/admin")) return "/admin";
    return "";
  }, [pathname]);

  const getMenuItemPath = useCallback(
    (key: string) => {
      if (portalBasePath) {
        return key === "dashboard" ? portalBasePath : `${portalBasePath}/${key}`;
      }
      return key === "dashboard" ? "/" : `/${key}`;
    },
    [portalBasePath]
  );

  const cleanPath = pathname
    .replace(/^\/(?:super-admin|admin)(?:\/|$)/i, "")
    .replace(/^\/+/, "");

  const pathSegments = cleanPath.split("/").filter(Boolean);
  const section = pathSegments[0]?.toLowerCase() || "dashboard";
  const subSection = pathSegments[1]?.toLowerCase() || "";
  const thirdSegment = pathSegments[2]?.toLowerCase() || "";

  const activeItem = menuItems.find((item) => item.key === section);
  const activeSection = activeItem?.key || (section === "organizations" ? "organizations" : "dashboard");

  const breadcrumbTrail = useMemo(() => {
    const isOrgCreate = activeSection === "organizations" && subSection === "create";
    const isOrgEdit = activeSection === "organizations" && (subSection === "edit" || thirdSegment === "edit");

    const trail: Array<{ label: string; path?: string; active?: boolean }> = [
      { label: "Super Admin", path: getMenuItemPath("dashboard") }
    ];

    if (activeSection === "dashboard") {
      trail.push({ label: "Executive Dashboard", active: true });
    } else if (isOrgCreate) {
      trail.push({ label: "Organizations", path: getMenuItemPath("organizations") });
      trail.push({ label: "Create Organization", active: true });
    } else if (isOrgEdit) {
      trail.push({ label: "Organizations", path: getMenuItemPath("organizations") });
      trail.push({ label: "Edit Organization", active: true });
    } else if (activeSection === "organizations") {
      trail.push({ label: "Organizations", active: true });
    } else if (activeSection === "domains") {
      trail.push({ label: "Domains & Subdomains", active: true });
    } else if (activeSection === "payments") {
      trail.push({ label: "Payment Details", active: true });
    } else if (activeSection === "email-templates") {
      trail.push({ label: "Email Templates", active: true });
    } else if (activeItem) {
      trail.push({ label: activeItem.label, active: true });
    } else {
      const formatted = section.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      trail.push({ label: formatted || "Console", active: true });
    }

    return trail;
  }, [activeItem, activeSection, getMenuItemPath, section, subSection, thirdSegment]);

  const currentBreadcrumbLabel = breadcrumbTrail[breadcrumbTrail.length - 1]?.label || activeItem?.label || "Super Admin";

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
    setMobileMenuOpen(false);
  }, [activeSection, pathname]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (profileLoading || profileError || accessibleMenuItems.length === 0) return;
    if (!activeItem || !hasPermission(activeItem.permission)) {
      const next = accessibleMenuItems[0];
      navigate(getMenuItemPath(next.key), { replace: true });
    }
  }, [accessibleMenuItems, activeItem, getMenuItemPath, hasPermission, navigate, profileError, profileLoading]);

  return (
    <div className="super-admin-theme min-h-screen bg-[#f3f4f7] text-gray-800 xl:flex">
      <Helmet>
        <title>{currentBreadcrumbLabel} | Super Admin Platform Console</title>
      </Helmet>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close mobile navigation"
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMobileMenuOpen(false);
          }}
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs transition-opacity xl:hidden"
        />
      )}

      {/* Sidebar: Fixed on Desktop (xl+), Off-canvas Slide-over on Mobile (< xl) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 xl:w-64 flex-col border-r border-gray-200 bg-white shadow-xl xl:shadow-sm transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        }`}
      >
        {/* Brand Header matching domain theme logo box */}
        <div
          className="relative flex h-[76px] items-center justify-center border-b border-[#03075e] bg-[#040975] px-4 shrink-0"
          style={{ height: "76px", background: "#040975" }}
        >
          <Link to="/" className="flex items-center justify-center w-full overflow-hidden hover:opacity-95 transition-opacity" aria-label="Home">
            <img
              src="/logo-2.png"
              alt={orgName || "MORSE CRM"}
              className="h-14 max-h-[60px] w-auto max-w-[210px] object-contain object-center drop-shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith("/logonew.png")) {
                  target.src = "/logonew.png";
                }
              }}
            />
          </Link>
          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white xl:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Super admin menu" className="flex-1 flex-col overflow-y-auto p-3 space-y-1">
          <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Super Admin Suite
          </p>
          {accessibleMenuItems.map((item) => {
            const active = activeSection === item.key;
            return (
              <Link
                key={item.key}
                to={getMenuItemPath(item.key)}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (active) setModuleRefreshKey((current) => current + 1);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all w-full ${
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

        {/* User profile & Logout footer in sidebar */}
        <div className="border-t border-gray-200 bg-gray-50/70 p-4 shrink-0">
          <p className="truncate text-xs font-bold text-gray-800">{admin?.name || "Super Admin"}</p>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">{admin?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
          >
            <LogOut aria-hidden="true" size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 xl:pl-64 bg-[#f3f4f7]">
        {/* Topbar matching domain theme style */}
        <div
          className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-gray-200 bg-white/95 px-3 sm:px-6 backdrop-blur shadow-sm"
          style={{ height: "70px" }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger button for mobile/tablet screens */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 xl:hidden shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">{currentBreadcrumbLabel}</h1>
            <span className="hidden md:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#040975] border border-blue-100 shrink-0">
              Platform Console
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {permissions.includes("platform.notifications.view") && (
              <NotificationDropdown
                canEdit={permissions.includes("platform.notifications.edit")}
                canDelete={permissions.includes("platform.notifications.delete")}
              />
            )}
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200 text-xs">
              <span className="font-semibold text-gray-800 truncate max-w-[120px]">{admin?.name || "Super Admin"}</span>
              <span className="text-[10px] rounded bg-blue-50 px-2 py-0.5 text-[#040975] font-semibold border border-blue-100">Admin</span>
            </div>
          </div>
        </div>

        {/* Universal Breadcrumb Bar */}
        <div className="border-b border-gray-200/80 bg-white/70 px-4 sm:px-6 py-2.5 backdrop-blur-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
              {breadcrumbTrail.map((crumb, idx) => {
                const isLast = idx === breadcrumbTrail.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <i className="mgc_right_line text-xs text-gray-400 rtl:rotate-180 shrink-0"></i>
                    )}
                    {crumb.path && !isLast ? (
                      <Link
                        to={crumb.path}
                        className="inline-flex items-center gap-1 text-gray-500 hover:text-[#040975] font-medium transition-colors"
                      >
                        {idx === 0 && <i className="mgc_home_3_line text-sm text-[#040975] shrink-0"></i>}
                        <span>{crumb.label}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                        {idx === 0 && <i className="mgc_home_3_line text-sm text-[#040975] shrink-0"></i>}
                        <span>{crumb.label}</span>
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono">Super Admin Console</span>
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
        ) : activeSection === "organizations" && subSection === "create" ? (
          <div className="p-4 sm:p-6">
            <SuperAdminOrganizationCreate />
          </div>
        ) : activeSection === "organizations" && (subSection === "edit" || thirdSegment === "edit") ? (
          <div className="p-4 sm:p-6">
            <SuperAdminOrganizationEdit />
          </div>
        ) : activeSection === "organizations" ? (
          <div className="p-4 sm:p-6">
            <SuperAdminOrganizations />
          </div>
        ) : activeSection === "domains" ? (
          <div className="p-4 sm:p-6">
            <SuperAdminDomains />
          </div>
        ) : activeSection === "payments" ? (
          <div className="p-4 sm:p-6">
            <SuperAdminPayments />
          </div>
        ) : activeSection === "dashboard" ? (
          <div className="p-4 sm:p-6">
            <SuperAdminDashboard
              key={activeSection}
              showMetrics={true}
              canViewOrganizations={hasPermission("platform.organizations.view")}
              canCreateOrganizations={hasPermission("platform.organizations.create")}
              canEditOrganizations={hasPermission("platform.organizations.edit")}
              canSendPaymentLinks={hasPermission("platform.payments.create")}
            />
          </div>
        ) : activeSection === "email-templates" ? (
          <div className="p-4 sm:p-6">
            <EmailTemplatesPage
              key={`email-templates-${moduleRefreshKey}`}
              title={activeItem?.label || "Email Templates"}
              canCreate={hasPermission("platform.email_templates.create")}
              canEdit={hasPermission("platform.email_templates.edit")}
              canDelete={hasPermission("platform.email_templates.delete")}
            />
          </div>
        ) : (
          activeItem && (
            <div className="p-4 sm:p-6">
              <SuperAdminModulePage key={`${activeItem.key}-${moduleRefreshKey}`} moduleKey={activeItem.key} title={activeItem.label} />
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default SuperAdminPortal;
