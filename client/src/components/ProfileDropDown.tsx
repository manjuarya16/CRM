import { Link, useNavigate } from "react-router-dom";
import type { ProfileDropDownProps } from "../interface/profileInterface";
import React from "react";
import { PopoverLayout } from "./HeadlessUI";
import { useAuthStore } from "../store";
import { API_URL } from "../config";
const resolveImageUrl = (img: string | null | undefined): string | null => {
  if (!img) return null;
  if (img.startsWith("data:") || img.startsWith("http")) return img;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${img.startsWith("/") ? "" : "/"}${img}`;
};

const ProfileDropDown = ({
  menuItems,
  profiliePic,
  profile_img,
}: ProfileDropDownProps) => {
  const navigate = useNavigate();
  const { user, logout, reset } = useAuthStore();

  const profileImg = resolveImageUrl(user?.profile_img) ?? profiliePic;

  const PopoverToggler = () => (
    <div className="flex items-center gap-2 cursor-pointer">
      {profileImg ? (
        <img
          src={profileImg}
          alt="user"
          className="rounded-full h-8 w-8 object-cover ring-2 ring-pink-500/20"
        />
      ) : (
        <div className="rounded-full h-8 w-8 bg-[#ec4899] hover:bg-[#db2777] transition-colors flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
        </div>
      )}
    </div>
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      reset();
      sessionStorage.clear();
      navigate("/auth/login", { replace: true });
    }
  };

  return (
    <div className="relative ml-auto">
      <PopoverLayout
        placement="bottom-end"
        toggler={<PopoverToggler />}
        togglerClass="nav-link"
        menuClass="w-52 z-50 mt-2 bg-white shadow-lg border rounded-lg p-2 border-gray-200 dark:border-gray-700 dark:bg-gray-800"
      >
        {/* User info header */}
        <div className="px-3 py-2 mb-1 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {user?.name || "User"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user?.email || ""}
          </p>
        </div>

        {(menuItems || []).map((item, idx) => (
          <React.Fragment key={idx}>
            <Link
              className="flex items-center py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              to={item.redirectTo}
            >
              <i className={item.icon} />
              <span>{item.label}</span>
            </Link>
          </React.Fragment>
        ))}

        <hr className="my-2 -mx-2 border-gray-200 dark:border-gray-700" />
        <button
          className="w-full flex items-center py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          onClick={handleLogout}
        >
          <i className="mgc_exit_line me-2" />
          <span>Logout</span>
        </button>
      </PopoverLayout>
    </div>
  );
};

export default ProfileDropDown;
