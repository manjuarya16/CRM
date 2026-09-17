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
  const open = openMenuItems ? openMenuItems.includes(item.key) : activeMenuItems!.includes(item.key);

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
                    activeMenuItems!.includes(child.key) ? " active" : ""
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
                  linkClassName={`menu-link ${activeMenuItems!.includes(child.key) ? " active" : ""}`}
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
    <a
      href={item.url}
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
    </a>
  );
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
    console.debug("toggleMenu called", menuItem.key, show);
    // prevent activeMenu effect from immediately overriding our manual toggle
    ignoreActiveMenuRef.current = true;
    setTimeout(() => (ignoreActiveMenuRef.current = false), 400);
    if (show) {
      // Open this menu and close any other open menus (only one open at a time)
      const keys = [menuItem["key"], ...findAllParent(menuItems, menuItem)];
      setOpenMenuItems(keys);
      try {
        sessionStorage.setItem("openMenuItems", JSON.stringify(keys));
      } catch (e) {}
    } else {
      // User explicitly closed the parent: remove it from open keys
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
    // prevent activeMenu from overriding immediately after navigation
    ignoreActiveMenuRef.current = true;
    setTimeout(() => (ignoreActiveMenuRef.current = false), 400);
    setActiveMenuItems(Array.from(keysSet));
    setOpenMenuItems(Array.from(keysSet));
    try {
      sessionStorage.setItem("openMenuItems", JSON.stringify(Array.from(keysSet)));
    } catch (e) {}
  };

  /**
   * activate the menuitems
   */
  const activeMenu = useCallback(() => {
    if (ignoreActiveMenuRef.current) return;
    const div = document.getElementById("main-side-menu");
    let matchingMenuItems: HTMLElement[] = [];

    if (div) {
      const items: any = div.getElementsByClassName("side-nav-link-ref");
      for (let i = 0; i < items.length; ++i) {
        let trimmedURL = location?.pathname?.replaceAll(
          process.env.PUBLIC_URL || "",
          "",
        );
        const url = items[i].pathname;
        if (trimmedURL === process.env.PUBLIC_URL + "/") {
          trimmedURL += "dashboard";
        }
        // match exact or prefix so routes like /management/users/edit/1 mark /management/users
        const itemUrl = url?.replaceAll(process.env.PUBLIC_URL, "");
        if (
          itemUrl &&
          (trimmedURL === itemUrl || trimmedURL.startsWith(itemUrl))
        ) {
          matchingMenuItems.push(items[i]);
        }
      }

      if (matchingMenuItems.length > 0) {
        // Prefer the most specific (longest) matching URL so child routes
        // like `/apps/stock-management/master` activate the child menu only.
        const getMatchPath = (el: any) => {
          const url = el.pathname || "";
          return (url || "").replaceAll(process.env.PUBLIC_URL || "", "");
        };
        let bestMatches = matchingMenuItems;
        // compute longest path length among matches
        const maxLen = Math.max(
          ...matchingMenuItems.map((m: any) => getMatchPath(m).length),
        );
        bestMatches = matchingMenuItems.filter(
          (m: any) => getMatchPath(m).length === maxLen,
        );

        const keysSet = new Set<string>();
        for (const matched of bestMatches) {
          const mid = matched.getAttribute("data-menu-key");
          const activeMt = findMenuItem(menuItems, mid as any);
          if (activeMt) {
            keysSet.add(activeMt["key"]);
            const parents = findAllParent(menuItems, activeMt);
            parents.forEach((p) => keysSet.add(p));
          }
        }

        console.debug("activeMenu keys", Array.from(keysSet));
        setActiveMenuItems(Array.from(keysSet));
        // also open parents for the current route
        setOpenMenuItems(Array.from(keysSet));

        // scroll to the first activated item
        setTimeout(function () {
          const activatedItem = matchingMenuItems[0];
          if (activatedItem != null) {
            const simplebarContent = document.querySelector(
              "#leftside-menu-container .simplebar-content-wrapper",
            );
            const offset = activatedItem!.offsetTop - 300;
            if (simplebarContent && offset > 100) {
              scrollTo(simplebarContent, offset, 600);
            }
          }
        }, 200);

        // scrollTo (Left Side Bar Active Menu)
        const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
          t /= d / 2;
          if (t < 1) return (c / 2) * t * t + b;
          t--;
          return (-c / 2) * (t * (t - 2) - 1) + b;
        };

        const scrollTo = (element: any, to: any, duration: any) => {
          const start = element.scrollTop,
            change = to - start,
            increment = 20;
          let currentTime = 0;
          const animateScroll = function () {
            currentTime += increment;
            const val = easeInOutQuad(currentTime, start, change, duration);
            element.scrollTop = val;
            if (currentTime < duration) {
              setTimeout(animateScroll, increment);
            }
          };
          animateScroll();
        };
      }
    }
  }, [location, menuItems]);

  useEffect(() => {
    // Apply any previously manually-opened menu keys (short-lived)
    try {
      const stored = sessionStorage.getItem("openMenuItems");
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length) {
          setOpenMenuItems(arr);
          // prevent immediate override by activeMenu
          ignoreActiveMenuRef.current = true;
          setTimeout(() => (ignoreActiveMenuRef.current = false), 400);
          return;
        }
      }
    } catch (e) {}

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
