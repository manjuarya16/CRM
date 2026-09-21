export interface MenuItemTypes {
  key: string;
  label: string;
  isTitle?: boolean;
  icon?: string;
  url?: string;
  parentKey?: string;
  target?: string;
  adminOnly?: boolean;
  children?: MenuItemTypes[];
}

const MENU_ITEMS: MenuItemTypes[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    isTitle: false,
    icon: "mgc_speed_line",
    url: "/dashboard",
  },
  {
    key: "leads",
    label: "Leads",
    isTitle: false,
    icon: "mgc_cube_3_line",
    url: "/leads",
  },
  {
    key: "quotes",
    label: "Quotes",
    isTitle: false,
    icon: "mgc_file_check_line",
    url: "/quotes",
  },
  {
    key: "mail",
    label: "Mail",
    isTitle: false,
    icon: "mgc_mail_line",
    url: "/mail",
  },
  {
    key: "activities",
    label: "Activities",
    isTitle: false,
    icon: "mgc_calendar_line",
    url: "/activities",
  },
  {
    key: "contacts",
    label: "Contacts",
    isTitle: false,
    icon: "mgc_contacts_line",
    children: [
      {
        key: "persons",
        label: "Persons",
        url: "/contacts/persons",
        parentKey: "contacts",
      },
      {
        key: "organizations",
        label: "Organizations",
        url: "/contacts/organizations",
        parentKey: "contacts",
      },
    ],
  },
  {
    key: "products",
    label: "Products",
    isTitle: false,
    icon: "mgc_box_3_line",
    url: "/products",
  },
  {
    key: "settings",
    label: "Settings",
    isTitle: false,
    icon: "mgc_settings_3_line",
    children: [
      {
        key: "settings-overview",
        label: "All Settings",
        url: "/settings",
        parentKey: "settings",
      },
      {
        key: "groups",
        label: "Groups",
        url: "/settings/groups",
        parentKey: "settings",
      },
      {
        key: "roles",
        label: "Roles",
        url: "/settings/roles",
        parentKey: "settings",
      },
      {
        key: "users",
        label: "Users",
        url: "/settings/users",
        parentKey: "settings",
      },
      {
        key: "pipelines",
        label: "Pipelines",
        url: "/settings/pipelines",
        parentKey: "settings",
      },
      {
        key: "sources",
        label: "Sources",
        url: "/settings/sources",
        parentKey: "settings",
      },
      {
        key: "types",
        label: "Types",
        url: "/settings/types",
        parentKey: "settings",
      },
      {
        key: "warehouses",
        label: "Warehouses",
        url: "/settings/warehouses",
        parentKey: "settings",
      },
      {
        key: "attributes",
        label: "Attributes",
        url: "/settings/attributes",
        parentKey: "settings",
      },
      {
        key: "email-templates",
        label: "Email Templates",
        url: "/settings/email-templates",
        parentKey: "settings",
      },
      {
        key: "events",
        label: "Events",
        url: "/settings/events",
        parentKey: "settings",
      },
      {
        key: "campaigns",
        label: "Campaigns",
        url: "/settings/campaigns",
        parentKey: "settings",
      },
      {
        key: "webhooks",
        label: "Webhooks",
        url: "/settings/webhooks",
        parentKey: "settings",
      },
      {
        key: "workflows",
        label: "Workflows",
        url: "/settings/workflows",
        parentKey: "settings",
      },
      {
        key: "web-forms",
        label: "Web Forms",
        url: "/settings/web-forms",
        parentKey: "settings",
      },
      {
        key: "data-transfer",
        label: "Data Transfer",
        url: "/settings/data-transfer",
        parentKey: "settings",
      },
      {
        key: "google-contacts",
        label: "Google Contacts",
        url: "/settings/google-contacts",
        parentKey: "settings",
      },
    ],
  },
  {
    key: "configuration",
    label: "Configuration",
    isTitle: false,
    icon: "mgc_tool_line",
    url: "/configuration",
  },
  {
    key: "help",
    label: "Help & Resources",
    isTitle: false,
    icon: "mgc_question_line",
    url: "/help",
  },
];

export { MENU_ITEMS };
