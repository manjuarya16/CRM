/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { Navigate, Route, RouteProps } from "react-router-dom";

// components
import PrivateRoute from "./PrivateRoute";

// auth
const Login = React.lazy(() => import("../pages/auth/Login"));
const PublicFormPage = React.lazy(() => import("../pages/public/PublicFormPage"));

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
const MailViewPage = React.lazy(() => import("../pages/apps/Mail/view"));
const SettingsHubPage = React.lazy(() => import("../pages/apps/Settings"));
const UsersPage = React.lazy(() => import("../pages/apps/Settings/Users"));
const GroupsPage = React.lazy(() => import("../pages/apps/Settings/Groups"));
const RolesPage = React.lazy(() => import("../pages/apps/Settings/Roles"));
const CreateRolePage = React.lazy(
  () => import("../pages/apps/Settings/Roles/create"),
);
const EditRolePage = React.lazy(
  () => import("../pages/apps/Settings/Roles/edit"),
);
const PipelinesPage = React.lazy(
  () => import("../pages/apps/Settings/Pipelines"),
);
const SourcesPage = React.lazy(() => import("../pages/apps/Settings/Sources"));
const TypesPage = React.lazy(() => import("../pages/apps/Settings/Types"));
const WarehousesPage = React.lazy(
  () => import("../pages/apps/Settings/Warehouses"),
);
const CreateWarehousePage = React.lazy(
  () => import("../pages/apps/Settings/Warehouses/create"),
);
const EditWarehousePage = React.lazy(
  () => import("../pages/apps/Settings/Warehouses/edit"),
);
const AttributesPage = React.lazy(
  () => import("../pages/apps/Settings/Attributes"),
);
const CreateAttributePage = React.lazy(
  () => import("../pages/apps/Settings/Attributes/create"),
);
const EditAttributePage = React.lazy(
  () => import("../pages/apps/Settings/Attributes/edit"),
);

// 8 New Krayin CRM Settings Modules
const EmailTemplatesPage = React.lazy(
  () => import("../pages/apps/Settings/EmailTemplates"),
);
const CreateEmailTemplatePage = React.lazy(
  () => import("../pages/apps/Settings/EmailTemplates/create"),
);
const EditEmailTemplatePage = React.lazy(
  () => import("../pages/apps/Settings/EmailTemplates/edit"),
);

const EventsPage = React.lazy(
  () => import("../pages/apps/Settings/Events"),
);
const CreateEventPage = React.lazy(
  () => import("../pages/apps/Settings/Events/create"),
);
const EditEventPage = React.lazy(
  () => import("../pages/apps/Settings/Events/edit"),
);

const CampaignsPage = React.lazy(
  () => import("../pages/apps/Settings/Campaigns"),
);
const CreateCampaignPage = React.lazy(
  () => import("../pages/apps/Settings/Campaigns/create"),
);
const EditCampaignPage = React.lazy(
  () => import("../pages/apps/Settings/Campaigns/edit"),
);

const WebhooksPage = React.lazy(
  () => import("../pages/apps/Settings/Webhooks"),
);
const CreateWebhookPage = React.lazy(
  () => import("../pages/apps/Settings/Webhooks/create"),
);
const EditWebhookPage = React.lazy(
  () => import("../pages/apps/Settings/Webhooks/edit"),
);

const WorkflowsPage = React.lazy(
  () => import("../pages/apps/Settings/Workflows"),
);
const CreateWorkflowPage = React.lazy(
  () => import("../pages/apps/Settings/Workflows/create"),
);
const EditWorkflowPage = React.lazy(
  () => import("../pages/apps/Settings/Workflows/edit"),
);

const WebFormsPage = React.lazy(
  () => import("../pages/apps/Settings/WebForms"),
);
const CreateWebFormPage = React.lazy(
  () => import("../pages/apps/Settings/WebForms/create"),
);
const EditWebFormPage = React.lazy(
  () => import("../pages/apps/Settings/WebForms/edit"),
);

const DataTransferPage = React.lazy(
  () => import("../pages/apps/Settings/DataTransfer"),
);
const CreateImportPage = React.lazy(
  () => import("../pages/apps/Settings/DataTransfer/create"),
);
const GoogleContactsPage = React.lazy(
  () => import("../pages/apps/Settings/GoogleContacts"),
);
const TagsPage = React.lazy(
  () => import("../pages/apps/Settings/Tags"),
);

const ConfigurationPage = React.lazy(
  () => import("../pages/apps/Configuration"),
);
const HelpPage = React.lazy(() => import("../pages/apps/Help"));

