import { MENU_ITEMS, MenuItemTypes } from "../constants/menu";

const getCustomLabel = (item: MenuItemTypes, configs?: Record<string, any>): string => {
  if (!configs) return item.label;

  // 1. Check general.settings.menu.<key>
  const directKey = `general.settings.menu.${item.key}`;
  if (configs[directKey] && String(configs[directKey]).trim() !== "") {
    return String(configs[directKey]).trim();
  }

  // 2. Check general.settings.menu.<parentKey>.<key> if item has parentKey
  if (item.parentKey) {
    const nestedKey = `general.settings.menu.${item.parentKey}.${item.key}`;
    if (configs[nestedKey] && String(configs[nestedKey]).trim() !== "") {
      return String(configs[nestedKey]).trim();
    }
  }

  return item.label;
};

const customizeItems = (items: MenuItemTypes[], configs?: Record<string, any>): MenuItemTypes[] => {
  if (!configs || Object.keys(configs).length === 0) return items;

  return items.map((item) => {
    const label = getCustomLabel(item, configs);
    const children = item.children ? customizeItems(item.children, configs) : undefined;
    return {
      ...item,
      label,
      ...(children ? { children } : {}),
    };
  });
};

const getMenuItems = (configs?: Record<string, any>) => {
  return customizeItems(MENU_ITEMS, configs);
};

const findAllParent = (
  menuItems: MenuItemTypes[],
  menuItem: MenuItemTypes
): string[] => {
  let parents: string[] = [];
  const parent = findMenuItem(menuItems, menuItem.parentKey);

  if (parent) {
    parents.push(parent.key);
    if (parent.parentKey) {
      parents = [...parents, ...findAllParent(menuItems, parent)];
    }
  }
  return parents;
};

const findMenuItem = (
  menuItems: MenuItemTypes[] | undefined,
  menuItemKey: MenuItemTypes['key'] | undefined
): MenuItemTypes | null => {
  if (menuItems && menuItemKey) {
    for (let i = 0; i < menuItems.length; i++) {
      if (menuItems[i].key === menuItemKey) {
        return menuItems[i];
      }
      const found = findMenuItem(menuItems[i].children, menuItemKey);
      if (found) return found;
    }
  }
  return null;
};

export { getMenuItems, findAllParent, findMenuItem };