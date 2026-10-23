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
import { useEffect, useState, useRef } from "react";
import { MegaSearch } from "../components/MegaSearch";
import {
  NotificationItem,
  ProfileMenuItem,
} from "../interface/leftSideInterface";

const QUICK_CREATE_ITEMS = [
  {
    label: "New Lead",
    shortLabel: "Lead",
    url: "/leads/create",
    icon: "mgc_target_line",
    iconBg: "bg-blue-50 dark:bg-blue-950/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "New Contact",
    shortLabel: "Contact",
    url: "/contacts/persons/create",
    icon: "mgc_user_add_line",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "New Organization",
    shortLabel: "Organization",
    url: "/contacts/organizations/create",
    icon: "mgc_building_2_line",
    iconBg: "bg-purple-50 dark:bg-purple-950/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    label: "New Quote",
    shortLabel: "Quote",
    url: "/quotes/create",
    icon: "mgc_file_check_line",
    iconBg: "bg-amber-50 dark:bg-amber-950/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    label: "New Product",
    shortLabel: "Product",
    url: "/products/create",
    icon: "mgc_box_3_line",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  {
    label: "New Activity",
    shortLabel: "Activity",
    url: "/activities/create",
    icon: "mgc_calendar_line",
    iconBg: "bg-rose-50 dark:bg-rose-950/60",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
];

const subtractHours = (date: Date, minutes: number) => {
  return new Date(date.getTime() - minutes * 60000);
};

/**
 * notification items
 */
const notifications: NotificationItem[] = [
  {
    id: 1,
    text: "Datacorp",
    subText: "Caleb Flakelar commented on Admin",
    icon: "mgc_message_3_line text-lg",
    bgColor: "primary",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 2,
    text: "Admin",
    subText: "New user registered",
    icon: "mgc_user_add_line text-lg",
    bgColor: "info",
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: 3,
    text: "Cristina Pride",
    subText: "Hi, How are you? What about our next meeting",
    icon: "mgc_chat_2_line text-lg",
    bgColor: "info",
    createdAt: new Date(Date.now() - 1440 * 60 * 1000),
  },
  {
    id: 4,
    text: "Datacorp",
    subText: "Caleb Flakelar commented on Admin",
    icon: "mgc_message_1_line text-lg",
    bgColor: "primary",
    createdAt: new Date(Date.now() - 2880 * 60 * 1000),
  },
  {
    id: 5,
    text: "Karen Robinson",
    subText: "Wow ! this admin looks good and awesome design",
    icon: "mgc_user_3_line text-lg",
    bgColor: "success",
    createdAt: new Date(Date.now() - 2880 * 60 * 1000),
  },
];

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
  {
    label: "Company Profile",
    icon: "mgc_building_2_line me-2",
    redirectTo: "/organization",
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
  const quickCreateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    // If authStore already has profile_img (set after upload), use it directly
    if (user.profile_img) { setProfilePic(user.profile_img as string); return; }
    import("@/config").then(({ API }) => {
      API.get(`/users/${user.id}`)
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

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Close Quick Create dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        quickCreateRef.current &&
        !quickCreateRef.current.contains(e.target as Node)
      ) {
        setQuickCreateOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickCreateOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <>
      <header
        className="app-header sticky top-0 z-35 flex items-center px-2.5 sm:px-4 gap-1.5 sm:gap-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-[70px]"
        style={{ height: "70px" }}
      >
        <button
          id="button-toggle-menu"
          className="nav-link p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 shrink-0"
          onClick={handleLeftMenuCallBack}
        >
          <span className="sr-only">Menu Toggle Button</span>
          <span className="flex items-center justify-center h-6 w-6">
            <i className="mgc_menu_line text-xl"></i>
          </span>
        </button>

        {/* Center: Mega Search and Quick Action */}
        <div className="flex-1 max-w-2xl mx-auto flex items-center gap-1.5 sm:gap-3 px-1 sm:px-4 min-w-0">
          <MegaSearch />

          {/* Quick-Create (+) Dropdown Menu */}
          <div ref={quickCreateRef} className="relative flex-shrink-0">
            <button
              type="button"
              title="Quick Create (New Lead, Contact, Organization, Quote, Product, Activity)"
              onClick={() => setQuickCreateOpen((prev) => !prev)}
              className="h-8 w-8 flex-shrink-0 rounded-full bg-[#0088cc] hover:bg-[#0077b5] active:bg-[#006699] text-white flex items-center justify-center shadow transition-transform hover:scale-105 cursor-pointer"
            >
              <i
                className={`mgc_add_line text-xl font-bold transition-transform duration-200 ${
                  quickCreateOpen ? "rotate-45" : ""
                }`}
              ></i>
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-50">
                <div className="px-1.5 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                    Quick Create
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    Select record type
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_CREATE_ITEMS.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setQuickCreateOpen(false)}
                      className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all text-center group"
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center ${item.iconBg} ${item.iconColor} group-hover:scale-105 transition-transform`}
                      >
                        <i className={`${item.icon} text-xl`}></i>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                        {item.shortLabel}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 ml-auto shrink-0">
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
