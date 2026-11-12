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
  const [nameError, setNameError] = useState("");
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

  const validateName = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setNameError("Full name is required.");
      return false;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
      setNameError("Full name cannot contain special characters or numbers. Only letters and spaces are allowed.");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Backspace" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }
    // Block special characters and numbers on keypress
    if (e.key.length === 1 && !/^[a-zA-Z\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip special characters and numbers immediately on type
    const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setName(sanitized);
    if (nameError) validateName(sanitized);
  };

  const handleNamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const sanitized = pastedText.replace(/[^a-zA-Z\s]/g, "");
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const updated = name.slice(0, start) + sanitized + name.slice(end);
    setName(updated);
    if (nameError) validateName(updated);
  };

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
    if (!validateName(name)) {
      Swal.fire({ icon: "warning", title: "Validation Error", text: nameError || "Full name cannot contain special characters or numbers." });
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
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-gradient-to-br from-[#040975]/5 to-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex h-18 w-18 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#040975] via-[#1a237e] to-[#3949ab] text-2xl sm:text-3xl font-black text-white shadow-md ring-4 ring-slate-100 dark:ring-slate-800">
              {String(admin?.name || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#040975] bg-[#040975]/10 px-3 py-1 rounded-full border border-[#040975]/20">
                  <Shield size={13} className="shrink-0" />
                  <span className="leading-none">{roleTitle}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span className="leading-none">{admin?.status || "Active"}</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {admin?.name || "Super Admin"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span>{admin?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-1.5 text-xs text-slate-500 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Security Clearance</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>Full System Access</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── Two-Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) ── Personal Details & Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Form */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#040975]/10 text-[#040975]">
                <User size={18} className="shrink-0" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">Personal & Contact Details</h3>
                <p className="text-xs text-slate-500">Manage your name, contact phone number, and platform account details.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={16} className="shrink-0" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onKeyDown={handleNameKeyDown}
                      onChange={handleNameChange}
                      onPaste={handleNamePaste}
                      onBlur={() => validateName(name)}
                      placeholder="Enter full name (letters only)"
                      required
                      className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                        nameError ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200"
                      } bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#040975]/20 focus:border-[#040975] outline-none transition`}
                    />
                  </div>
                  {nameError && <p className="text-xs text-rose-500 mt-1 font-medium">{nameError}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone size={16} className="shrink-0" />
                    </div>
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
                      className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                        phoneError ? "border-rose-500 ring-2 ring-rose-500/20" : "border-slate-200"
                      } bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#040975]/20 focus:border-[#040975] outline-none transition`}
                    />
                  </div>
                  {phoneError && <p className="text-xs text-rose-500 mt-1 font-medium">{phoneError}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} className="shrink-0" />
                  </div>
                  <input
                    type="email"
                    value={admin?.email || ""}
                    disabled
                    className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed outline-none select-none font-medium"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={15} className="shrink-0" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <Lock size={12} className="text-slate-400 shrink-0" />
                  <span>Platform staff email is locked to system login credentials.</span>
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400">Keep your details updated for system notifications.</span>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#040975] hover:bg-[#232894] text-white font-bold text-xs px-5 py-2.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <Save size={15} className="shrink-0" />
                  <span className="leading-none">{savingProfile ? "Saving..." : "Save Details"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <KeyRound size={18} className="shrink-0" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">Security & Password</h3>
                <p className="text-xs text-slate-500">Update your account password regularly to ensure platform protection.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <Shield size={14} className="text-rose-500 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} className="shrink-0" />
                  </div>
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#040975]/20 focus:border-[#040975] outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition flex items-center justify-center cursor-pointer"
                      aria-label={showCurrentPass ? "Hide password" : "Show password"}
                    >
                      {showCurrentPass ? <EyeOff size={16} className="shrink-0" /> : <Eye size={16} className="shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} className="shrink-0" />
                    </div>
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#040975]/20 focus:border-[#040975] outline-none transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition flex items-center justify-center cursor-pointer"
                        aria-label={showNewPass ? "Hide password" : "Show password"}
                      >
                        {showNewPass ? <EyeOff size={16} className="shrink-0" /> : <Eye size={16} className="shrink-0" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} className="shrink-0" />
                    </div>
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#040975]/20 focus:border-[#040975] outline-none transition"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition flex items-center justify-center cursor-pointer"
                        aria-label={showConfirmPass ? "Hide password" : "Show password"}
                      >
                        {showConfirmPass ? <EyeOff size={16} className="shrink-0" /> : <Eye size={16} className="shrink-0" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <Shield size={14} className="text-slate-400 shrink-0" />
                <span>Password must be at least 8 characters long and match confirmation.</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <span className="text-xs text-slate-400">You will stay signed in on this current browser session.</span>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#040975] hover:bg-[#232894] text-white font-bold text-xs px-5 py-2.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound size={15} className="shrink-0" />
                  <span className="leading-none">{savingPassword ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col) ── Account & Privileges Info */}
        <div className="space-y-6">
          {/* Account Overview */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Shield size={16} className="text-[#040975] shrink-0" />
              <span>Role & Status</span>
            </h4>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Assigned Role</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{roleTitle}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ownership</span>
                <span className="font-semibold text-[#040975]">
                  {admin?.is_platform_owner ? "Platform Owner" : "Delegated Staff"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-600 uppercase">{admin?.status || "Active"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar size={13} className="shrink-0" />
                  <span>Created Date</span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {admin?.created_at ? new Date(admin.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "System Default"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock size={13} className="shrink-0" />
                  <span>Last Updated</span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {admin?.updated_at ? new Date(admin.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}
                </span>
              </div>
            </div>
          </div>

          {/* Platform Privileges */}
          <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-slate-800 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500 shrink-0" />
                <span>Privileges</span>
              </h4>
              <span className="text-[11px] font-bold text-[#040975] bg-[#040975]/10 px-2.5 py-0.5 rounded-full">
                {admin?.is_platform_owner ? "All 48" : permissionsList.length} Active
              </span>
            </div>

            {admin?.is_platform_owner ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Full Administrative Privileges</span>
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">
                  As Platform Owner, your account possesses unrestricted view, create, edit, and delete permissions across all multi-tenant SaaS modules.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {permissionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No explicit permissions assigned</p>
                ) : (
                  permissionsList.map((perm) => (
                    <div
                      key={perm}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-mono text-slate-700"
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
