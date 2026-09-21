export interface IPermissionItem {
  key: string;
  name: string;
  description?: string;
  action?: 'view' | 'create' | 'edit' | 'delete' | 'print' | 'other';
}

export interface IPermissionTreeNode {
  id: string;
  name: string;
  key?: string;
  action?: 'view' | 'create' | 'edit' | 'delete' | 'print' | 'other';
  children?: IPermissionTreeNode[];
}

export interface IPermissionGroup {
  id: string;
  name: string;
  icon: string;
  permissions: IPermissionItem[];
}

export const CRM_PERMISSION_TREE: IPermissionTreeNode[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    key: "dashboard.view",
  },
  {
    id: "leads",
    name: "Leads",
    children: [
      { id: "leads.create", name: "Create", key: "leads.create", action: "create" },
      { id: "leads.view", name: "View", key: "leads.view", action: "view" },
      { id: "leads.edit", name: "Edit", key: "leads.edit", action: "edit" },
      { id: "leads.delete", name: "Delete", key: "leads.delete", action: "delete" },
    ],
  },
  {
    id: "quotes",
    name: "Quotes",
    children: [
      { id: "quotes.create", name: "Create", key: "quotes.create", action: "create" },
      { id: "quotes.edit", name: "Edit", key: "quotes.edit", action: "edit" },
      { id: "quotes.print", name: "Print", key: "quotes.print", action: "print" },
      { id: "quotes.delete", name: "Delete", key: "quotes.delete", action: "delete" },
    ],
  },
  {
    id: "mail",
    name: "Mail",
    children: [
      { id: "mail.inbox", name: "Inbox", key: "mail.inbox", action: "view" },
      { id: "mail.draft", name: "Draft", key: "mail.draft", action: "view" },
      { id: "mail.outbox", name: "Outbox", key: "mail.outbox", action: "view" },
      { id: "mail.sent", name: "Sent", key: "mail.sent", action: "view" },
      { id: "mail.trash", name: "Trash", key: "mail.trash", action: "view" },
      { id: "mail.setting", name: "Setting", key: "mail.setting", action: "edit" },
    ],
  },
  {
    id: "activities",
    name: "Activities",
    children: [
      { id: "activities.create", name: "Create", key: "activities.create", action: "create" },
      { id: "activities.edit", name: "Edit", key: "activities.edit", action: "edit" },
      { id: "activities.delete", name: "Delete", key: "activities.delete", action: "delete" },
    ],
  },
  {
    id: "contacts",
    name: "Contacts",
    children: [
      {
        id: "persons",
        name: "Persons",
        children: [
          { id: "persons.create", name: "Create", key: "persons.create", action: "create" },
          { id: "persons.edit", name: "Edit", key: "persons.edit", action: "edit" },
          { id: "persons.delete", name: "Delete", key: "persons.delete", action: "delete" },
          { id: "persons.view", name: "View", key: "persons.view", action: "view" },
        ],
      },
      {
        id: "organizations",
        name: "Organizations",
        children: [
          { id: "organizations.create", name: "Create", key: "organizations.create", action: "create" },
          { id: "organizations.edit", name: "Edit", key: "organizations.edit", action: "edit" },
          { id: "organizations.delete", name: "Delete", key: "organizations.delete", action: "delete" },
          { id: "organizations.view", name: "View", key: "organizations.view", action: "view" },
        ],
      },
    ],
  },
  {
    id: "products",
    name: "Products",
    children: [
      { id: "products.create", name: "Create", key: "products.create", action: "create" },
      { id: "products.edit", name: "Edit", key: "products.edit", action: "edit" },
      { id: "products.delete", name: "Delete", key: "products.delete", action: "delete" },
      { id: "products.view", name: "View", key: "products.view", action: "view" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    children: [
      {
        id: "settings_groups",
        name: "Groups",
        children: [
          { id: "settings.groups.create", name: "Create", key: "settings.groups.create", action: "create" },
          { id: "settings.groups.edit", name: "Edit", key: "settings.groups.edit", action: "edit" },
          { id: "settings.groups.delete", name: "Delete", key: "settings.groups.delete", action: "delete" },
        ],
      },
      {
        id: "settings_roles",
        name: "Roles",
        children: [
          { id: "settings.roles.create", name: "Create", key: "settings.roles.create", action: "create" },
          { id: "settings.roles.edit", name: "Edit", key: "settings.roles.edit", action: "edit" },
          { id: "settings.roles.delete", name: "Delete", key: "settings.roles.delete", action: "delete" },
        ],
      },
      {
        id: "settings_users",
        name: "Users",
        children: [
          { id: "settings.users.create", name: "Create", key: "settings.users.create", action: "create" },
          { id: "settings.users.edit", name: "Edit", key: "settings.users.edit", action: "edit" },
          { id: "settings.users.delete", name: "Delete", key: "settings.users.delete", action: "delete" },
        ],
      },
      {
        id: "lead_attributes",
        name: "Lead Attributes",
        children: [
          {
            id: "settings_pipelines",
            name: "Pipelines",
            children: [
              { id: "settings.pipelines.create", name: "Create", key: "settings.pipelines.create", action: "create" },
              { id: "settings.pipelines.edit", name: "Edit", key: "settings.pipelines.edit", action: "edit" },
              { id: "settings.pipelines.delete", name: "Delete", key: "settings.pipelines.delete", action: "delete" },
            ],
          },
          {
            id: "settings_sources",
            name: "Sources",
            children: [
              { id: "settings.sources.create", name: "Create", key: "settings.sources.create", action: "create" },
              { id: "settings.sources.edit", name: "Edit", key: "settings.sources.edit", action: "edit" },
              { id: "settings.sources.delete", name: "Delete", key: "settings.sources.delete", action: "delete" },
            ],
          },
          {
            id: "settings_types",
            name: "Types",
            children: [
              { id: "settings.types.create", name: "Create", key: "settings.types.create", action: "create" },
              { id: "settings.types.edit", name: "Edit", key: "settings.types.edit", action: "edit" },
              { id: "settings.types.delete", name: "Delete", key: "settings.types.delete", action: "delete" },
            ],
          },
        ],
      },
      {
        id: "settings_warehouses",
        name: "Warehouses",
        children: [
          { id: "settings.warehouses.create", name: "Create", key: "settings.warehouses.create", action: "create" },
          { id: "settings.warehouses.edit", name: "Edit", key: "settings.warehouses.edit", action: "edit" },
          { id: "settings.warehouses.delete", name: "Delete", key: "settings.warehouses.delete", action: "delete" },
          { id: "settings.warehouses.view", name: "View", key: "settings.warehouses.view", action: "view" },
        ],
      },
      {
        id: "settings_attributes",
        name: "Attributes",
        children: [
          { id: "settings.attributes.create", name: "Create", key: "settings.attributes.create", action: "create" },
          { id: "settings.attributes.edit", name: "Edit", key: "settings.attributes.edit", action: "edit" },
          { id: "settings.attributes.delete", name: "Delete", key: "settings.attributes.delete", action: "delete" },
          { id: "settings.attributes.view", name: "View", key: "settings.attributes.view", action: "view" },
        ],
      },
      {
        id: "settings_email_templates",
        name: "Email Templates",
        children: [
          { id: "settings.email_templates.create", name: "Create", key: "settings.email_templates.create", action: "create" },
          { id: "settings.email_templates.edit", name: "Edit", key: "settings.email_templates.edit", action: "edit" },
          { id: "settings.email_templates.delete", name: "Delete", key: "settings.email_templates.delete", action: "delete" },
          { id: "settings.email_templates.view", name: "View", key: "settings.email_templates.view", action: "view" },
        ],
      },
      {
        id: "settings_events",
        name: "Events",
        children: [
          { id: "settings.events.create", name: "Create", key: "settings.events.create", action: "create" },
          { id: "settings.events.edit", name: "Edit", key: "settings.events.edit", action: "edit" },
          { id: "settings.events.delete", name: "Delete", key: "settings.events.delete", action: "delete" },
          { id: "settings.events.view", name: "View", key: "settings.events.view", action: "view" },
        ],
      },
      {
        id: "settings_campaigns",
        name: "Campaigns",
        children: [
          { id: "settings.campaigns.create", name: "Create", key: "settings.campaigns.create", action: "create" },
          { id: "settings.campaigns.edit", name: "Edit", key: "settings.campaigns.edit", action: "edit" },
          { id: "settings.campaigns.delete", name: "Delete", key: "settings.campaigns.delete", action: "delete" },
          { id: "settings.campaigns.view", name: "View", key: "settings.campaigns.view", action: "view" },
        ],
      },
      {
        id: "settings_webhooks",
        name: "Webhooks",
        children: [
          { id: "settings.webhooks.create", name: "Create", key: "settings.webhooks.create", action: "create" },
          { id: "settings.webhooks.edit", name: "Edit", key: "settings.webhooks.edit", action: "edit" },
          { id: "settings.webhooks.delete", name: "Delete", key: "settings.webhooks.delete", action: "delete" },
          { id: "settings.webhooks.view", name: "View", key: "settings.webhooks.view", action: "view" },
        ],
      },
      {
        id: "settings_workflows",
        name: "Workflows",
        children: [
          { id: "settings.workflows.create", name: "Create", key: "settings.workflows.create", action: "create" },
          { id: "settings.workflows.edit", name: "Edit", key: "settings.workflows.edit", action: "edit" },
          { id: "settings.workflows.delete", name: "Delete", key: "settings.workflows.delete", action: "delete" },
          { id: "settings.workflows.view", name: "View", key: "settings.workflows.view", action: "view" },
        ],
      },
      {
        id: "settings_web_forms",
        name: "Web Forms",
        children: [
          { id: "settings.web_forms.create", name: "Create", key: "settings.web_forms.create", action: "create" },
          { id: "settings.web_forms.edit", name: "Edit", key: "settings.web_forms.edit", action: "edit" },
          { id: "settings.web_forms.delete", name: "Delete", key: "settings.web_forms.delete", action: "delete" },
          { id: "settings.web_forms.view", name: "View", key: "settings.web_forms.view", action: "view" },
        ],
      },
      {
        id: "settings_data_transfer",
        name: "Data Transfer",
        children: [
          { id: "settings.data_transfer.view", name: "View", key: "settings.data_transfer.view", action: "view" },
          { id: "settings.data_transfer.import", name: "Import", key: "settings.data_transfer.import", action: "create" },
          { id: "settings.data_transfer.export", name: "Export", key: "settings.data_transfer.export", action: "print" },
        ],
      },
      {
        id: "settings_google_contacts",
        name: "Google Contacts",
        children: [
          { id: "settings.google_contacts.view", name: "View", key: "settings.google_contacts.view", action: "view" },
          { id: "settings.google_contacts.sync", name: "Sync", key: "settings.google_contacts.sync", action: "create" },
          { id: "settings.google_contacts.export", name: "Export", key: "settings.google_contacts.export", action: "print" },
        ],
      },
      {
        id: "settings_configuration",
        name: "Configuration",
        children: [
          { id: "settings.configuration.view", name: "View", key: "settings.configuration.view", action: "view" },
          { id: "settings.configuration.edit", name: "Edit", key: "settings.configuration.edit", action: "edit" },
        ],
      },
    ],
  },
];

export const getNodeLeafKeys = (node: IPermissionTreeNode): string[] => {
  const keys: string[] = [];
  const traverse = (item: IPermissionTreeNode) => {
    if (item.key) keys.push(item.key);
    if (item.children && item.children.length > 0) {
      item.children.forEach(traverse);
    }
  };
  traverse(node);
  return keys;
};

export const extractTreeKeys = (nodes: IPermissionTreeNode[]): string[] => {
  const keys: string[] = [];
  const traverse = (item: IPermissionTreeNode) => {
    if (item.key) keys.push(item.key);
    if (item.children && item.children.length > 0) {
      item.children.forEach(traverse);
    }
  };
  nodes.forEach(traverse);
  return keys;
};

export const CRM_PERMISSION_GROUPS: IPermissionGroup[] = [
  {
    id: "dashboard",
    name: "Dashboard & Analytics",
    icon: "mgc_dashboard_line",
    permissions: [
      { key: "dashboard.view", name: "View Dashboard", action: "view", description: "Access CRM dashboard analytics and KPI summaries" },
    ],
  },
  {
    id: "leads",
    name: "Leads Management",
    icon: "mgc_target_line",
    permissions: [
      { key: "leads.view", name: "View Leads", action: "view", description: "View leads pipeline, stages, and deal records" },
      { key: "leads.create", name: "Add / Create Leads", action: "create", description: "Create new prospective leads" },
      { key: "leads.edit", name: "Update / Edit Leads", action: "edit", description: "Update lead values, pipeline stages, and details" },
      { key: "leads.delete", name: "Delete Leads", action: "delete", description: "Delete leads permanently from CRM" },
    ],
  },
  {
    id: "persons",
    name: "Contacts / Persons",
    icon: "mgc_user_3_line",
    permissions: [
      { key: "persons.view", name: "View Contacts", action: "view", description: "View contacts list and individual profile summaries" },
      { key: "persons.create", name: "Add / Create Contacts", action: "create", description: "Create new contact records" },
      { key: "persons.edit", name: "Update / Edit Contacts", action: "edit", description: "Update contact details, phones, and emails" },
      { key: "persons.delete", name: "Delete Contacts", action: "delete", description: "Delete contacts from the system" },
    ],
  },
  {
    id: "organizations",
    name: "Organizations",
    icon: "mgc_building_line",
    permissions: [
      { key: "organizations.view", name: "View Organizations", action: "view", description: "View company and client organization profiles" },
      { key: "organizations.create", name: "Add / Create Organizations", action: "create", description: "Add new client organizations" },
      { key: "organizations.edit", name: "Update / Edit Organizations", action: "edit", description: "Update organization addresses and profiles" },
      { key: "organizations.delete", name: "Delete Organizations", action: "delete", description: "Delete organizations" },
    ],
  },
  {
    id: "products",
    name: "Products & Catalog",
    icon: "mgc_shopping_bag_3_line",
    permissions: [
      { key: "products.view", name: "View Products", action: "view", description: "View catalog items, prices, and inventory stock" },
      { key: "products.create", name: "Add / Create Products", action: "create", description: "Add new product SKUs to catalog" },
      { key: "products.edit", name: "Update / Edit Products", action: "edit", description: "Edit product pricing, descriptions, and quantities" },
      { key: "products.delete", name: "Delete Products", action: "delete", description: "Delete products from catalog" },
    ],
  },
  {
    id: "quotes",
    name: "Quotes & Proposals",
    icon: "mgc_file_text_line",
    permissions: [
      { key: "quotes.view", name: "View Quotes", action: "view", description: "View sales quotes and proposal breakdown" },
      { key: "quotes.create", name: "Add / Create Quotes", action: "create", description: "Generate and draft new sales quotes" },
      { key: "quotes.edit", name: "Update / Edit Quotes", action: "edit", description: "Modify quotes, discounts, taxes, and items" },
      { key: "quotes.delete", name: "Delete Quotes", action: "delete", description: "Delete sales quotes" },
      { key: "quotes.print", name: "Print / Export Quotes", action: "print", description: "Download or print PDF quote documents" },
    ],
  },
  {
    id: "mail",
    name: "Mail & Messages",
    icon: "mgc_mail_line",
    permissions: [
      { key: "mail.inbox", name: "Inbox", action: "view", description: "Access inbox" },
      { key: "mail.draft", name: "Draft", action: "view", description: "Access drafts" },
      { key: "mail.outbox", name: "Outbox", action: "view", description: "Access outbox" },
      { key: "mail.sent", name: "Sent", action: "view", description: "Access sent items" },
      { key: "mail.trash", name: "Trash", action: "view", description: "Access trash" },
      { key: "mail.setting", name: "Setting", action: "edit", description: "Manage mail settings" },
    ],
  },
  {
    id: "activities",
    name: "Activities & Calendar",
    icon: "mgc_calendar_line",
    permissions: [
      { key: "activities.view", name: "View Activities", action: "view", description: "View scheduled calls, tasks, meetings, and calendar" },
      { key: "activities.create", name: "Add / Create Activities", action: "create", description: "Schedule new calls, meetings, and tasks" },
      { key: "activities.edit", name: "Update / Edit Activities", action: "edit", description: "Update activity status, notes, and schedules" },
      { key: "activities.delete", name: "Delete Activities", action: "delete", description: "Delete activities" },
    ],
  },
  {
    id: "settings_groups",
    name: "Settings - Groups",
    icon: "mgc_group_line",
    permissions: [
      { key: "settings.groups.view", name: "View Groups", action: "view", description: "View user departments and groups" },
      { key: "settings.groups.create", name: "Add Groups", action: "create", description: "Create new user groups" },
      { key: "settings.groups.edit", name: "Update Groups", action: "edit", description: "Edit group details and user assignments" },
      { key: "settings.groups.delete", name: "Delete Groups", action: "delete", description: "Delete user groups" },
    ],
  },
  {
    id: "settings_roles",
    name: "Settings - Roles & Permissions",
    icon: "mgc_shield_check_line",
    permissions: [
      { key: "settings.roles.view", name: "View Roles", action: "view", description: "View access roles and permission levels" },
      { key: "settings.roles.create", name: "Add Roles", action: "create", description: "Create new access roles" },
      { key: "settings.roles.edit", name: "Update Roles", action: "edit", description: "Edit role permissions and scopes" },
      { key: "settings.roles.delete", name: "Delete Roles", action: "delete", description: "Delete access roles" },
    ],
  },
  {
    id: "settings_users",
    name: "Settings - Users",
    icon: "mgc_user_follow_line",
    permissions: [
      { key: "settings.users.view", name: "View Users", action: "view", description: "View system user accounts and status" },
      { key: "settings.users.create", name: "Add Users", action: "create", description: "Create and invite new CRM users" },
      { key: "settings.users.edit", name: "Update Users", action: "edit", description: "Update user profiles, roles, and status" },
      { key: "settings.users.delete", name: "Delete Users", action: "delete", description: "Delete or deactivate user accounts" },
    ],
  },
  {
    id: "settings_pipelines",
    name: "Settings - Pipelines",
    icon: "mgc_git_branch_line",
    permissions: [
      { key: "settings.pipelines.view", name: "View Pipelines", action: "view", description: "View deal pipelines and stages" },
      { key: "settings.pipelines.create", name: "Add Pipelines", action: "create", description: "Create new pipelines and custom stages" },
      { key: "settings.pipelines.edit", name: "Update Pipelines", action: "edit", description: "Edit pipeline stages and win probabilities" },
      { key: "settings.pipelines.delete", name: "Delete Pipelines", action: "delete", description: "Delete sales pipelines" },
    ],
  },
  {
    id: "settings_sources",
    name: "Settings - Sources",
    icon: "mgc_compass_line",
    permissions: [
      { key: "settings.sources.view", name: "View Sources", action: "view", description: "View lead acquisition sources" },
      { key: "settings.sources.create", name: "Add Sources", action: "create", description: "Create new lead sources" },
      { key: "settings.sources.edit", name: "Update Sources", action: "edit", description: "Edit lead source tags" },
      { key: "settings.sources.delete", name: "Delete Sources", action: "delete", description: "Delete lead sources" },
    ],
  },
  {
    id: "settings_types",
    name: "Settings - Types",
    icon: "mgc_tag_line",
    permissions: [
      { key: "settings.types.view", name: "View Types", action: "view", description: "View business and engagement types" },
      { key: "settings.types.create", name: "Add Types", action: "create", description: "Create new business types" },
      { key: "settings.types.edit", name: "Update Types", action: "edit", description: "Edit business types" },
      { key: "settings.types.delete", name: "Delete Types", action: "delete", description: "Delete business types" },
    ],
  },
  {
    id: "settings_warehouses",
    name: "Settings - Warehouses",
    icon: "mgc_store_2_line",
    permissions: [
      { key: "settings.warehouses.view", name: "View Warehouses", action: "view", description: "View warehouse directories and inventory stock locations" },
      { key: "settings.warehouses.create", name: "Add Warehouses", action: "create", description: "Create new warehouse facilities" },
      { key: "settings.warehouses.edit", name: "Update Warehouses", action: "edit", description: "Edit warehouse information, contacts, and locations" },
      { key: "settings.warehouses.delete", name: "Delete Warehouses", action: "delete", description: "Delete warehouse records" },
    ],
  },
  {
    id: "settings_attributes",
    name: "Settings - Attributes",
    icon: "mgc_list_check_3_line",
    permissions: [
      { key: "settings.attributes.view", name: "View Attributes", action: "view", description: "View custom attribute definitions and dynamic fields" },
      { key: "settings.attributes.create", name: "Add Attributes", action: "create", description: "Create new custom attributes for CRM entities" },
      { key: "settings.attributes.edit", name: "Update Attributes", action: "edit", description: "Edit custom attribute properties and predefined options" },
      { key: "settings.attributes.delete", name: "Delete Attributes", action: "delete", description: "Delete custom attributes" },
    ],
  },
  {
    id: "settings_email_templates",
    name: "Settings - Email Templates",
    icon: "mgc_mail_line",
    permissions: [
      { key: "settings.email_templates.view", name: "View Email Templates", action: "view", description: "View automated email templates and placeholders" },
      { key: "settings.email_templates.create", name: "Add Email Templates", action: "create", description: "Create new email marketing templates" },
      { key: "settings.email_templates.edit", name: "Update Email Templates", action: "edit", description: "Edit email templates and subject lines" },
      { key: "settings.email_templates.delete", name: "Delete Email Templates", action: "delete", description: "Delete email templates" },
    ],
  },
  {
    id: "settings_events",
    name: "Settings - Events",
    icon: "mgc_calendar_line",
    permissions: [
      { key: "settings.events.view", name: "View Events", action: "view", description: "View marketing campaign events" },
      { key: "settings.events.create", name: "Add Events", action: "create", description: "Create new marketing events" },
      { key: "settings.events.edit", name: "Update Events", action: "edit", description: "Edit marketing events" },
      { key: "settings.events.delete", name: "Delete Events", action: "delete", description: "Delete marketing events" },
    ],
  },
  {
    id: "settings_campaigns",
    name: "Settings - Campaigns",
    icon: "mgc_send_plane_line",
    permissions: [
      { key: "settings.campaigns.view", name: "View Campaigns", action: "view", description: "View email marketing campaigns" },
      { key: "settings.campaigns.create", name: "Add Campaigns", action: "create", description: "Create marketing campaign schedules" },
      { key: "settings.campaigns.edit", name: "Update Campaigns", action: "edit", description: "Edit marketing campaigns" },
      { key: "settings.campaigns.delete", name: "Delete Campaigns", action: "delete", description: "Delete marketing campaigns" },
    ],
  },
  {
    id: "settings_webhooks",
    name: "Settings - Webhooks",
    icon: "mgc_transfer_line",
    permissions: [
      { key: "settings.webhooks.view", name: "View Webhooks", action: "view", description: "View outbound webhook integrations" },
      { key: "settings.webhooks.create", name: "Add Webhooks", action: "create", description: "Register new automated webhooks" },
      { key: "settings.webhooks.edit", name: "Update Webhooks", action: "edit", description: "Edit webhook endpoints, headers, and payloads" },
      { key: "settings.webhooks.delete", name: "Delete Webhooks", action: "delete", description: "Delete webhooks" },
    ],
  },
  {
    id: "settings_workflows",
    name: "Settings - Workflows",
    icon: "mgc_node_tree_line",
    permissions: [
      { key: "settings.workflows.view", name: "View Workflows", action: "view", description: "View automated event workflows" },
      { key: "settings.workflows.create", name: "Add Workflows", action: "create", description: "Create new trigger and action workflows" },
      { key: "settings.workflows.edit", name: "Update Workflows", action: "edit", description: "Edit workflow conditions and actions" },
      { key: "settings.workflows.delete", name: "Delete Workflows", action: "delete", description: "Delete workflows" },
    ],
  },
  {
    id: "settings_web_forms",
    name: "Settings - Web Forms",
    icon: "mgc_layout_grid_line",
    permissions: [
      { key: "settings.web_forms.view", name: "View Web Forms", action: "view", description: "View lead capture web forms" },
      { key: "settings.web_forms.create", name: "Add Web Forms", action: "create", description: "Create embeddable lead forms" },
      { key: "settings.web_forms.edit", name: "Update Web Forms", action: "edit", description: "Edit form fields, colors, and styling" },
      { key: "settings.web_forms.delete", name: "Delete Web Forms", action: "delete", description: "Delete web forms" },
    ],
  },
  {
    id: "settings_data_transfer",
    name: "Settings - Data Transfer",
    icon: "mgc_upload_line",
    permissions: [
      { key: "settings.data_transfer.view", name: "View Data Transfer", action: "view", description: "View import and export logs" },
      { key: "settings.data_transfer.import", name: "Import Data", action: "create", description: "Run CSV data imports" },
      { key: "settings.data_transfer.export", name: "Export Data", action: "print", description: "Export CRM data into CSV format" },
    ],
  },
  {
    id: "settings_google_contacts",
    name: "Settings - Google Contacts",
    icon: "mgc_google_line",
    permissions: [
      { key: "settings.google_contacts.view", name: "View Google Contacts", action: "view", description: "View Google contact sync status" },
      { key: "settings.google_contacts.sync", name: "Sync Contacts", action: "create", description: "Synchronize contacts with Google Contacts" },
      { key: "settings.google_contacts.export", name: "Export Batches", action: "print", description: "Export contact batches to Google" },
    ],
  },
  {
    id: "settings_configuration",
    name: "Settings - Configuration",
    icon: "mgc_settings_3_line",
    permissions: [
      { key: "settings.configuration.view", name: "View Configuration", action: "view", description: "View system configurations" },
      { key: "settings.configuration.edit", name: "Edit Configuration", action: "edit", description: "Edit system configurations" },
    ],
  },
];

export const ALL_CRM_PERMISSION_KEYS: string[] = Array.from(
  new Set([
    ...CRM_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)),
    ...extractTreeKeys(CRM_PERMISSION_TREE),
  ])
);
