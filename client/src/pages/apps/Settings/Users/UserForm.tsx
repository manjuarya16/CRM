import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useUserStore, useRoleStore, useGroupStore } from "@/store";
import { IRole, IGroup, IUserData } from "@/interface";
import { userFormSchema } from "@/schemas";
import { ZodError } from "zod";
import { buildHierarchicalRoleList } from "@/utils/roleHierarchy";

export interface UserFormProps {
  mode: "create" | "edit";
}

export const UserForm: React.FC<UserFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreate = mode === "create";

  const [roles, setRoles] = useState<IRole[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    role_id: 1,
    group_ids: [] as number[],
    status: true,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [groupSearch, setGroupSearch] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchInitialData();
  }, [id, mode]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [rolesList, groupsList] = await Promise.all([
        useRoleStore.getState().fetchRoles(true),
        useGroupStore.getState().fetchGroups(),
      ]);
      const validRoles = rolesList || [];
      const validGroups = groupsList || [];
      setRoles(validRoles);
      setGroups(validGroups);

      if (isCreate) {
        if (validRoles.length > 0) {
          setFormData((prev) => ({
            ...prev,
            role_id: Number(validRoles[0].id),
          }));
        }
      } else if (id) {
        await useUserStore.getState().fetchUserById(Number(id), true);
        const user = useUserStore.getState().selectedUser as IUserData | null;
        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            password: "",
            confirm_password: "",
            role_id: user.role_id ? Number(user.role_id) : validRoles[0]?.id || 1,
            group_ids: user.group_ids
              ? user.group_ids.map(Number)
              : (user.groups || []).map((g: any) => Number(g.id || g)),
            status: user.status !== undefined ? Boolean(user.status) : true,
          });
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const hierarchicalRoles = useMemo(() => {
    const activeRoles = roles.filter((r) => (r as any).status !== false);
    return buildHierarchicalRoleList(activeRoles);
  }, [roles]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter(
      (g) =>
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, groupSearch]);

  const toggleGroupSelection = (groupId: number) => {
    setFormData((prev) => {
      const current = prev.group_ids;
      const updated = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];
      return { ...prev, group_ids: updated };
    });
  };

  const handleSelectAllGroups = () => {
    setFormData((prev) => ({
      ...prev,
      group_ids: groups.map((g) => Number(g.id)),
    }));
  };

  const handleClearAllGroups = () => {
    setFormData((prev) => ({
      ...prev,
      group_ids: [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isCreate) {
      if (!formData.password) {
        setErrors((prev) => ({ ...prev, password: "Password is required" }));
        return;
      }
      if (!formData.confirm_password) {
        setErrors((prev) => ({ ...prev, confirm_password: "Confirm password is required" }));
        return;
      }
    }

    try {
      const validated = userFormSchema.parse(formData);
      setSaving(true);

      const payload: any = {
        name: validated.name.trim(),
        email: validated.email ? validated.email.trim() : undefined,
        role_id: validated.role_id,
        group_ids: validated.group_ids,
        status: validated.status,
        view_permission: "global",
      };

      if (validated.password && validated.password.trim()) {
        payload.password = validated.password.trim();
      }

      if (isCreate) {
        await useUserStore.getState().addUser(payload);
      } else if (id) {
        await useUserStore.getState().updateUser(Number(id), payload);
      }

      navigate("/settings/users");
    } catch (err: any) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0] as string;
          if (path && !fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        const msg =
          err?.response?.data?.message || err?.message || "Failed to save user";
        Swal.fire({
          icon: "error",
          title: "Submission Error",
          text: msg,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#0088cc] dark:focus:border-[#0088cc] rounded-xl text-xs sm:text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-100 placeholder-gray-400";
  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading user details...</p>
      </div>
    );
  }

  const pageTitle = isCreate ? "Create User" : "Edit User";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0e90d9] hover:underline">
          Settings
        </Link>
        <span>/</span>
        <Link to="/settings/users" className="text-[#0e90d9] hover:underline">
          Users
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">{pageTitle}</span>
      </div>

      {/* 🏷️ Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/settings/users"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Users"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {pageTitle}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 font-mono text-xs font-bold border border-blue-100 dark:border-blue-800/60 shrink-0">
                {isCreate ? "New" : `#USER-${id}`}
              </span>
            </div>
            {formData.name ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.name}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {isCreate
                  ? "Add a new user to your organization"
                  : "Update user account credentials and role assignments"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            to="/settings/users"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="mgc_check_line text-base"></i>
            )}
            <span>{isCreate ? "Save User" : "Update User"}</span>
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* 📋 Card 1: User Details */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0088cc] flex items-center justify-center font-bold">
              <i className="mgc_user_3_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                User Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Personal identity, credentials, role, and group assignments
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className={labelCls}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: "" });
                  }}
                  className={`${inputCls} ${errors.name ? "!border-red-500 !ring-red-500/20" : ""}`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name}</p>}
              </div>

              {/* Email Address */}
              <div>
                <label className={labelCls}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@company.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  className={`${inputCls} ${errors.email ? "!border-red-500 !ring-red-500/20" : ""}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Password */}
              <div>
                <label className={labelCls}>
                  Password{" "}
                  {isCreate ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-gray-400 font-normal lowercase">(leave blank to keep current)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={isCreate ? "Minimum 6 characters" : "••••••••"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) setErrors({ ...errors, password: "" });
                    }}
                    className={`${inputCls} pr-10 ${errors.password ? "!border-red-500 !ring-red-500/20" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    <i className={showPassword ? "mgc_eye_close_line text-base" : "mgc_eye_line text-base"}></i>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelCls}>
                  Confirm Password{" "}
                  {isCreate ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-gray-400 font-normal lowercase">(leave blank to keep current)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={isCreate ? "Re-enter password" : "••••••••"}
                    value={formData.confirm_password}
                    onChange={(e) => {
                      setFormData({ ...formData, confirm_password: e.target.value });
                      if (errors.confirm_password) setErrors({ ...errors, confirm_password: "" });
                    }}
                    className={`${inputCls} pr-10 ${errors.confirm_password ? "!border-red-500 !ring-red-500/20" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    <i className={showConfirmPassword ? "mgc_eye_close_line text-base" : "mgc_eye_line text-base"}></i>
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className={labelCls}>
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role_id}
                onChange={(e) => {
                  setFormData({ ...formData, role_id: Number(e.target.value) });
                  if (errors.role_id) setErrors({ ...errors, role_id: "" });
                }}
                className={`${inputCls} cursor-pointer appearance-none ${errors.role_id ? "!border-red-500 !ring-red-500/20" : ""}`}
              >
                {hierarchicalRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {"\u00A0\u00A0\u00A0\u00A0".repeat(r.__depth || 0)}
                    {r.__depth ? "└── " : ""}
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.role_id && (
                <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.role_id}</p>
              )}
            </div>


            {/* Groups Selection */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <label className={labelCls}>
                    Assigned Groups ({formData.group_ids.length} selected)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Grant access to shared leads, deals, and records within these groups
                  </p>
                </div>
                {groups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllGroups}
                      className="text-xs text-[#0e90d9] hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllGroups}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {groups.length > 6 && (
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search groups..."
                    className={inputCls}
                  />
                </div>
              )}

              {groups.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
                  No groups defined yet. You can create groups under Settings &gt; Groups.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 max-h-60 overflow-y-auto">
                  {filteredGroups.map((g) => {
                    const isSelected = formData.group_ids.includes(Number(g.id));
                    return (
                      <label
                        key={g.id}
                        onClick={() => toggleGroupSelection(Number(g.id))}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                          isSelected
                            ? "border-[#0088cc] bg-sky-50/70 dark:bg-sky-950/40 text-[#0088cc] dark:text-[#38bdf8]"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${
                            isSelected
                              ? "bg-[#0088cc] border-[#0088cc] text-white"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                          }`}
                        >
                          {isSelected && <i className="mgc_check_line text-xs font-bold"></i>}
                        </div>
                        <div className="truncate">
                          <span className="block truncate">{g.name}</span>
                          {g.description && (
                            <span className="block text-[10px] text-gray-400 truncate font-normal">
                              {g.description}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Account Status Switch */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0088cc]"></div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                    {formData.status ? "Active Account" : "Inactive Account"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    {formData.status
                      ? "User can sign in and access the system immediately"
                      : "User sign-in access is suspended"}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
export default UserForm;
