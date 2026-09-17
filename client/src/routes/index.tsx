/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, Route, RouteProps } from "react-router-dom";

// components
import PrivateRoute from "./PrivateRoute";

// auth
const Login = React.lazy(() => import("../pages/auth/Login"));

// dashboard
const Dashboard = React.lazy(() => import("../pages/dashboard/"));

// Users
const UserManagement = React.lazy(
  () => import("../pages/apps/Users/UserManagement"),
);
const UserCreateForm = React.lazy(() => import("../pages/apps/Users/create"));
const UserEditForm = React.lazy(() => import("../pages/apps/Users/edit"));
const UserViewForm = React.lazy(() => import("../pages/apps/Users/view"));

// error pages
const Error404 = React.lazy(() => import("../pages/error/Error404"));

export interface RoutesProps {
  path: RouteProps["path"];
  name?: string;
  element?: RouteProps["element"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route?: any;
  exact?: boolean;
  icon?: string;
  header?: string;
  roles?: string[];
  moduleKey?: string;
  children?: RoutesProps[];
}

// dashboards
const dashboardRoutes: RoutesProps = {
  path: "/home",
  name: "Dashboards",
  icon: "home",
  header: "Navigation",
  children: [
    {
      path: "/",
      name: "Root",
      element: <Navigate to="/dashboard" />,
      route: PrivateRoute,
    },
    {
      path: "/dashboard",
      name: "Dashboard",
      element: <Dashboard />,
      route: PrivateRoute,
    },
  ],
};

const userManagementRoutes: RoutesProps = {
  path: "/management/users",
  name: "User Management",
  route: PrivateRoute,
  roles: ["Admin"],
  icon: "users",
  moduleKey: "users",
  element: <UserManagement />,
  header: "Management",
  children: [
    {
      path: "/management/users/create",
      name: "Create User",
      element: <UserCreateForm />,
      route: PrivateRoute,
      roles: ["Admin"],
    },
    {
      path: "/management/users/edit/:id",
      name: "Edit User",
      element: <UserEditForm />,
      route: PrivateRoute,
      roles: ["Admin"],
    },
    {
      path: "/management/users/view/:id",
      name: "View User",
      element: <UserViewForm />,
      route: PrivateRoute,
      roles: ["Admin"],
    },
  ],
};

// auth
const authRoutes: RoutesProps[] = [
  {
    path: "/auth/login",
    name: "Login",
    element: <Login />,
    route: Route,
  },
];

// public routes
const otherPublicRoutes = [
  {
    path: "*",
    name: "Error - 404",
    element: <Error404 />,
    route: Route,
  },
];

// flatten the list of all nested routes
const flattenRoutes = (routes: RoutesProps[]) => {
  let flatRoutes: RoutesProps[] = [];

  routes = routes || [];
  routes.forEach((item: RoutesProps) => {
    flatRoutes.push(item);
    if (typeof item.children !== "undefined") {
      flatRoutes = [...flatRoutes, ...flattenRoutes(item.children)];
    }
  });
  return flatRoutes;
};

// All routes
const authProtectedRoutes = [dashboardRoutes, userManagementRoutes];
const publicRoutes = [...authRoutes, ...otherPublicRoutes];

const authProtectedFlattenRoutes = flattenRoutes([...authProtectedRoutes]);
const publicProtectedFlattenRoutes = flattenRoutes([...publicRoutes]);
export {
  publicRoutes,
  authProtectedRoutes,
  authProtectedFlattenRoutes,
  publicProtectedFlattenRoutes,
};
