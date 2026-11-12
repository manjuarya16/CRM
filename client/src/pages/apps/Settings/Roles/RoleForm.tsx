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
                  const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                  setName(sanitized);
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
                <option value="" disabled hidden>Select parent role</option>
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

    </form>
  );
};

export default RoleForm;
