import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// import { Collapse } from 'react-bootstrap';

// helpers
import { findAllParent, findMenuItem } from "../helpers/menu";

// constants
import { MenuItemTypes } from "../constants/menu";
import { SimpleCollapse } from "../components/FrostUI";

interface SubMenus {
  item: MenuItemTypes;
  linkClassName?: string;
  subMenuClassNames?: string;
  activeMenuItems?: Array<string>;
  openMenuItems?: Array<string>;
  toggleMenu?: (item: any, status: boolean) => void;
  ensureParentsOpen?: (key: string) => void;
  className?: string;
}

const MenuItemWithChildren = ({
  item,
  linkClassName,
  subMenuClassNames,
  activeMenuItems,
  openMenuItems,
  toggleMenu,
  ensureParentsOpen,
}: SubMenus) => {
  const isItemActive = activeMenuItems ? activeMenuItems.includes(item.key) : false;
  const isItemOpen = openMenuItems ? openMenuItems.includes(item.key) : false;
  const open = isItemOpen || isItemActive;

  const toggleMenuItem = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const status = !open;
    if (toggleMenu) toggleMenu(item, status);
  };

  return (
    <li className="menu-item">
      <button
        type="button"
        className={`${linkClassName} ${open ? "open" : ""}`}
        aria-expanded={open}
        data-menu-key={item.key}
        onClick={(e) => toggleMenuItem(e)}
      >
        {item.icon && (
          <span className="menu-icon">
            <i className={item.icon} />
          </span>
        )}
        <span className="menu-text flex-1 text-left truncate pr-2"> {item.label} </span>
        <span className="ms-auto flex-shrink-0 text-gray-400 transition-all flex items-center">
          <i className={open ? "mgc_up_line" : "mgc_down_line"} style={{ fontSize: '1.2rem', transition: 'transform 0.3s' }} />
        </span>
      </button>
      <SimpleCollapse open={open} as="ul" classNames={subMenuClassNames}>
        {(item.children || []).map((child, idx) => {
          return (
            <React.Fragment key={idx}>
              {child.children ? (
                <MenuItemWithChildren
                  item={child}
                  linkClassName={`menu-link ${
                    activeMenuItems!.includes(child.key) ? "active" : ""
                  }`}
                  activeMenuItems={activeMenuItems}
                  openMenuItems={openMenuItems}
                  subMenuClassNames="sub-menu"
                  toggleMenu={toggleMenu}
                  ensureParentsOpen={ensureParentsOpen}
                />
              ) : (
                <MenuItem
                  item={child}
                  className="menu-item"
                  linkClassName={`menu-link ${activeMenuItems!.includes(child.key) ? "active" : ""}`}
                  ensureParentsOpen={ensureParentsOpen}
                />
              )}
            </React.Fragment>
          );
        })}
      </SimpleCollapse>
    </li>
  );
};

const MenuItem = ({ item, linkClassName, ensureParentsOpen }: SubMenus) => {
  return (
    <li className={"menu-item"}>
      <MenuItemLink
        item={item}
        className={linkClassName}
        ensureParentsOpen={ensureParentsOpen}
      />
    </li>
  );
};

const MenuItemLink = ({ item, className, ensureParentsOpen }: SubMenus) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If target is _blank, open in new tab/window and don't interfere
    if (item.target === "_blank") {
      window.open(item.url, "_blank");
      return;
    }

    e.preventDefault();
    if (ensureParentsOpen) ensureParentsOpen(item.key);
    navigate(item.url || "/");
  };

  return (
    <Link
      to={item.url || "/"}
      target={item.target}
      className={`side-nav-link-ref ${className}`}
      onClick={handleClick}
      data-menu-key={item.key}
    >
      {item.icon && (
        <span className="menu-icon">
          <i className={item.icon} />
        </span>
      )}
      <span className="menu-text flex-1 text-left truncate pr-2">{item.label}</span>
    </Link>
  );
};

/**
 * Helper to match current route path against menu tree items
 */
const getMatchPath = (url?: string) => {
  if (!url) return "";
  return url.endsWith("/") && url.length > 1 ? url.slice(0, -1) : url;
};

