import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSuperAdminStore } from "@/store/superAdminStore";
import SuperAdminDashboard from "@/pages/SuperAdmin/Dashboard";
import SuperAdminModulePage from "@/pages/SuperAdmin/ModulePage.tsx";

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: "mgc_home_3_line" },
  { key: "organizations", label: "Organizations", icon: "mgc_building_1_line" },
  { key: "domains", label: "Domains & Subdomains", icon: "mgc_world_line" },
  { key: "subscriptions", label: "Subscriptions", icon: "mgc_diamond_line" },
  { key: "payments", label: "Payment Details", icon: "mgc_bill_line" },
  { key: "users", label: "Users", icon: "mgc_group_line" },
  { key: "roles", label: "Roles", icon: "mgc_safe_shield_line" },
  { key: "access-management", label: "Access Management", icon: "mgc_lock_key_line" },
  { key: "demos", label: "Demo Requests", icon: "mgc_calendar_line" },
  { key: "pricing", label: "Pricing Tiers", icon: "mgc_tag_2_line" },
  { key: "email-templates", label: "Email Templates", icon: "mgc_document_line" },
  { key: "smtp", label: "SMTP Configuration", icon: "mgc_mail_send_line" },
  { key: "notifications", label: "Notifications", icon: "mgc_notification_line" },
];

const SuperAdminPortal: React.FC = () => {
  const { pathname } = useLocation();
  const admin = useSuperAdminStore((state) => state.admin);
  const logout = useSuperAdminStore((state) => state.logout);
  const section = pathname
    .replace(/^\/super-admin(?:\/|$)/i, "")
    .replace(/^\/+/, "")
    .split("/")[0]
    .toLowerCase() || "dashboard";
  const activeSection = menuItems.some((item) => item.key === section) ? section : "dashboard";
  const activeItem = menuItems.find((item) => item.key === activeSection) || menuItems[0];
  const isPathBasedPortal = pathname.toLowerCase().startsWith("/super-admin");
  const portalBasePath = isPathBasedPortal ? "/super-admin" : "";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 xl:flex">
      <aside className="border-b border-slate-800 bg-slate-900 xl:fixed xl:inset-y-0 xl:flex xl:w-64 xl:flex-col xl:border-b-0 xl:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-600/20 text-indigo-400">
            <i className="mgc_shield_line text-lg" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Super Admin</p>
            <p className="text-[11px] text-slate-400">Platform Console</p>
          </div>
        </div>

        <nav aria-label="Super admin menu" className="flex gap-1 overflow-x-auto p-3 xl:flex-1 xl:flex-col xl:overflow-y-auto">
          <p className="hidden px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 xl:block">
            Super Admin Suite
          </p>
          {menuItems.map((item) => {
            const active = activeSection === item.key;
            return (
              <Link
                key={item.key}
                to={`${portalBasePath}/${item.key === "dashboard" ? "" : item.key}`}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors xl:w-full ${
                  active
                    ? "bg-indigo-600/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <i className={`${item.icon} text-base`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-800 p-4 xl:block">
          <p className="truncate text-xs font-medium text-slate-200">{admin?.name || "Super Admin"}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{admin?.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <i className="mgc_exit_line text-sm" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 xl:pl-64">
        {activeSection === "dashboard" || activeSection === "organizations" ? (
          <SuperAdminDashboard key={activeSection} showMetrics={activeSection === "dashboard"} />
        ) : (
          <SuperAdminModulePage key={activeItem.key} moduleKey={activeItem.key} title={activeItem.label} />
        )}
      </main>
    </div>
  );
};

export default SuperAdminPortal;
