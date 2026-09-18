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
        key: "users",
        label: "Users",
        url: "/management/users",
        parentKey: "settings",
      },
      {
        key: "roles",
        label: "Roles",
        url: "/settings/roles",
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

