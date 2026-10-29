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

import { authProtectedFlattenRoutes, publicProtectedFlattenRoutes } from ".";
import { getToken, isTokenExpired } from "../lib/auth-utils";
import useModuleAccess from "../hooks/useModuleAccess";
import { useAuthStore } from "../store";
import { getSubdomain } from "../utils/subdomain";
import { useSuperAdminStore } from "../store/superAdminStore";
import SuperAdminLogin from "../pages/SuperAdmin/Login";
import SuperAdminPortal from "../pages/SuperAdmin/Portal";
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
    return isSuperAdminAuthenticated ? <SuperAdminPortal /> : <SuperAdminLogin />;
  }

  // 2. Root domain without tenant subdomain (e.g. localhost:5173 or yourcrm.com)
  if (subdomain.type === "root") {
    const currentPath = window.location.pathname.toLowerCase();
    const isAuthRoute =
      currentPath === "/login" ||
      currentPath === "/auth/login" ||
      currentPath.startsWith("/forms/") ||
      currentPath === "/recover-password" ||
      currentPath === "/auth/recover-password";

    if (!isAuthRoute) {
      return (
        <Routes>
          <Route
            path="/super-admin/*"
            element={isSuperAdminAuthenticated ? <SuperAdminPortal /> : <SuperAdminLogin />}
          />
          <Route path="*" element={<WorkspaceFinder />} />
        </Routes>
      );
    }
  }

  // 3. Tenant Workspace (e.g. acme.localhost:5173 or acme.yourcrm.com)
  const isAuthenticated = (() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) return false;
    return true;
  })();

  return (
    <React.Fragment>
      <Routes>
        <Route>
          {(publicProtectedFlattenRoutes || []).map(
            (route: RouteObject, idx: number) => (
              <Route
                path={route.path}
                element={
                  <DefaultLayout {...props}>{route.element}</DefaultLayout>
                }
                key={idx}
              />
            ),
          )}
        </Route>

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
                key={idx}
              />
            ),
          )}
        </Route>
      </Routes>
    </React.Fragment>
  );
};

export default AllRoutes;