import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useOrganizationStore, useAuthStore } from "../store";
import { Link } from "react-router-dom";
import type { PageTitleProps } from "@/interface/commonInterface";

const routeMap: Record<string, string> = {
  // Top-level labels
  Dashboard: "/dashboard",
  Management: "/dashboard",
  // CRM Apps & Modules
  Leads: "/leads",
  Quotes: "/quotes",
  Mail: "/mail",
  Activities: "/activities",
  Contacts: "/contacts/persons",
  Persons: "/contacts/persons",
  Organizations: "/contacts/organizations",
  Products: "/products",
  Settings: "/settings",
  "Subscription & Billing": "/subscription",
  "All Settings": "/settings",
  Groups: "/settings/groups",
  Roles: "/settings/roles",
  "Role Management": "/settings/roles",
  Users: "/settings/users",
  "User Management": "/settings/users",
  Pipelines: "/settings/pipelines",
  Sources: "/settings/sources",
  Types: "/settings/types",
  Configuration: "/configuration",
  "Help & Resources": "/help",
  Help: "/help",
  Profile: "/profile",
};

const getSuperAdminRoute = (item: string) => {
  const isSubdomain = typeof window !== "undefined" && window.location.hostname.startsWith("admin.");
  const isSuperAdminPrefix = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");
  const base = isSubdomain ? "" : isSuperAdminPrefix ? "/super-admin" : "/admin";

  switch (item.toLowerCase()) {
    case "super admin":
    case "dashboard":
    case "executive dashboard":
      return base || "/";
    case "organizations":
    case "tenants":
      return `${base}/organizations`;
    case "create":
    case "create organization":
      return `${base}/organizations/create`;
    case "edit":
    case "edit organization":
      return `${base}/organizations`;
    case "domains":
    case "domains & subdomains":
    case "organization domains":
      return `${base}/domains`;
    case "payments":
    case "payment & billing":
    case "payments & collections":
    case "payments & invoices":
      return `${base}/payments`;
    case "email templates":
      return `${base}/email-templates`;
    case "demo requests":
      return `${base}/demo-requests`;
    case "pricing":
    case "subscription tiers":
      return `${base}/pricing`;
    case "users":
    case "platform staff":
      return `${base}/users`;
    case "roles":
    case "roles & permissions":
      return `${base}/roles`;
    case "smtp":
    case "smtp configuration":
      return `${base}/smtp`;
    default:
      return undefined;
  }
};

const PageBreadcrumb = ({
  breadCrumbItems,
  title,
  name,
  children,
}: PageTitleProps) => {
  const { organization, getOrganization } = useOrganizationStore();
  const { userLoggedIn } = useAuthStore();

  const isSuperAdminContext =
    breadCrumbItems?.[0] === "Super Admin" ||
    (typeof window !== "undefined" && (
      window.location.hostname.startsWith("admin.") ||
      window.location.pathname.startsWith("/super-admin") ||
      window.location.pathname.startsWith("/admin")
    ));

  useEffect(() => {
    if (!isSuperAdminContext && userLoggedIn && !organization) getOrganization();
  }, [isSuperAdminContext, userLoggedIn, organization, getOrganization]);

  const orgName = organization?.name || "CRM";

  const resolvedItems = (breadCrumbItems || []).map((item, idx) => {
    if (idx === 0) {
      if (item === "Super Admin" || isSuperAdminContext) return item || "Super Admin";
      return orgName || item;
    }
    return item;
  });

  const pageDocTitle = isSuperAdminContext
    ? `${title} | Super Admin Platform Console`
    : `${title} | ${orgName} - Admin Dashboard`;

  return (
    <>
      <Helmet>
        <title>{pageDocTitle}</title>
      </Helmet>
      {name && (
        <div className="flex flex-col mb-6">
          <div className="flex gap-3">
            <h4 className="text-slate-900 dark:text-slate-200 text-lg font-medium">
              {name}
            </h4>
            {children}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold mt-1">
            {resolvedItems.map((item, idx) => {
              const isLast = idx === resolvedItems.length - 1;
              const originalItem = breadCrumbItems?.[idx] || "";
              const route = isSuperAdminContext
                ? getSuperAdminRoute(originalItem)
                : routeMap[originalItem];

              const linkTarget = isSuperAdminContext
                ? (idx === 0 ? (getSuperAdminRoute("super admin") || "/") : route!)
                : (idx === 0 ? "/dashboard" : route!);

              return (
                <div key={idx} className="flex items-center gap-2">
                  {idx !== 0 && (
                    <i className="mgc_right_line text-base flex-shrink-0 text-slate-400 rtl:rotate-180"></i>
                  )}
                  {!isLast && (route || idx === 0) ? (
                    <Link
                      to={linkTarget}
                      className="text-xs sm:text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                    >
                      {item}
                    </Link>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {item}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default PageBreadcrumb;