export interface RoutesProps {
  path: RouteProps["path"];
  name: string;
  element?: RouteProps["element"];
  exact?: boolean;
  route?: any;
}

// public routes
const publicRoutes: RoutesProps[] = [
  {
    path: "/auth/login",
    name: "Login",
    element: <Login />,
  },
  {
    path: "/forms/:form_id",
    name: "Public Web Form",
    element: <PublicFormPage />,
  },
];

// auth protected routes
const authProtectedRoutes: RoutesProps[] = [
  {
    path: "/",
    name: "Root",
    element: <Navigate to="/dashboard" />,
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    element: <Dashboard />,
  },
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
    path: "/leads/:id/edit",
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
    path: "/mail/view/:id",
    name: "View Mail",
    element: <MailViewPage />,
    route: PrivateRoute,
  },
  {
    path: "/mail/:id/view",
    name: "View Mail",
    element: <MailViewPage />,
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
  },
  {
    path: "/contacts/persons/create",
    name: "Create Person",
    element: <CreatePersonPage />,
  },
  {
    path: "/contacts/persons/:id/edit",
    name: "Edit Person",
    element: <EditPersonPage />,
  },
  {
    path: "/contacts/persons/edit/:id",
    name: "Edit Person",
    element: <EditPersonPage />,
  },
  {
    path: "/contacts/organizations",
    name: "Organizations",
    element: <OrganizationsPage />,
  },
  {
    path: "/contacts/organizations/create",
    name: "Create Organization",
    element: <CreateOrganizationPage />,
  },
  {
    path: "/contacts/organizations/:id/edit",
    name: "Edit Organization",
    element: <EditOrganizationPage />,
  },
  {
    path: "/contacts/organizations/edit/:id",
    name: "Edit Organization",
    element: <EditOrganizationPage />,
  },
  {
    path: "/products",
    name: "Products",
    element: <ProductsPage />,
  },
  {
    path: "/activities",
    name: "Activities",
    element: <ActivitiesPage />,
  },
  {
    path: "/mail",
    name: "Mail",
    element: <MailPage />,
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
  },
  {
    path: "/settings/users",
    name: "Settings Users",
    element: <UsersPage />,
  },
  {
    path: "/settings/groups",
    name: "Settings Groups",
    element: <GroupsPage />,
  },
  {
    path: "/settings/roles",
    name: "Settings Roles",
    element: <RolesPage />,
  },
  {
    path: "/settings/roles/create",
    name: "Create Role",
    element: <CreateRolePage />,
  },
  {
    path: "/settings/roles/:id/edit",
    name: "Edit Role",
    element: <EditRolePage />,
  },
  {
    path: "/settings/roles/edit/:id",
    name: "Edit Role",
    element: <EditRolePage />,
  },
  {
    path: "/settings/pipelines",
    name: "Settings Pipelines",
    element: <PipelinesPage />,
  },
  {
    path: "/settings/sources",
    name: "Settings Sources",
    element: <SourcesPage />,
  },
  {
    path: "/settings/types",
    name: "Settings Types",
    element: <TypesPage />,
  },
  {
    path: "/settings/warehouses",
    name: "Settings Warehouses",
    element: <WarehousesPage />,
  },
  {
    path: "/settings/warehouses/create",
    name: "Create Warehouse",
    element: <CreateWarehousePage />,
  },
  {
    path: "/settings/warehouses/:id/edit",
    name: "Edit Warehouse",
    element: <EditWarehousePage />,
  },
  {
    path: "/settings/warehouses/edit/:id",
    name: "Edit Warehouse",
    element: <EditWarehousePage />,
  },
  {
    path: "/settings/attributes",
    name: "Settings Attributes",
    element: <AttributesPage />,
  },
  {
    path: "/settings/attributes/create",
    name: "Create Attribute",
    element: <CreateAttributePage />,
  },
  {
    path: "/settings/attributes/:id/edit",
    name: "Edit Attribute",
    element: <EditAttributePage />,
  },
  {
    path: "/settings/attributes/edit/:id",
    name: "Edit Attribute",
    element: <EditAttributePage />,
  },

  // 8 New Krayin CRM Settings Modules Routes
  {
    path: "/settings/email-templates",
    name: "Settings Email Templates",
    element: <EmailTemplatesPage />,
  },
  {
    path: "/settings/email-templates/create",
    name: "Create Email Template",
    element: <CreateEmailTemplatePage />,
  },
  {
    path: "/settings/email-templates/:id/edit",
    name: "Edit Email Template",
    element: <EditEmailTemplatePage />,
  },
  {
    path: "/settings/email-templates/edit/:id",
    name: "Edit Email Template",
    element: <EditEmailTemplatePage />,
  },
  {
    path: "/settings/events",
    name: "Settings Events",
    element: <EventsPage />,
  },
  {
    path: "/settings/events/create",
    name: "Create Event",
    element: <CreateEventPage />,
  },
  {
    path: "/settings/events/:id/edit",
    name: "Edit Event",
    element: <EditEventPage />,
  },
  {
    path: "/settings/events/edit/:id",
    name: "Edit Event",
    element: <EditEventPage />,
  },
  {
    path: "/settings/campaigns",
    name: "Settings Campaigns",
    element: <CampaignsPage />,
  },
  {
    path: "/settings/campaigns/create",
    name: "Create Campaign",
    element: <CreateCampaignPage />,
  },
  {
    path: "/settings/campaigns/:id/edit",
    name: "Edit Campaign",
    element: <EditCampaignPage />,
  },
  {
    path: "/settings/campaigns/edit/:id",
    name: "Edit Campaign",
    element: <EditCampaignPage />,
  },
  {
    path: "/settings/webhooks",
    name: "Settings Webhooks",
    element: <WebhooksPage />,
  },
  {
    path: "/settings/webhooks/create",
    name: "Create Webhook",
    element: <CreateWebhookPage />,
  },
  {
    path: "/settings/webhooks/:id/edit",
    name: "Edit Webhook",
    element: <EditWebhookPage />,
  },
  {
    path: "/settings/webhooks/edit/:id",
    name: "Edit Webhook",
    element: <EditWebhookPage />,
  },
  {
    path: "/settings/workflows",
    name: "Settings Workflows",
    element: <WorkflowsPage />,
  },
  {
    path: "/settings/workflows/create",
    name: "Create Workflow",
    element: <CreateWorkflowPage />,
  },
  {
    path: "/settings/workflows/:id/edit",
    name: "Edit Workflow",
    element: <EditWorkflowPage />,
  },
  {
    path: "/settings/workflows/edit/:id",
    name: "Edit Workflow",
    element: <EditWorkflowPage />,
  },
  {
    path: "/settings/web-forms",
    name: "Settings Web Forms",
    element: <WebFormsPage />,
  },
  {
    path: "/settings/web-forms/create",
    name: "Create Web Form",
    element: <CreateWebFormPage />,
  },
  {
    path: "/settings/web-forms/:id/edit",
    name: "Edit Web Form",
    element: <EditWebFormPage />,
  },
  {
    path: "/settings/web-forms/edit/:id",
    name: "Edit Web Form",
    element: <EditWebFormPage />,
  },
  {
    path: "/settings/data-transfer",
    name: "Settings Data Transfer",
    element: <DataTransferPage />,
  },
  {
    path: "/settings/data-transfer/create",
    name: "Create Import",
    element: <CreateImportPage />,
  },
  {
    path: "/settings/data-transfer/imports/create",
    name: "Create Import",
    element: <CreateImportPage />,
  },
  {
    path: "/settings/tags",
    name: "Settings Tags",
    element: <TagsPage />,
  },
  {
    path: "/settings/google-contacts",
    name: "Settings Google Contacts",
    element: <GoogleContactsPage />,
  },

  {
    path: "/users",
    name: "Users",
    element: <UserManagement />,
  },
  {
    path: "/users/create",
    name: "Create User",
    element: <UserCreateForm />,
  },
  {
    path: "/users/edit/:id",
    name: "Edit User",
    element: <UserEditForm />,
  },
  {
    path: "/users/view/:id",
    name: "View User",
    element: <UserViewForm />,
  },
  {
    path: "/configuration",
    name: "Configuration",
    element: <ConfigurationPage />,
  },
  {
    path: "/help",
    name: "Help",
    element: <HelpPage />,
  },
];

export interface FlattenRouteProps extends RoutesProps {
  children?: FlattenRouteProps[];
}

const flattenRoutes = (routes: any[]) => {
  let flatRoutes: any[] = [];
  routes = routes || [];
  routes.forEach((item: any) => {
    flatRoutes.push(item);
    if (typeof item.children !== 'undefined') {
      flatRoutes = [...flatRoutes, ...flattenRoutes(item.children)];
    }
  });
  return flatRoutes;
};

const authProtectedFlattenRoutes = flattenRoutes(authProtectedRoutes);
const publicProtectedFlattenRoutes = flattenRoutes(publicRoutes);

export { authProtectedRoutes, publicRoutes, authProtectedFlattenRoutes, publicProtectedFlattenRoutes };