const findMatchingMenuItem = (
  items: MenuItemTypes[],
  pathname: string
): MenuItemTypes | null => {
  let bestMatch: MenuItemTypes | null = null;
  let maxLen = -1;

  const currentPath = pathname.endsWith("/") && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;

  const traverse = (itemList: MenuItemTypes[]) => {
    for (const item of itemList) {
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      } else if (item.url) {
        const itemUrl = getMatchPath(item.url);
        if (
          currentPath === itemUrl ||
          (itemUrl !== "/" && currentPath.startsWith(itemUrl + "/")) ||
          (currentPath === "/dashboard" && itemUrl === "/")
        ) {
          if (itemUrl.length > maxLen) {
            maxLen = itemUrl.length;
            bestMatch = item;
          }
        }
      }
    }
  };

  traverse(items);
  return bestMatch;
};

/**
 * Renders the application menu
 */
interface AppMenuProps {
  menuItems: MenuItemTypes[];
}

const AppMenu = ({ menuItems }: AppMenuProps) => {
  const location = useLocation();

  const menuRef = useRef(null);

  const [activeMenuItems, setActiveMenuItems] = useState<Array<string>>([]);
  const [openMenuItems, setOpenMenuItems] = useState<Array<string>>([]);
  const ignoreActiveMenuRef = useRef<boolean>(false);

  /**
   * toggle the menus
   */
  const toggleMenu = (menuItem: MenuItemTypes, show: boolean) => {
    ignoreActiveMenuRef.current = true;
    setTimeout(() => (ignoreActiveMenuRef.current = false), 400);
    if (show) {
      const keys = [menuItem["key"], ...findAllParent(menuItems, menuItem)];
      setOpenMenuItems(keys);
      try {
        sessionStorage.setItem("openMenuItems", JSON.stringify(keys));
      } catch (e) {}
    } else {
      setOpenMenuItems((prev) => prev.filter((k) => k !== menuItem.key));
      try {
        const stored = sessionStorage.getItem("openMenuItems");
        if (stored) {
          const arr = JSON.parse(stored) as string[];
          const updated = arr.filter((k) => k !== menuItem.key);
          sessionStorage.setItem("openMenuItems", JSON.stringify(updated));
        }
      } catch (e) {}
    }
  };

  const ensureParentsOpen = (key: string) => {
    const activeMt = findMenuItem(menuItems, key as any);
    if (!activeMt) return;
    const keysSet = new Set<string>();
    keysSet.add(activeMt.key);
    findAllParent(menuItems, activeMt).forEach((p) => keysSet.add(p));
    ignoreActiveMenuRef.current = true;
    setTimeout(() => (ignoreActiveMenuRef.current = false), 400);
    setActiveMenuItems(Array.from(keysSet));
    setOpenMenuItems(Array.from(keysSet));
    try {
      sessionStorage.setItem("openMenuItems", JSON.stringify(Array.from(keysSet)));
    } catch (e) {}
  };

  /**
   * activate the menuitems based on route
   */
  const activeMenu = useCallback(() => {
    if (ignoreActiveMenuRef.current) return;
    if (!menuItems || menuItems.length === 0) return;

    const matchedItem = findMatchingMenuItem(menuItems, location.pathname);
    if (matchedItem) {
      const keysSet = new Set<string>();
      keysSet.add(matchedItem.key);
      const parents = findAllParent(menuItems, matchedItem);
      parents.forEach((p) => keysSet.add(p));

      const activeArray = Array.from(keysSet);
      setActiveMenuItems(activeArray);
      setOpenMenuItems((prev) => Array.from(new Set([...prev, ...activeArray])));
    } else {
      setActiveMenuItems([]);
    }
  }, [location.pathname, menuItems]);

  useEffect(() => {
    activeMenu();
  }, [activeMenu]);

  return (
    <>
      <ul className="menu" ref={menuRef} id="main-side-menu">
        {(menuItems || []).map((item, idx) => {
          return (
            <React.Fragment key={idx}>
              {item.isTitle ? (
                <li className="menu-title">{item.label}</li>
              ) : (
                <>
                  {item.children ? (
                    <MenuItemWithChildren
                      item={item}
                      toggleMenu={toggleMenu}
                      ensureParentsOpen={ensureParentsOpen}
                      subMenuClassNames="sub-menu"
                      activeMenuItems={activeMenuItems}
                      openMenuItems={openMenuItems}
                      linkClassName={`menu-link ${activeMenuItems!.includes(item.key) ? "active" : ""}`}
                    />
                  ) : (
                    <MenuItem
                      item={item}
                      linkClassName={`menu-link ${activeMenuItems!.includes(item.key) ? "active" : ""}`}
                    />
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </ul>
    </>
  );
};

export default AppMenu;
