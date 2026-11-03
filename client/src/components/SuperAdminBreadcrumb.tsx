import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

export interface SuperAdminBreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

interface SuperAdminBreadcrumbProps {
  title?: string;
  items: Array<string | SuperAdminBreadcrumbItem>;
  children?: React.ReactNode;
}

export const SuperAdminBreadcrumb: React.FC<SuperAdminBreadcrumbProps> = ({
  title,
  items,
  children,
}) => {
  const isSubdomain = typeof window !== "undefined" && window.location.hostname.startsWith("admin.");
  const isSuperAdminPrefix = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin");
  const basePath = isSubdomain ? "" : isSuperAdminPrefix ? "/super-admin" : "/admin";

  const normalizedItems: SuperAdminBreadcrumbItem[] = items.map((item, idx) => {
    if (typeof item === "string") {
      const isLast = idx === items.length - 1;
      let path: string | undefined = undefined;

      if (!isLast) {
        const lower = item.toLowerCase();
        if (lower === "super admin" || lower === "dashboard") {
          path = basePath || "/";
        } else if (lower === "organizations" || lower === "tenants") {
          path = `${basePath}/organizations`;
        } else if (lower === "domains" || lower === "domains & ssl") {
          path = `${basePath}/domains`;
        } else if (lower === "payments" || lower === "billing") {
          path = `${basePath}/payments`;
        } else if (lower === "email templates") {
          path = `${basePath}/email-templates`;
        } else if (lower === "demo requests") {
          path = `${basePath}/demo-requests`;
        } else if (lower === "pricing" || lower === "subscription plans") {
          path = `${basePath}/pricing`;
        } else if (lower === "staff" || lower === "users") {
          path = `${basePath}/users`;
        } else if (lower === "roles") {
          path = `${basePath}/roles`;
        } else if (lower === "smtp") {
          path = `${basePath}/smtp`;
        }
      }

      return {
        label: item,
        path,
        active: isLast,
      };
    }
    return item;
  });

  const activeItem = normalizedItems.find((i) => i.active) || normalizedItems[normalizedItems.length - 1];
  const docTitle = title || activeItem?.label || "Super Admin";

  return (
    <>
      <Helmet>
        <title>{docTitle} | Super Admin Platform Console</title>
      </Helmet>
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 mb-4 border-b border-gray-200/70 dark:border-gray-800">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
          <Link
            to={basePath || "/"}
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#040975] dark:text-gray-400 dark:hover:text-blue-400 font-medium transition-colors"
          >
            <i className="mgc_home_3_line text-base text-[#040975]"></i>
            <span className="hidden xs:inline">Console</span>
          </Link>

          {normalizedItems.map((item, idx) => (
            <React.Fragment key={idx}>
              <i className="mgc_right_line text-xs text-gray-400 dark:text-gray-600 shrink-0 rtl:rotate-180"></i>
              {item.path && !item.active ? (
                <Link
                  to={item.path}
                  className="font-medium text-gray-600 hover:text-[#040975] dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-white">
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </>
  );
};

export default SuperAdminBreadcrumb;
