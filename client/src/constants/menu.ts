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
    key: "menu",
    label: "Menu",
    isTitle: true,
  },
  {
    key: "dashboards",
    label: "Dashboard",
    isTitle: false,
    icon: "mgc_home_3_line",
    url: "/dashboard",
  },
  {
    key: "users",
    label: "Users",
    isTitle: false,
    icon: "mgc_user_3_line",
    url: "/management/users",
    adminOnly: true,
  },
];

export { MENU_ITEMS };
