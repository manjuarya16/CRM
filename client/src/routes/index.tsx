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

// apps
const QuotesPage = React.lazy(() => import("../pages/apps/Quotes"));
const CreateQuotePage = React.lazy(() => import("../pages/apps/Quotes/create"));
const EditQuotePage = React.lazy(() => import("../pages/apps/Quotes/edit"));
const LeadsPage = React.lazy(() => import("../pages/apps/Leads"));
const CreateLeadPage = React.lazy(() => import("../pages/apps/Leads/create"));
const EditLeadPage = React.lazy(() => import("../pages/apps/Leads/edit"));
const ViewLeadPage = React.lazy(() => import("../pages/apps/Leads/view"));
const PersonsPage = React.lazy(() => import("../pages/apps/Contacts/Persons"));
const CreatePersonPage = React.lazy(
  () => import("../pages/apps/Contacts/Persons/create"),
);
const EditPersonPage = React.lazy(
  () => import("../pages/apps/Contacts/Persons/edit"),
);
const OrganizationsPage = React.lazy(
  () => import("../pages/apps/Contacts/Organizations"),
);
const CreateOrganizationPage = React.lazy(
  () => import("../pages/apps/Contacts/Organizations/create"),
);
const EditOrganizationPage = React.lazy(
  () => import("../pages/apps/Contacts/Organizations/edit"),
);
const ProductsPage = React.lazy(() => import("../pages/apps/Products"));
const CreateProductPage = React.lazy(() => import("../pages/apps/Products/create"));
const EditProductPage = React.lazy(() => import("../pages/apps/Products/edit"));
const ActivitiesPage = React.lazy(() => import("../pages/apps/Activities"));
const CreateActivityPage = React.lazy(() => import("../pages/apps/Activities/create"));
const EditActivityPage = React.lazy(() => import("../pages/apps/Activities/edit"));

const MailPage = React.lazy(() => import("../pages/apps/Mail"));
const SettingsHubPage = React.lazy(() => import("../pages/apps/Settings"));
const GroupsPage = React.lazy(() => import("../pages/apps/Settings/Groups"));
const RolesPage = React.lazy(() => import("../pages/apps/Settings/Roles"));
const PipelinesPage = React.lazy(
  () => import("../pages/apps/Settings/Pipelines"),
);
const SourcesPage = React.lazy(() => import("../pages/apps/Settings/Sources"));
const TypesPage = React.lazy(() => import("../pages/apps/Settings/Types"));
const ConfigurationPage = React.lazy(
  () => import("../pages/apps/Configuration"),
);
const HelpPage = React.lazy(() => import("../pages/apps/Help"));

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

const crmAppRoutes: RoutesProps[] = [
  {
    path: "/leads",
    name: "Leads",
    element: <LeadsPage />,
    route: PrivateRoute,
  },
  {
    path: "/leads/create",
    name: "Create Lead",
    element: <CreateLeadPage />,
    route: PrivateRoute,
  },
  {
    path: "/leads/edit/:id",
    name: "Edit Lead",
    element: <EditLeadPage />,
    route: PrivateRoute,
  },
  {
    path: "/leads/view/:id",
    name: "View Lead",
    element: <ViewLeadPage />,
    route: PrivateRoute,
  },
  {
    path: "/quotes",
    name: "Quotes",
    element: <QuotesPage />,
    route: PrivateRoute,
  },
  {
    path: "/quotes/create",
    name: "Create Quote",
    element: <CreateQuotePage />,
    route: PrivateRoute,
  },
  {
    path: "/quotes/edit/:id",
    name: "Edit Quote",
    element: <EditQuotePage />,
    route: PrivateRoute,
  },
  {
    path: "/mail",
    name: "Mail",
    element: <MailPage />,
    route: PrivateRoute,
  },
  {
    path: "/activities",
    name: "Activities",
    element: <ActivitiesPage />,
    route: PrivateRoute,
  },
  {
    path: "/activities/create",
    name: "Create Activity",
    element: <CreateActivityPage />,
    route: PrivateRoute,
  },
  {
    path: "/activities/edit/:id",
    name: "Edit Activity",
    element: <EditActivityPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/persons",
    name: "Persons",
    element: <PersonsPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/persons/create",
    name: "Create Person",
    element: <CreatePersonPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/persons/edit/:id",
    name: "Edit Person",
    element: <EditPersonPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/organizations",
    name: "Organizations",
    element: <OrganizationsPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/organizations/create",
    name: "Create Organization",
    element: <CreateOrganizationPage />,
    route: PrivateRoute,
  },
  {
    path: "/contacts/organizations/edit/:id",
    name: "Edit Organization",
    element: <EditOrganizationPage />,
    route: PrivateRoute,
  },
  {
    path: "/products",
    name: "Products",
    element: <ProductsPage />,
    route: PrivateRoute,
  },
  {
    path: "/products/create",
    name: "Create Product",
    element: <CreateProductPage />,
    route: PrivateRoute,
  },
  {
    path: "/products/edit/:id",
    name: "Edit Product",
    element: <EditProductPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings",
    name: "Settings",
    element: <SettingsHubPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings/groups",
    name: "Groups",
    element: <GroupsPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings/roles",
    name: "Roles",
    element: <RolesPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings/pipelines",
    name: "Pipelines",
    element: <PipelinesPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings/sources",
    name: "Sources",
    element: <SourcesPage />,
    route: PrivateRoute,
  },
  {
    path: "/settings/types",
    name: "Types",
    element: <TypesPage />,
    route: PrivateRoute,
  },
  {
    path: "/configuration",
    name: "Configuration",
    element: <ConfigurationPage />,
    route: PrivateRoute,
  },
  {
    path: "/help",
    name: "Help & Resources",
    element: <HelpPage />,
    route: PrivateRoute,
  },
];

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
const authProtectedRoutes = [
  dashboardRoutes,
  ...crmAppRoutes,
  userManagementRoutes,
];
const publicRoutes = [...authRoutes, ...otherPublicRoutes];

const authProtectedFlattenRoutes = flattenRoutes([...authProtectedRoutes]);
const publicProtectedFlattenRoutes = flattenRoutes([...publicRoutes]);
export {
  publicRoutes,
  authProtectedRoutes,
  authProtectedFlattenRoutes,
  publicProtectedFlattenRoutes,
};
