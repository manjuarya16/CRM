import React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { getMenuItems } from "../helpers/menu";
import { MenuItemTypes } from "../constants/menu";

import AppMenu from "./Menu";
import * as LayoutConstants from "../constants/layout";

import { useLayoutStore } from "../store";
import { useAuthStore } from "../store";
import { useAppLogo } from "../hooks";
import useRoleStore from "../store/roleStore";
import useAccessManagementStore from "../store/accessManagementStore";
import { LeftSideBarProps } from "../interface/leftSideInterface";

// images
const SideBarContent = () => {
  const { user } = useAuthStore();
  const { roles, fetchRoles } = useRoleStore();
  const { userAccess, fetchUserAccess } = useAccessManagementStore();

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
    // userAccess is empty AND roles have loaded = access fetched, just no permissions
    // userAccess is empty AND roles not loaded = still loading
    if (roles.length === 0) return undefined; // signal: still loading
    return new Set(
      userAccess.filter((a) => a.can_view).map((a) => a.module_key),
    );
  }, [userAccess, isAdmin, roles.length]);

  const filterMenuItems = useCallback(
    (items: MenuItemTypes[]): MenuItemTypes[] => {
      if (isAdmin) return items;
      // Still loading roles/access — render nothing to avoid flash
      if (allowedKeys === undefined) return [];

      const filtered = items
        .filter((item) => {
          if (item.isTitle) return true;
          if (!item.children) {
            // Leaf: show if explicitly granted — adminOnly does NOT block granted items
            return allowedKeys?.has(item.key) ?? true;
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

  return <AppMenu menuItems={filterMenuItems(getMenuItems())} />;
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
        <Link to="/" className="logo-box">
          <div className="logo-light">
            {logoUrl ? (
              <>
                <img src={logoUrl} className="logo-lg h-6" alt="Logo" />
                <img src={logoUrl} className="logo-sm" alt="Small logo" />
              </>
            ) : (
              <span className="text-lg font-semibold">NGO Management</span>
            )}
          </div>
          <div className="logo-dark">
            {logoUrl ? (
              <>
                <img src={logoUrl} className="logo-lg h-6" alt="Logo" />
                <img src={logoUrl} className="logo-sm" alt="Small logo" />
              </>
            ) : (
              <span className="text-lg font-semibold">NGO Management</span>
            )}
          </div>
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
