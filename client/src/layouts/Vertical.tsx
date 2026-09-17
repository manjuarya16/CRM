import React, { ReactNode, Suspense, useEffect } from "react";

// zustand
import { useLayoutStore } from "../store";
import { useAuthStore } from "../store";
import * as layoutConstants from "../constants/layout";

// hooks
import { useViewPort } from "../hooks";
import { changeHTMLAttribute } from "../utils/layout";
import { Preloader } from "../components";
import useRoleStore from "../store/roleStore";
import useAccessManagementStore from "../store/accessManagementStore";

// code splitting and lazy loading
// https://blog.logrocket.com/lazy-loading-components-in-react-16-6-6cea535c0b52
const Topbar = React.lazy(() => import("./Topbar"));
const LeftSideBar = React.lazy(() => import("./LeftSideBar"));
const Footer = React.lazy(() => import("./Footer"));
const RightSideBar = React.lazy(() => import("./RightSideBar"));

const loading = () => <div />;

interface VerticalLayoutProps {
  children?: ReactNode;
}


const VerticalLayout = ({ children }: VerticalLayoutProps) => {
  const { width } = useViewPort();
  const { user } = useAuthStore();
  const { roles, fetchRoles } = useRoleStore();
  const { fetchUserAccess } = useAccessManagementStore();

  // Fetch roles once on mount so isAdmin resolves correctly everywhere
  useEffect(() => {
    if (user?.role_id && roles.length === 0) {
      fetchRoles();
    }
  }, [user?.role_id, roles.length, fetchRoles]);

  // Once roles are loaded, fetch userAccess for non-admin users
  useEffect(() => {
    if (!user?.role_id || roles.length === 0) return;
    const isAdmin =
      Number(user.role_id) === 1 ||
      (roles.find((r) => Number(r.id) === Number(user.role_id))
        ?.name?.toLowerCase()
        .includes("admin") ?? false);
    if (!isAdmin) {
      fetchUserAccess(Number(user.role_id));
    }
  }, [user?.role_id, roles, fetchUserAccess]);

  const {
    layoutTheme,
    layoutDirection,
    layoutWidth,
    topBarTheme,
    sideBarTheme,
    sideBarType,
    layoutPosition,
    changeSideBarType,
  } = useLayoutStore();

  /**
   * Layout defaults
   */

  useEffect(() => {
    changeHTMLAttribute('data-mode', layoutTheme)
  }, [layoutTheme])

  useEffect(() => {
    changeHTMLAttribute('dir', layoutDirection)
  }, [layoutDirection])

  useEffect(() => {
    changeHTMLAttribute('data-layout-width', layoutWidth)
  }, [layoutWidth])

  useEffect(() => {
    changeHTMLAttribute('data-topbar-color', topBarTheme)
  }, [topBarTheme])

  useEffect(() => {
    changeHTMLAttribute('data-menu-color', sideBarTheme)
  }, [sideBarTheme])

  useEffect(() => {
    changeHTMLAttribute('data-sidenav-view', sideBarType)
  }, [sideBarType])

  useEffect(() => {
    changeHTMLAttribute('data-layout-position', layoutPosition)
  }, [layoutPosition])

  useEffect(() => {
    document.getElementsByTagName('html')[0].removeAttribute('data-layout')
  }, [])

  useEffect(() => {
    if (width <= 1140) {
      changeSideBarType(layoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_MOBILE);
    } else if (width > 1140) {
      changeSideBarType(layoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_DEFAULT);
    }
  }, [width, changeSideBarType])

  const isCondensed = sideBarType === layoutConstants.SideBarType.LEFT_SIDEBAR_TYPE_SMALL;
  const isLight = sideBarTheme === layoutConstants.SideBarTheme.LEFT_SIDEBAR_THEME_LIGHT;

  return (
    <>
      <Suspense fallback={loading()}>
        <div className="flex wrapper">
          <Suspense fallback={loading()}>
            <LeftSideBar isCondensed={isCondensed} isLight={isLight} />
          </Suspense>

          <div className="page-content">

            <Suspense fallback={loading()}>
              <Topbar />
            </Suspense>

            <main className="flex-grow p-6 min-w-0 min-h-0 overflow-y-auto">
              <Suspense fallback={<Preloader />}>
                {children}
              </Suspense>
            </main>

            <Footer />
          </div>
        </div>

        <Suspense fallback={loading()}>
          <RightSideBar />
        </Suspense>
      </Suspense>
    </>
  );
};

export default VerticalLayout;
