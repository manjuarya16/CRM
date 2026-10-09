import React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { getMenuItems } from "../helpers/menu";
import { MenuItemTypes } from "../constants/menu";

import AppMenu from "./Menu";
import * as LayoutConstants from "../constants/layout";

import { useLayoutStore, useAuthStore, useConfigStore } from "../store";
import { useAppLogo } from "../hooks";
import useRoleStore from "../store/roleStore";
import useAccessManagementStore from "../store/accessManagementStore";
import { LeftSideBarProps } from "../interface/leftSideInterface";

// images
const SideBarContent = () => {
  const { user } = useAuthStore();
  const { roles, fetchRoles } = useRoleStore();
  const { userAccess, fetchUserAccess } = useAccessManagementStore();
  const { configs, fetchConfigs } = useConfigStore();

  useEffect(() => {
    if (Object.keys(configs).length === 0) {
      fetchConfigs();
    }
  }, [configs, fetchConfigs]);

  useEffect(() => {
    if (user?.role_id && roles.length === 0) {
      fetchRoles();
    }
  }, [fetchRoles, roles.length, user?.role_id]);

  // for admin: role_id===1 is instantly known, no need to wait for roles
  const isAdmin = useMemo(() => {
    if (!user?.role_id) return false;
    if (Number(user.role_id) === 1) return true;

    const userRole = roles.find(
      (role) => Number(role.id) === Number(user.role_id),
    );

    return userRole?.name?.toLowerCase().includes("admin") ?? false;
  }, [roles, user?.role_id]);

  useEffect(() => {
    if (user?.role_id && roles.length > 0 && !isAdmin) {
      fetchUserAccess(Number(user.role_id));
    }
  }, [user?.role_id, roles.length, isAdmin, fetchUserAccess]);

  // null = not loaded yet, Set = loaded (may be empty)
  const allowedKeys = useMemo(() => {
    if (isAdmin) return null;
    const keySet = new Set<string>();

    // 1. Add keys from user.permissions array (e.g. 'dashboard.view', 'organizations.view', 'settings.users.view')
    const perms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    if (perms.length > 0) {
      perms.forEach((p) => {
        const parts = p.toLowerCase().split(".");
        const mod = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const act = parts[parts.length - 1];
        if (act === "view" || act === "read" || parts.length === 1) {
          const cleanMod = mod.trim();
          keySet.add(cleanMod);
          if (cleanMod.endsWith("s")) keySet.add(cleanMod.slice(0, -1));
          else keySet.add(`${cleanMod}s`);
        }
      });
    }

    // 2. Add keys from userAccess table
    userAccess.filter((a) => a.can_view).forEach((a) => {
      const k = a.module_key.toLowerCase().trim();
      keySet.add(k);
      if (k.endsWith("s")) {
        keySet.add(k.slice(0, -1));
      } else {
        keySet.add(`${k}s`);
      }
    });

    if (keySet.size === 0 && roles.length === 0) return undefined;
    return keySet;
  }, [user, userAccess, isAdmin, roles.length]);

  const filterMenuItems = useCallback(
    (items: MenuItemTypes[]): MenuItemTypes[] => {
      if (isAdmin) return items;
      if (allowedKeys === undefined) return [];

      const filtered = items
        .filter((item) => {
          if (item.isTitle) return true;
          if (!item.children) {
            const itemKeyLower = item.key.toLowerCase().trim();
            const singularKey = itemKeyLower.endsWith("s") ? itemKeyLower.slice(0, -1) : itemKeyLower;
            return allowedKeys?.has(item.key) || allowedKeys?.has(itemKeyLower) || allowedKeys?.has(singularKey) || false;
          }
          return true;
        })
        .map((item) => {
          if (!item.children) return item;
          return { ...item, children: filterMenuItems(item.children) };
        })
        .filter((item) => {
          if (item.isTitle) return true;
          if (item.children) return item.children.length > 0;
          return true;
        });

      // Remove isTitle sections with no visible items after them
      return filtered.filter((item, idx) => {
        if (!item.isTitle) return true;
        const next = filtered[idx + 1];
        return next && !next.isTitle;
      });
    },
    [isAdmin, allowedKeys],
  );

  const menuItems = useMemo(() => {
    return getMenuItems(configs);
  }, [configs]);

  return <AppMenu menuItems={filterMenuItems(menuItems)} />;
};

const HoverMenuToggler = () => {
  const { sideBarType, changeSideBarType } = useLayoutStore();

  function toggleHoverMenu() {
    if (sideBarType === LayoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_HOVER) {
      changeSideBarType(
        LayoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_HOVERACTIVE,
      );
    } else if (
      sideBarType === LayoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_HOVERACTIVE
    ) {
      changeSideBarType(LayoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_HOVER);
    }
  }

  return (
    <button
      id="button-hover-toggle"
      className="absolute top-5 end-2 rounded-full p-1.5"
      onClick={toggleHoverMenu}
    >
      <span className="sr-only">Menu Toggle Button</span>
      <i className="mgc_round_line text-xl"></i>
    </button>
  );
};

const LeftSideBar = ({ isCondensed, hideLogo }: LeftSideBarProps) => {
  const { logoLight, logoDark, logoSm } = useAppLogo();
  const logoUrl = logoLight || logoDark;

  return (
    <React.Fragment>
      <div className="app-menu">
        <Link to="/" className="logo-box flex items-center gap-2.5 px-4 h-16">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className={
                isCondensed
                  ? "h-9 w-9 max-w-[42px] object-contain"
                  : "h-11 max-h-12 max-w-[185px] w-auto object-contain transition-all"
              }
            />
          ) : (
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M7 6L14 13L7 20L0 13L7 6Z" fill="#0284c7" />
                <path d="M18 6L25 13L18 20L11 13L18 6Z" fill="#0088cc" />
                <path d="M12.5 17.5L19.5 24.5L12.5 31.5L5.5 24.5L12.5 17.5Z" fill="#38bdf8" />
              </svg>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">CRM</span>
            </div>
          )}
        </Link>

        <HoverMenuToggler />

        <SimpleBar className="srcollbar" id="leftside-menu-container">
          <SideBarContent />
        </SimpleBar>
      </div>
    </React.Fragment>
  );
};

export default LeftSideBar;
