import { ReactNode, useEffect } from "react";
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

const PageBreadcrumb = ({
  breadCrumbItems,
  title,
  name,
  children,
}: PageTitleProps) => {
  const { organization, getOrganization } = useOrganizationStore();
  const { userLoggedIn } = useAuthStore();

  useEffect(() => {
    if (userLoggedIn && !organization) getOrganization();
  }, []);

  const orgName = organization?.name || "CRM";

  const resolvedItems = (breadCrumbItems || []).map((item, idx) =>
    idx === 0 ? orgName || item : item,
  );

  return (
    <>
      <Helmet>
        <title>
          {title} | {orgName} - Admin Dashboard
        </title>
      </Helmet>
      {name && (
        <div className="flex flex-col mb-6">
          <div className="flex gap-3">
            <h4 className="text-slate-900 dark:text-slate-200 text-lg font-medium">
              {name}
            </h4>
            {children}
          </div>
          <div className="md:flex hidden items-center gap-2.5 text-sm font-semibold mt-1">
            {resolvedItems.map((item, idx) => {
              const isLast = idx === resolvedItems.length - 1;
              const originalItem = breadCrumbItems?.[idx] || "";
              const route = routeMap[originalItem];

              return (
                <div key={idx} className="flex items-center gap-2">
                  {idx !== 0 && (
                    <i className="mgc_right_line text-lg flex-shrink-0 text-slate-400 rtl:rotate-180"></i>
                  )}
                  {!isLast && (route || idx === 0) ? (
                    <Link
                      to={idx === 0 ? "/dashboard" : route!}
                      className="text-sm font-medium text-slate-700 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
                    >
                      {item}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-500">
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
