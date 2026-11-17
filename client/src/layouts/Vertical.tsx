import React, { ReactNode, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";

// zustand
import { useLayoutStore } from "../store";
import { useAuthStore } from "../store";
import { useTenantStore } from "../store";
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
  const profile = useTenantStore((s) => s.profile);
  const fetchProfile = useTenantStore((s) => s.fetchProfile);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const isTrial = Boolean(
    profile?.is_trial ||
    profile?.status === "trial" ||
    profile?.computed_status === "Trial" ||
    profile?.sub_status === "trialing" ||
    (profile?.plan && profile.plan.toLowerCase().includes("trial"))
  );
  const daysRemaining = profile?.trial_days_remaining ?? (isTrial ? 14 : null);
  const expiryDate = profile?.subscription_expiry_date
    ? new Date(profile.subscription_expiry_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isExpired = Boolean(
    profile?.status === "expired" ||
    profile?.computed_status === "Expired" ||
    (profile?.subscription_expiry_date && new Date(profile.subscription_expiry_date).getTime() <= Date.now())
  );

  if (isExpired) {
    try {
      sessionStorage.clear();
      localStorage.removeItem("auth-store");
      localStorage.removeItem("token");
      document.cookie = "authToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {}

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900 p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl font-bold shadow-inner">
            <i className="mgc_time_line"></i>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Organization Subscription Expired</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Access to workspace <strong>{profile?.name || "your organization"}</strong> is disabled because your subscription has expired.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <a
              href={`/subscription/${profile?.slug || ""}`}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-bold shadow-md transition-all active:scale-98"
            >
              <span>Renew Subscription / Pay Online</span>
              <i className="mgc_external_link_line text-base"></i>
            </a>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/auth/login";
              }}
              className="w-full px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Top Announcement Bar when Organization is on Free Trial */}
            {isTrial && (
              <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-amber-500/15 border-b border-amber-300 dark:border-amber-600/50 px-3 sm:px-6 py-2 flex items-center justify-between text-xs sm:text-sm text-amber-950 dark:text-amber-100 sticky top-0 z-40 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <div className="truncate">
                    <span className="font-bold mr-1.5">Free Trial:</span>
                    {daysRemaining !== null && daysRemaining <= 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">Your trial period has ended. Renew now to continue accessing all features.</span>
                    ) : (
                      <span>
                        Your organization trial ends in <strong className="font-bold underline text-amber-950 dark:text-white">{daysRemaining ?? 14} {daysRemaining === 1 ? 'day' : 'days'}</strong>
                        {expiryDate ? ` (${expiryDate})` : ""}. Renew your plan to keep your workspace active.
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to="/subscription"
                  className="ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all hover:scale-105"
                >
                  <span>Renew</span>
                  <i className="mgc_refresh_3_line text-sm"></i>
                </Link>
              </div>
            )}

            <Suspense fallback={loading()}>
              <Topbar />
            </Suspense>

            <main className="flex-grow p-3 sm:p-4 md:p-6 min-w-0 min-h-0 overflow-y-auto">
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
