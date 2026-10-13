import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useRoleStore } from "@/store";
import { ZodError } from "zod";
import { roleSchema } from "@/schemas";
import { ALL_CRM_PERMISSION_KEYS } from "@/constants/permissions";
import { MATRIX_MODULES } from "@/constants/matrixModules";
import { IRole, MatrixModule, RoleFormProps } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store";
import { buildHierarchicalRoleList } from "@/utils/roleHierarchy";

export const RoleForm: React.FC<RoleFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { isAllAccess, hasPermission } = usePermission();
  const canCreate = hasPermission("settings.roles.create");
  const canEdit = hasPermission("settings.roles.edit");
  const canSave = mode === "create" ? canCreate : canEdit;

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [parentRoleId, setParentRoleId] = useState<number | null>(null);
  const [roleDetails, setRoleDetails] = useState<IRole | null>(null);
  const [permissionType, setPermissionType] = useState<"all" | "custom">("custom");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<IRole[]>([]);
  const [moduleSearch, setModuleSearch] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(mode === "edit");
  const [saving, setSaving] = useState<boolean>(false);

  const currentUserRole = useMemo(() => {
    if (!user) return null;
    const rId = (user as any).role_id != null ? Number((user as any).role_id) : null;
    const rName = String((user as any).role || (user as any).role_name || "").toLowerCase();

    if (rId) {
      const match = allRoles.find((r) => Number(r.id) === rId);
      if (match) return match;
    }
    if (rName) {
      const match = allRoles.find((r) => String(r.name || "").toLowerCase() === rName);
      if (match) return match;
    }
    return null;
  }, [user, allRoles]);

  const visibleParentRoles = useMemo(() => {
    if (isAllAccess || !currentUserRole) {
      return allRoles;
    }

    const startRoleId = Number(currentUserRole.id);
    const allowedIds = new Set<number>([startRoleId]);

    let added = true;
    while (added) {
      added = false;
      allRoles.forEach((r) => {
        const rId = Number(r.id);
        if (!allowedIds.has(rId)) {
          const pid = r.parent_role_id ? Number(r.parent_role_id) : null;
          if (pid && allowedIds.has(pid)) {
            allowedIds.add(rId);
            added = true;
          }
        }
      });
    }

    return allRoles.filter((r) => allowedIds.has(Number(r.id)));
  }, [allRoles, currentUserRole, isAllAccess]);

  const hierarchicalParentRoles = useMemo(() => {
    return buildHierarchicalRoleList(visibleParentRoles);
  }, [visibleParentRoles]);

  useEffect(() => {
    fetchAllRoles();
    if (mode === "edit" && id) {
      fetchRoleDetails(id);
    }
  }, [mode, id]);

  const fetchAllRoles = async () => {
    try {
      const list = await useRoleStore.getState().fetchRoles(true);
      setAllRoles(list || []);
    } catch {
      setAllRoles([]);
    }
  };

  const fetchRoleDetails = async (roleId: string) => {
    try {
      setLoading(true);
      const data = await useRoleStore.getState().fetchRoleById(Number(roleId));
      if (data) {
        setRoleDetails(data);
        setName(data.name || "");
        setDescription(data.description || "");

        const initialParentId =
          data.parent_role_id != null &&
          String(data.parent_role_id).trim() !== "" &&
          Number(data.parent_role_id) > 0
            ? Number(data.parent_role_id)
            : null;
        setParentRoleId(initialParentId);

        const type = (data.permission_type as "all" | "custom") || "custom";
        setPermissionType(type);

        let perms: string[] = [];
        if (Array.isArray(data.permissions)) {
          perms = data.permissions;
        } else if (typeof data.permissions === "string") {
          try {
            perms = JSON.parse(data.permissions);
          } catch {
            perms = [];
          }
        }
        if (type === "all" && perms.length === 0) {
          perms = [...ALL_CRM_PERMISSION_KEYS];
        }
        setPermissions(perms);
      }
    } catch {
      Swal.fire("Error", "Failed to load role details", "error");
      navigate("/settings/roles");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionTypeChange = (newType: "all" | "custom") => {
    setPermissionType(newType);
    if (newType === "all") {
      setPermissions([...ALL_CRM_PERMISSION_KEYS]);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleModuleAll = (mod: MatrixModule) => {
    const modKeys = [mod.viewKey, mod.addKey, mod.updateKey, mod.deleteKey];
    const isAllSelected = modKeys.every((k) => permissions.includes(k));

    if (isAllSelected) {
      setPermissions((prev) => prev.filter((k) => !modKeys.includes(k)));
    } else {
      const set = new Set([...permissions, ...modKeys]);
      setPermissions(Array.from(set));
    }
  };

  const toggleColumnAll = (action: "view" | "add" | "update" | "delete" | "all") => {
    let targetKeys: string[] = [];
    if (action === "view") targetKeys = MATRIX_MODULES.map((m) => m.viewKey);
    else if (action === "add") targetKeys = MATRIX_MODULES.map((m) => m.addKey);
    else if (action === "update") targetKeys = MATRIX_MODULES.map((m) => m.updateKey);
    else if (action === "delete") targetKeys = MATRIX_MODULES.map((m) => m.deleteKey);
    else if (action === "all") {
      targetKeys = MATRIX_MODULES.flatMap((m) => [m.viewKey, m.addKey, m.updateKey, m.deleteKey]);
    }

    const allChecked = targetKeys.every((k) => permissions.includes(k));
    if (allChecked) {
      setPermissions((prev) => prev.filter((k) => !targetKeys.includes(k)));
    } else {
      const set = new Set([...permissions, ...targetKeys]);
      setPermissions(Array.from(set));
    }
  };

  const handleSelectAllPermissions = () => {
    const allKeys = MATRIX_MODULES.flatMap((m) => [m.viewKey, m.addKey, m.updateKey, m.deleteKey]);
    setPermissions(Array.from(new Set([...permissions, ...allKeys])));
  };

  const handleClearAllPermissions = () => {
    setPermissions([]);
  };

  const filteredMatrixModules = useMemo(() => {
    if (!moduleSearch.trim()) return MATRIX_MODULES;
    const q = moduleSearch.toLowerCase();
    return MATRIX_MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q)
    );
  }, [moduleSearch]);

  const totalMatrixKeysCount = useMemo(() => {
    return MATRIX_MODULES.length * 4;
  }, []);

  const activePermissionsCount = useMemo(() => {
    if (permissionType === "all") return ALL_CRM_PERMISSION_KEYS.length;
    return permissions.length;
  }, [permissionType, permissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrors((prev) => ({ ...prev, name: "Role name is required" }));
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        description: description?.trim() || null,
        parent_role_id: parentRoleId || null,
        permission_type: permissionType,
        permissions: permissionType === "all" ? ALL_CRM_PERMISSION_KEYS : permissions,
      };

      const validated = roleSchema.parse(payload);
      setErrors({});
      setSaving(true);

      if (mode === "edit" && id) {
        await useRoleStore.getState().saveRole(validated, id);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await useRoleStore.getState().saveRole(validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/settings/roles");
    } catch (err: any) {
      if (err instanceof ZodError) {
        const errMap: Record<string, string> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            errMap[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors((prev) => ({ ...prev, ...errMap }));
        return;
      }
      Swal.fire("Error", err?.response?.data?.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent mb-3"></div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading role details...</p>
        <p className="text-xs text-gray-400 mt-1">Fetching permissions and hierarchy</p>
      </div>
    );
  }

  const isCreate = mode === "create";
  const isSuperAdmin = !isCreate && String(id) === "1";
  const pageTitle = isCreate ? "Create Role" : `Edit Role: ${name || "Role"}`;

  return (
    <form noValidate onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* 🧭 Top Breadcrumbs Navigation */}
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
        <Link to="/settings/roles" className="text-[#0e90d9] hover:underline">
          Roles
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {isCreate ? "Create Role" : `Edit Role #${id}`}
        </span>
      </div>

      {/* 🏷️ Top Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/50 flex items-center justify-center text-[#0e90d9] shrink-0 mt-0.5 shadow-2xs">
            <i className="mgc_shield_line text-xl sm:text-2xl"></i>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                {pageTitle}
              </h1>
              {!isCreate && (
                <span className="font-mono text-xs font-bold text-[#0e90d9] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
                  #ROLE-{id}
                </span>
              )}
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <i className="mgc_shield_check_line text-xs"></i>
                  Root Administrator
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure organizational authority, hierarchy inheritance, and granular module permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/settings/roles"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 transition shadow-2xs"
          >
            <i className="mgc_close_line text-base text-gray-400"></i>
            Cancel
          </Link>
          {canSave && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="mgc_check_line text-base"></i>
                  <span>{isCreate ? "Create Role" : "Save Changes"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 📋 Section 1: Role Information & Scope Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0088cc]">
              <i className="mgc_information_line text-base"></i>
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                General Role Configuration
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Set basic identification and organizational reporting hierarchy
              </p>
            </div>
          </div>
          {roleDetails?.user_count != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/60 px-2.5 py-1 rounded-lg border border-gray-200/80 dark:border-gray-600">
              Assigned users: <strong className="text-gray-800 dark:text-gray-200">{roleDetails.user_count}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Role Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Role Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_user_3_line text-base"></i>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Sales Manager, Support Lead"
                className={`w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border bg-gray-50/60 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 transition ${
                  errors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 dark:border-gray-700 focus:border-[#0088cc]"
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>

          {/* Parent Role (Hierarchy) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Parent Role (Hierarchy)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_git_branch_line text-base"></i>
              </span>
              <select
                value={parentRoleId || ""}
                onChange={(e) => setParentRoleId(e.target.value ? Number(e.target.value) : null)}
                className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition cursor-pointer appearance-none"
              >
                <option value="">-- None (Top-Level Authority) --</option>
                {hierarchicalParentRoles
                  .filter((r) => !id || String(r.id) !== String(id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {"\u00A0\u00A0\u00A0\u00A0".repeat(r.__depth || 0)}{r.__depth ? "└── " : ""}{r.name}
                    </option>
                  ))}
              </select>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_down_line text-sm"></i>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Determines subordinate reporting visibility
            </p>
          </div>

          {/* Description */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_edit_line text-base"></i>
              </span>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="e.g. Access permissions for sales reps"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition"
              />
            </div>
            {errors.description && <p className="mt-1 text-xs text-red-500 font-medium">{errors.description}</p>}
          </div>
        </div>

        {/* Permission Type Cards */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Permission Access Model <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Custom Permissions Option */}
            <div
              onClick={() => handlePermissionTypeChange("custom")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                permissionType === "custom"
                  ? "border-[#0088cc] bg-sky-50/30 dark:bg-sky-950/20 shadow-xs"
                  : "border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                permissionType === "custom"
                  ? "bg-[#0088cc] text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500"
              }`}>
                <i className="mgc_key_2_line text-lg"></i>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Custom Permissions
                  </h3>
                  <input
                    type="radio"
                    name="permission_type"
                    checked={permissionType === "custom"}
                    onChange={() => handlePermissionTypeChange("custom")}
                    className="text-[#0088cc] focus:ring-[#0088cc]"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Granular control over each CRM module (View, Add, Update, Delete)
                </p>
              </div>
            </div>

            {/* All Permissions Option */}
            <div
              onClick={() => handlePermissionTypeChange("all")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                permissionType === "all"
                  ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs"
                  : "border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                permissionType === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500"
              }`}>
                <i className="mgc_shield_check_line text-lg"></i>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    All Permissions (Full Access)
                  </h3>
                  <input
                    type="radio"
                    name="permission_type"
                    checked={permissionType === "all"}
                    onChange={() => handlePermissionTypeChange("all")}
                    className="text-emerald-600 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Unrestricted administrative access to all CRM functions and settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🛡️ Section 2: Full Access Banner (when 'all' is selected) */}
      {permissionType === "all" ? (
        <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-2 border-emerald-200/80 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shrink-0 shadow-sm">
              <i className="mgc_shield_check_line text-2xl"></i>
            </div>
            <div>
              <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-100">
                Full Administrative Access Active
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-1 max-w-2xl leading-relaxed">
                Users assigned to this role automatically inherit all {ALL_CRM_PERMISSION_KEYS.length} system permissions across all CRM modules (including View, Create, Update, and Delete access).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handlePermissionTypeChange("custom")}
            className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 transition shadow-2xs shrink-0 self-start sm:self-center"
          >
            Customize Permissions
          </button>
        </div>
      ) : null}

      {/* 🔐 Section 3: Module Permissions Matrix Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Matrix Header & Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  Module Permissions Matrix
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <i className="mgc_key_2_line text-xs"></i>
                  <span>{activePermissionsCount} / {totalMatrixKeysCount} Actions</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Toggle specific functional capabilities for each CRM module
              </p>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllPermissions}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0088cc] hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllPermissions}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-300 transition"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Module Filter & Column Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
            {/* Search Module Input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                placeholder="Search module permissions..."
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 transition"
              />
            </div>

            {/* Column Bulk Toggle Buttons / Legend */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
              <span className="text-gray-400 text-xs hidden sm:inline">Bulk Column:</span>
              <button
                type="button"
                onClick={() => toggleColumnAll("view")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 transition"
                title="Click to toggle all View permissions"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={() => toggleColumnAll("add")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 transition"
                title="Click to toggle all Add permissions"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Add</span>
              </button>
              <button
                type="button"
                onClick={() => toggleColumnAll("update")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 transition"
                title="Click to toggle all Update permissions"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Update</span>
              </button>
              <button
                type="button"
                onClick={() => toggleColumnAll("delete")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 transition"
                title="Click to toggle all Delete permissions"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* 📱 Mobile View: Interactive Module Cards (Block on Mobile, Hidden on Desktop) */}
        <div className="block md:hidden p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/20">
          {filteredMatrixModules.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No modules match &quot;{moduleSearch}&quot;
            </div>
          ) : (
            filteredMatrixModules.map((mod) => {
              const hasView = permissions.includes(mod.viewKey);
              const hasAdd = permissions.includes(mod.addKey);
              const hasUpdate = permissions.includes(mod.updateKey);
              const hasDelete = permissions.includes(mod.deleteKey);
              const isRowAll = hasView && hasAdd && hasUpdate && hasDelete;

              return (
                <div
                  key={mod.id}
                  className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-2xs space-y-3"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs ${mod.avatarBg}`}>
                        {mod.avatarChar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {mod.name}
                        </h4>
                        <span className="text-[11px] font-mono text-gray-400">
                          {mod.slug}
                        </span>
                      </div>
                    </div>

                    {/* Toggle All for this module */}
                    <button
                      type="button"
                      onClick={() => toggleModuleAll(mod)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        isRowAll
                          ? "bg-[#0088cc] text-white border-[#0088cc]"
                          : "bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#0088cc]"
                      }`}
                    >
                      {isRowAll ? "All On" : "Select All"}
                    </button>
                  </div>

                  {/* 4 Action Pills Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* VIEW */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.viewKey)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        hasView
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold"
                          : "bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>View</span>
                      </span>
                      <i className={hasView ? "mgc_check_line text-sm text-blue-600 font-bold" : "mgc_add_line text-sm text-gray-300"}></i>
                    </button>

                    {/* ADD */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.addKey)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        hasAdd
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Add</span>
                      </span>
                      <i className={hasAdd ? "mgc_check_line text-sm text-emerald-600 font-bold" : "mgc_add_line text-sm text-gray-300"}></i>
                    </button>

                    {/* UPDATE */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.updateKey)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        hasUpdate
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold"
                          : "bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Update</span>
                      </span>
                      <i className={hasUpdate ? "mgc_check_line text-sm text-amber-600 font-bold" : "mgc_add_line text-sm text-gray-300"}></i>
                    </button>

                    {/* DELETE */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.deleteKey)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition ${
                        hasDelete
                          ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold"
                          : "bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Delete</span>
                      </span>
                      <i className={hasDelete ? "mgc_check_line text-sm text-rose-600 font-bold" : "mgc_add_line text-sm text-gray-300"}></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 💻 Desktop View: Full Matrix Table (Hidden on Mobile, Block on Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 text-xs uppercase font-semibold tracking-wider text-gray-600 dark:text-gray-300">
                <th className="py-3.5 px-6 text-gray-500 dark:text-gray-400 w-80">
                  CRM Module
                </th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumnAll("view")}
                    className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    VIEW
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumnAll("add")}
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    ADD
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumnAll("update")}
                    className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    UPDATE
                  </button>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumnAll("delete")}
                    className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    DELETE
                  </button>
                </th>
                <th className="py-3.5 px-6 text-center">
                  <button
                    type="button"
                    onClick={() => toggleColumnAll("all")}
                    className="text-[#0088cc] dark:text-[#38bdf8] hover:underline font-semibold"
                  >
                    ALL
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {filteredMatrixModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                    No modules match &quot;{moduleSearch}&quot;
                  </td>
                </tr>
              ) : (
                filteredMatrixModules.map((mod) => {
                  const hasView = permissions.includes(mod.viewKey);
                  const hasAdd = permissions.includes(mod.addKey);
                  const hasUpdate = permissions.includes(mod.updateKey);
                  const hasDelete = permissions.includes(mod.deleteKey);
                  const isRowAll = hasView && hasAdd && hasUpdate && hasDelete;

                  return (
                    <tr
                      key={mod.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      {/* Module avatar badge & title */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs ${mod.avatarBg}`}
                          >
                            {mod.avatarChar}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {mod.name}
                            </div>
                            <div className="text-[11px] font-mono text-gray-400 dark:text-gray-500">
                              {mod.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* VIEW Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasView}
                          onChange={() => togglePermission(mod.viewKey)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer transition-colors"
                        />
                      </td>

                      {/* ADD Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasAdd}
                          onChange={() => togglePermission(mod.addKey)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer transition-colors"
                        />
                      </td>

                      {/* UPDATE Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasUpdate}
                          onChange={() => togglePermission(mod.updateKey)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer transition-colors"
                        />
                      </td>

                      {/* DELETE Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={hasDelete}
                          onChange={() => togglePermission(mod.deleteKey)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer transition-colors"
                        />
                      </td>

                      {/* ALL Checkbox */}
                      <td className="py-3.5 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isRowAll}
                          onChange={() => toggleModuleAll(mod)}
                          className="w-4 h-4 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer transition-colors"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📌 Floating / Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 py-3 px-4 sm:px-8 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="hidden sm:inline">Permission Status:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {permissionType === "all" ? "Full Access (All Modules)" : `${permissions.length} actions enabled`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/settings/roles"
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Cancel
            </Link>
            {canSave && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <i className="mgc_check_line text-base"></i>
                    <span>{isCreate ? "Create Role" : "Save Changes"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

export default RoleForm;
