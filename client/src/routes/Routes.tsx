import React from "react";
import {
  Navigate,
  Route,
  RouteObject,
  RouteProps,
  Routes,
} from "react-router-dom";

// All layouts containers
import DefaultLayout from "../layouts/Default";
import VerticalLayout from "../layouts/Vertical";
import MarketingLayout from "../layouts/MarketingLayout";

import {
  authProtectedFlattenRoutes,
  publicProtectedFlattenRoutes,
  marketingFlattenRoutes,
} from ".";
import { getToken, isTokenExpired } from "../lib/auth-utils";
import useModuleAccess from "../hooks/useModuleAccess";
import { useAuthStore } from "../store";
import { getSubdomain } from "../utils/subdomain";
import { useSuperAdminStore } from "../store/superAdminStore";
import SuperAdminLogin from "../pages/SuperAdmin/Login";
import SuperAdminDashboard from "../pages/SuperAdmin/Dashboard";
import WorkspaceFinder from "../pages/other/Auth/WorkspaceFinder";

// Wrapper component to check module access
const ModuleAccessWrapper = ({ element, moduleKey, ...props }: any) => {
  const { user } = useAuthStore();
  const moduleAccess = useModuleAccess(moduleKey || "");

  // If module key is provided and user doesn't have view permission, deny access
  if (moduleKey && user && !moduleAccess.can_view) {
    return <Navigate to="/" />;
  }

  return element;
};

const AllRoutes = (props: RouteProps) => {
  const subdomain = getSubdomain();
  const superAdminToken = useSuperAdminStore((s) => s.token);
  const isSuperAdminAuth = useSuperAdminStore((s) => s.isAuthenticated);
  const isSuperAdminAuthenticated = Boolean(
    isSuperAdminAuth && superAdminToken && !isTokenExpired(superAdminToken)
  );

  // 1. Super Admin Subdomain (e.g. admin.localhost:5173 or admin.yourcrm.com)
  if (subdomain.type === "admin") {
    return isSuperAdminAuthenticated ? <SuperAdminDashboard /> : <SuperAdminLogin />;
  }

    // 2. Root domain without tenant subdomain (e.g. localhost:5173 or yourcrm.com)
  // if (subdomain.type === "root") {
  //   const currentPath = window.location.pathname.toLowerCase();
  //   const isAuthRoute =
  //     currentPath === "/login" ||
  //     currentPath === "/auth/login" ||
  //     currentPath.startsWith("/forms/") ||
  //     currentPath === "/recover-password" ||
  //     currentPath === "/auth/recover-password";

  //   if (!isAuthRoute) {
  //     return (
  //       <Routes>
  //         <Route
  //           path="/super-admin"
  //           element={isSuperAdminAuthenticated ? <SuperAdminDashboard /> : <SuperAdminLogin />}
  //         />
  //         <Route path="*" element={<WorkspaceFinder />} />
  //       </Routes>
  //     );
  //   }
  // }


  const isAuthenticated = (() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) return false;
    return true;
  })();

  return (
    <React.Fragment>
      <Routes>
        {/* Super admin direct route */}
        <Route
          path="/super-admin"
          element={isSuperAdminAuthenticated ? <SuperAdminDashboard /> : <SuperAdminLogin />}
        />

        {/* Workspace finder preserved route */}
        <Route path="/find-workspace" element={<WorkspaceFinder />} />
        <Route path="/workspace-finder" element={<WorkspaceFinder />} />

        {/* Marketing website routes (Landing page, features, pricing, etc.) */}
        <Route>
          {(marketingFlattenRoutes || []).map(
            (route: RouteObject, idx: number) => (
              <Route
                path={route.path}
                element={
                  <MarketingLayout {...props}>{route.element}</MarketingLayout>
                }
                key={`mkt-${idx}`}
              />
            ),
          )}
        </Route>

        {/* Public auth and form routes */}
        <Route>
          {(publicProtectedFlattenRoutes || []).map(
            (route: RouteObject, idx: number) => (
              <Route
                path={route.path}
                element={
                  <DefaultLayout {...props}>{route.element}</DefaultLayout>
                }
                key={`pub-${idx}`}
              />
            ),
          )}
        </Route>

        {/* Auth protected CRM app routes (Dashboard, Leads, Contacts, etc.) */}
        <Route>
          {(authProtectedFlattenRoutes || []).map(
            (route: RouteObject & { moduleKey?: string }, idx: number) => (
              <Route
                path={route.path}
                element={
                  !isAuthenticated ? (
                    <Navigate
                      to={{
                        pathname: "/auth/login",
                        search: "next=" + route.path,
                      }}
                    />
                  ) : (
                    <VerticalLayout {...props}>
                      <ModuleAccessWrapper
                        element={route.element}
                        moduleKey={route.moduleKey}
                      />
                    </VerticalLayout>
                  )
                }
                key={`auth-${idx}`}
              />
            ),
          )}
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Fragment>
  );
};

export default AllRoutes;
