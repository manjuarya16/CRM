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
