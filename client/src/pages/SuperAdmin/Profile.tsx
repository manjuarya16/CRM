import React, { useState, useEffect } from "react";
import { useSuperAdminStore } from "@/store/superAdminStore";
import Swal from "sweetalert2";
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Calendar,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Save,
  Clock,
  Sparkles,
} from "lucide-react";

export const SuperAdminProfile: React.FC = () => {
  const { admin, refreshAdminProfile, updateAdminProfile } = useSuperAdminStore();

  // Personal Info Form State
  const [name, setName] = useState(admin?.name || "");
  const [phone, setPhone] = useState(admin?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (admin) {
      setName(admin.name || "");
      setPhone(admin.phone || "");
    }
  }, [admin]);

  const validatePhone = (val: string): boolean => {
    if (!val.trim()) {
      setPhoneError("");
      return true;
    }
    const digits = val.trim().replace(/\D/g, "");
    if (digits.length !== 10) {
      setPhoneError("Phone number must be exactly 10 digits.");
      return false;
    }
    if (/^(\d)\1{9}$/.test(digits) || digits === "0000000000") {
      setPhoneError("Phone number cannot contain all identical digits.");
      return false;
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setPhoneError("Phone number must start with 6, 7, 8, or 9.");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: "Full name is required." });
      return;
    }
    if (phone.trim() && !validatePhone(phone)) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: phoneError || "Please enter a valid phone number." });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateAdminProfile({
        name: name.trim(),
        phone: phone.trim() ? phone.trim().replace(/\D/g, "") : null,
      });

      if (res.success) {
        await refreshAdminProfile();
        await Swal.fire({
          icon: "success",
          title: "Profile Updated",
          text: "Your profile details have been successfully saved.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: res.error || "Could not update profile.",
        });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await updateAdminProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.success) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await Swal.fire({
          icon: "success",
          title: "Password Changed",
          text: "Your account password has been updated successfully.",
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Password Change Failed",
          text: res.error || "Failed to update password.",
        });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const roleTitle = admin?.is_platform_owner
    ? "Platform Owner"
    : admin?.role_name || "Super Administrator";

  const permissionsList = admin?.permissions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ─── Profile Header Banner ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-3xl font-black text-white shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950/50">
              {String(admin?.name || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-3 py-0.5 rounded-full border border-indigo-200/80 dark:border-indigo-800/80">
                  <Shield size={12} />
                  {roleTitle}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                  <CheckCircle2 size={12} />
                  {admin?.status || "Active"}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {admin?.name || "Super Admin"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail size={13} className="text-slate-400" />
                {admin?.email}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-1.5 text-xs text-slate-500 dark:text-slate-400 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-700/80 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Security Clearance</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Sparkles size={13} className="text-amber-500" />
              Full System Access
            </span>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) ── Edit Details & Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-700/80 mb-5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Personal & Contact Details</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your name, contact phone, and login identifier.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter full name"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPhone(val);
                        if (phoneError) validatePhone(val);
                      }}
                      onBlur={() => validatePhone(phone)}
                      placeholder="10-digit mobile number"
                      className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                        phoneError ? "border-rose-500 ring-1 ring-rose-500" : "border-gray-300 dark:border-slate-700"
                      } bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition`}
                    />
                  </div>
                  {phoneError && <p className="text-xs text-rose-500 mt-1 font-medium">{phoneError}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={admin?.email || ""}
                    disabled
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none"
                  />
                  <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Platform staff email is locked to system login credentials.</p>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{savingProfile ? "Saving..." : "Save Details"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-700/80 mb-5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Security & Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update your account password regularly to ensure system protection.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound size={15} />
                  <span>{savingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col) ── Account & Privileges Info */}
        <div className="space-y-6">
          {/* Account Overview */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 dark:border-gray-700/80 flex items-center gap-2">
              <Shield size={16} className="text-indigo-600" />
              Role & Status
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100/60 dark:border-gray-700/60">
                <span className="text-gray-500">Assigned Role</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{roleTitle}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100/60 dark:border-gray-700/60">
                <span className="text-gray-500">Ownership</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {admin?.is_platform_owner ? "Platform Owner" : "Delegated Staff"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100/60 dark:border-gray-700/60">
                <span className="text-gray-500">Status</span>
                <span className="font-bold text-emerald-600 uppercase">{admin?.status || "Active"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100/60 dark:border-gray-700/60">
                <span className="text-gray-500 flex items-center gap-1">
                  <Calendar size={13} /> Created Date
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {admin?.created_at ? new Date(admin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "System Default"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock size={13} /> Last Updated
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {admin?.updated_at ? new Date(admin.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}
                </span>
              </div>
            </div>
          </div>

          {/* Platform Privileges */}
          <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700/80">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                Privileges
              </h4>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                {admin?.is_platform_owner ? "All 48" : permissionsList.length} Active
              </span>
            </div>

            {admin?.is_platform_owner ? (
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                  Full Administrative Privileges
                </p>
                <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  As Platform Owner, your account possesses unrestricted view, create, edit, and delete permissions across all multi-tenant SaaS modules.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {permissionsList.length === 0 ? (
                  <p className="text-xs text-gray-400 py-3 text-center">No explicit permissions assigned</p>
                ) : (
                  permissionsList.map((perm) => (
                    <div
                      key={perm}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-gray-100 dark:border-gray-700/60 text-[11px] font-mono text-slate-700 dark:text-slate-300"
                    >
                      {perm}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;
