import { useLayoutStore } from "../store";
import { Link } from "react-router-dom";
import { useViewPort } from "../hooks";
import { LayoutTheme, SideBarType } from "../constants/layout";

import { useAppLogo } from "../hooks";
import {
  TopBarSearch,
  MaximizeScreen,
  NotificationDropdown,
  ProfileDropDown,
} from "../components";
import { useAuthStore } from "../store";
import { useEffect, useState } from "react";
import { ProfileMenuItem } from "../interface/leftSideInterface";

/**
 * profile menu items
 */
const profileMenus: ProfileMenuItem[] = [
  // {
  //   label: 'Gallery',
  //   icon: 'mgc_pic_2_line me-2',
  //   redirectTo: '/pages/gallery',
  // },
  {
    label: "My Profile",
    icon: "mgc_user_3_line me-2",
    redirectTo: "/profile",
  },
  // {
  //   label: 'Lock Screen',
  //   icon: 'mgc_lock_line me-2',
  //   redirectTo: '/auth/lock-screen',
  // },
];

const Topbar = () => {
  const { width } = useViewPort();
  const { user } = useAuthStore();
  const [profilePic, setProfilePic] = useState<string>("");

  useEffect(() => {
    if (!user?.id) return;
    // If authStore already has profile_img (set after upload), use it directly
    if (user.profile_img) { setProfilePic(user.profile_img as string); return; }
    import("@/config").then(({ API }) => {
      API.get(`/user/${user.id}`)
        .then((res: any) => {
          const img = res?.data?.data?.profile_img;
          if (img) setProfilePic(img);
        })
        .catch(() => {});
    });
  }, [user?.id, (user as any)?.profile_img]);

  const { logoLight, logoDark, logoSm } = useAppLogo();
  const logoUrl = logoLight || logoDark;

  const { layoutTheme, sideBarType, changeLayoutTheme, changeSideBarType } =
    useLayoutStore();

  /**
   * Toggle the leftmenu when having mobile screen
   */
  const handleLeftMenuCallBack = () => {
    if (width < 1140) {
      if (sideBarType === SideBarType.LEFT_SIDEBAR_TYPE_MOBILE) {
        showLeftSideBarBackdrop();
        document
          .getElementsByTagName("html")[0]
          .classList.add("sidenav-enable");
      } else {
        changeSideBarType(SideBarType.LEFT_SIDEBAR_TYPE_MOBILE);
      }
    } else if (sideBarType === SideBarType.LEFT_SIDEBAR_TYPE_SMALL) {
      changeSideBarType(SideBarType.LEFT_SIDEBAR_TYPE_DEFAULT);
    } else if (sideBarType === SideBarType.LEFT_SIDEBAR_TYPE_MOBILE) {
      showLeftSideBarBackdrop();
      document.getElementsByTagName("html")[0].classList.add("sidenav-enable");
      toggleBodyStyle(true);
    } else if (sideBarType === SideBarType.LEFT_SIDEBAR_TYPE_HIDDEN) {
      changeSideBarType(SideBarType.LEFT_SIDEBAR_TYPE_DEFAULT);
      document.getElementsByTagName("html")[0].classList.add("sidenav-enable");
    } else {
      changeSideBarType(SideBarType.LEFT_SIDEBAR_TYPE_SMALL);
    }
  };

  /**
   * toggling style to the body tag
   */
  function toggleBodyStyle(set: boolean) {
    if (set == false) {
      document.body.removeAttribute("style");
    } else {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "16px";
    }
  }

  /**
   * creates backdrop for leftsidebar
   */
  function showLeftSideBarBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.id = "backdrop";
    backdrop.className =
      "transition-all fixed inset-0 z-40 bg-gray-900 bg-opacity-50 dark:bg-opacity-80";
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", function () {
      document
        .getElementsByTagName("html")[0]
        .classList.remove("sidenav-enable");
      toggleBodyStyle(false);
      changeSideBarType(SideBarType.LEFT_SIDEBAR_TYPE_MOBILE);
      hideLeftSideBarBackdrop();
    });
  }

  function hideLeftSideBarBackdrop() {
    const backdrop = document.getElementById("backdrop");
    document.getElementsByTagName("html")[0].classList.remove("sidenav-enable");
    if (backdrop) {
      document.body.removeChild(backdrop);
      document.body.style.removeProperty("overflow");
    }
  }

  /**
   * Toggle Dark Mode
   */
  const toggleDarkMode = () => {
    if (layoutTheme === "dark") {
      changeLayoutTheme(LayoutTheme.THEME_LIGHT);
    } else {
      changeLayoutTheme(LayoutTheme.THEME_DARK);
    }
  };

  return (
    <>
      <header className="app-header flex items-center px-4 gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16">
        <button
          id="button-toggle-menu"
          className="nav-link p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
          onClick={handleLeftMenuCallBack}
        >
          <span className="sr-only">Menu Toggle Button</span>
          <span className="flex items-center justify-center h-6 w-6">
            <i className="mgc_menu_line text-xl"></i>
          </span>
        </button>

        {/* Center: Mega Search and Quick Action */}
        <div className="flex-1 max-w-2xl mx-auto flex items-center gap-3 px-4">
          <div className="relative flex-1">
            <i className="mgc_search_line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Mega Search"
              className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] shadow-sm transition-all"
            />
          </div>
          <button
            title="Quick Create"
            className="h-8 w-8 flex-shrink-0 rounded-full bg-[#0088cc] hover:bg-[#0077b5] active:bg-[#006699] text-white flex items-center justify-center shadow transition-transform hover:scale-105"
          >
            <i className="mgc_add_line text-xl font-bold"></i>
          </button>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 ml-auto">
          <NotificationDropdown />

          <button
            id="light-dark-mode"
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleDarkMode}
            title="Toggle theme"
          >
            <span className="sr-only">Light/Dark Mode</span>
            <span className="flex items-center justify-center h-5 w-5">
              <i className="mgc_moon_line text-xl"></i>
            </span>
          </button>

          <ProfileDropDown
            profiliePic={profilePic as string}
            menuItems={profileMenus}
          />
        </div>
      </header>
    </>
  );
};

export default Topbar;
