import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { API } from "@/config";
import { useAuthStore, useUserStore } from "@/store";
import { getSubdomain } from "@/utils/subdomain";
import {
  Mail,
  Shield,
  UserCheck,
  Users,
  Building2,
  CheckCircle2,
  Edit3,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  X,
  User,
  Settings,
} from "lucide-react";

const ProfilePage: React.FC = () => {
  const { user, token } = useAuthStore();
  const [detailedUser, setDetailedUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [profileErrors, setProfileErrors] = useState<{ name?: string; email?: string }>({});
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [savingPassword, setSavingPassword] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);
    useUserStore
      .getState()
      .fetchUserById(Number(user.id))
      .then((res) => {
        if (active && res) {
          setDetailedUser(res);
        }
      })
      .catch(() => {
        // Fallback to authStore user
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const profile = detailedUser || user;
  const displayName = profile?.name || "User";
  const displayEmail = profile?.email || "—";
  const roleName =
    profile?.role?.name ||
    profile?.role_name ||
    (typeof profile?.role === "string" ? profile.role : "Member");
  const rawPermissionType = profile?.role?.permission_type || profile?.permission_type || "custom";
  const rawPermissions: string[] = Array.isArray(profile?.permissions)
    ? profile.permissions
    : Array.isArray(profile?.role?.permissions)
    ? profile.role.permissions
    : [];
  const hasFullAccess = rawPermissionType === "all" || rawPermissions.includes("*");
  const permissions = rawPermissions.filter((p) => p !== "*");
  const groups: any[] = Array.isArray(profile?.groups) ? profile.groups : [];
  const isActive = profile?.status !== false;
  const tenantSlug = getSubdomain().slug || sessionStorage.getItem("active_tenant_slug") || "";
  const orgName =
    sessionStorage.getItem("org_name") ||
    profile?.organization?.name ||
    (tenantSlug ? tenantSlug.toUpperCase() : "Workspace");
  const canManageUsers =
    hasFullAccess ||
    permissions.includes("settings.users.edit") ||
    permissions.includes("settings.users.update");

  useEffect(() => {
    if (!isEditingProfile) {
      setFullName(profile?.name || "");
      setEmail(profile?.email || "");
      setProfileErrors({});
    }
  }, [profile?.name, profile?.email, isEditingProfile]);

  const startEditingProfile = () => {
    setFullName(profile?.name || "");
    setEmail(profile?.email || "");
    setProfileErrors({});
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setFullName(profile?.name || "");
    setEmail(profile?.email || "");
    setProfileErrors({});
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { name?: string; email?: string } = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errs.name = "Full name is required.";
    } else if (trimmedName.length > 191) {
      errs.name = "Full name must not exceed 191 characters.";
    }

    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }

    setProfileErrors({});
    setSavingProfile(true);
    try {
      const response = await API.put("/auth/profile", {
        name: trimmedName,
        email: trimmedEmail,
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setDetailedUser((prev: any) => ({ ...(prev || {}), ...updatedUser }));
        useAuthStore.setState((state) => ({
          ...state,
          user: state.user ? { ...state.user, ...updatedUser } : updatedUser,
        }));
        try {
          const existingRaw = sessionStorage.getItem("app_user");
          const existingParsed = existingRaw ? JSON.parse(existingRaw) : {};
          sessionStorage.setItem(
            "app_user",
            JSON.stringify({
              ...existingParsed,
              token: token || existingParsed?.token,
              ...updatedUser,
            })
          );
        } catch {
          // Non-critical sessionStorage sync
        }
      }

      setIsEditingProfile(false);
      await Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your account details have been saved successfully.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile details.";
      Swal.fire("Update Failed", msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await API.put("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");

      await Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been changed successfully.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update password.";
      setPasswordError(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#0e90d9] to-[#040975] text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              {String(displayName).charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {displayName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {isActive ? "Active" : "Inactive"}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0284c7] dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <Shield size={11} />
                  {roleName}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} className="shrink-0" />
                  <span>{displayEmail}</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={14} className="shrink-0" />
                  <span>{orgName}</span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {!isEditingProfile ? (
              <button
                type="button"
                onClick={startEditingProfile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
              >
                <Edit3 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEditingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                <X size={15} />
                <span>Cancel Edit</span>
              </button>
            )}

            {canManageUsers && profile?.id && (
              <Link
                to={`/settings/users/edit/${profile.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold transition"
                title="Open full user administration settings"
              >
                <Settings size={15} />
                <span>User Settings</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading && !detailedUser && (
        <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
          Refreshing latest profile details...
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Account Details (View & Inline Edit/Update) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-[#0e90d9]" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  {isEditingProfile ? "Update Account Details" : "Account Details"}
                </h2>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={startEditingProfile}
                  className="text-xs font-semibold text-[#0e90d9] hover:text-[#0c7ab8] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (profileErrors.name) setProfileErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Enter your full name"
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition ${
                        profileErrors.name
                          ? "border-rose-500 focus:ring-rose-500/20"
                          : "border-gray-200 dark:border-gray-700 focus:border-[#0e90d9] focus:ring-[#0e90d9]/20"
                      }`}
                    />
                  </div>
                  {profileErrors.name && (
                    <p className="mt-1 text-xs text-rose-500 font-medium">{profileErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (profileErrors.email) setProfileErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder="name@company.com"
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 transition ${
                        profileErrors.email
                          ? "border-rose-500 focus:ring-rose-500/20"
                          : "border-gray-200 dark:border-gray-700 focus:border-[#0e90d9] focus:ring-[#0e90d9]/20"
                      }`}
                    />
                  </div>
                  {profileErrors.email && (
                    <p className="mt-1 text-xs text-rose-500 font-medium">{profileErrors.email}</p>
                  )}
                </div>

                {/* Read-only context fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70">
                    <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</span>
                    <span className="text-xs font-bold text-[#0e90d9] mt-0.5 block">{roleName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70">
                    <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Organization</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">{orgName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={cancelEditingProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0e90d9] hover:bg-[#0c7ab8] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
                  >
                    <Save size={15} />
                    <span>{savingProfile ? "Updating..." : "Update Profile"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <dt className="text-gray-500 dark:text-gray-400">Full Name</dt>
                  <dd className="font-semibold text-gray-900 dark:text-gray-100">{displayName}</dd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <dt className="text-gray-500 dark:text-gray-400">Email Address</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{displayEmail}</dd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <dt className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Shield size={14} /> Role
                  </dt>
                  <dd className="font-semibold text-[#0e90d9]">{roleName}</dd>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/60">
                  <dt className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Building2 size={14} /> Organization
                  </dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{orgName}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-gray-500 dark:text-gray-400">User ID</dt>
                  <dd className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    #{profile?.id || "—"}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {/* Groups & Permissions */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                <Users size={18} className="text-[#0e90d9]" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Assigned Groups
                </h2>
              </div>
              {groups.length === 0 ? (
                <p className="text-xs text-gray-400">No groups assigned to this user.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.map((g: any, idx: number) => (
                    <span
                      key={g?.id ?? idx}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                    >
                      {g?.name || `Group #${g}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Access Permissions
                  </h2>
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full">
                  {hasFullAccess ? "Full Access" : `${permissions.length} Granted`}
                </span>
              </div>

              {hasFullAccess ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                  Your role (<strong>{roleName}</strong>) has full administrative access across all CRM modules.
                </div>
              ) : permissions.length === 0 ? (
                <p className="text-xs text-gray-400">No granular permissions listed.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                  {permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-[11px] font-mono text-gray-700 dark:text-gray-300"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Security / Update Password */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
              <Lock size={18} className="text-[#0e90d9]" />
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Security &amp; Password
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Keep your account protected with a strong password.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#0e90d9] focus:ring-2 focus:ring-[#0e90d9]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#0e90d9] focus:ring-2 focus:ring-[#0e90d9]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="Re-enter new password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#0e90d9] focus:ring-2 focus:ring-[#0e90d9]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end border-t border-gray-100 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#040975] hover:bg-[#060ca3] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
                >
                  <KeyRound size={15} />
                  <span>{savingPassword ? "Updating Password..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
