import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { IRole, MatrixModule } from "@/interface";
import { ALL_CRM_PERMISSION_KEYS } from "@/constants/permissions";
import { MATRIX_MODULES } from "@/constants/matrixModules";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore, useRoleStore } from "@/store";

type CategoryKey = "all" | "crm" | "inventory" | "automation" | "settings";

interface CategoryMeta {
  key: CategoryKey;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "all", label: "All Modules", icon: "mgc_grid_2_line" },
  { key: "crm", label: "Core CRM", icon: "mgc_briefcase_line" },
  { key: "inventory", label: "Products & Stock", icon: "mgc_box_3_line" },
  { key: "automation", label: "Marketing & Automation", icon: "mgc_zap_line" },
  { key: "settings", label: "Settings & System", icon: "mgc_settings_3_line" },
];

const getModuleCategory = (id: string): CategoryKey => {
  if (["dashboard", "organization", "leads", "quotes", "mail", "activities", "persons"].includes(id)) {
    return "crm";
  }
  if (["products", "warehouses"].includes(id)) {
    return "inventory";
  }
  if (["email_templates", "events", "campaigns", "webhooks", "workflows", "webforms"].includes(id)) {
    return "automation";
  }
  return "settings";
};

export const RoleAccessMatrix: React.FC = () => {
  const { user } = useAuthStore();
  const { isAllAccess, hasPermission } = usePermission();
  const canEdit = hasPermission("settings.access_management.edit") || hasPermission("settings.roles.edit");

  const [roles, setRoles] = useState<IRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savedPermissions, setSavedPermissions] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table"
  );

  const currentUserRole = useMemo(() => {
    if (!user) return null;
    const rId = (user as any).role_id != null ? Number((user as any).role_id) : null;
    const rName = String((user as any).role || (user as any).role_name || "").toLowerCase();

    if (rId) {
      const match = roles.find((r) => Number(r.id) === rId);
      if (match) return match;
    }
    if (rName) {
      const match = roles.find((r) => String(r.name || "").toLowerCase() === rName);
      if (match) return match;
    }
    return null;
  }, [user, roles]);

  const visibleRoles = useMemo(() => {
    if (isAllAccess || !currentUserRole) {
      return roles;
    }

    const startRoleId = Number(currentUserRole.id);
    const allowedIds = new Set<number>([startRoleId]);

    let added = true;
    while (added) {
      added = false;
      roles.forEach((r) => {
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

    return roles.filter((r) => allowedIds.has(Number(r.id)));
  }, [roles, currentUserRole, isAllAccess]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const list = await useRoleStore.getState().fetchRoles(true);
      setRoles(list || []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const selectRole = (role: IRole) => {
    setSelectedRoleId(role.id);
    let perms: string[] = [];
    if (role.permission_type === "all") {
      perms = [...ALL_CRM_PERMISSION_KEYS];
    } else if (Array.isArray(role.permissions)) {
      perms = role.permissions;
    } else if (typeof role.permissions === "string") {
      try {
        perms = JSON.parse(role.permissions);
      } catch {
        perms = [];
      }
    }
    setSelectedPermissions(perms);
    setSavedPermissions(perms);
  };

  useEffect(() => {
    if (visibleRoles.length > 0 && (!selectedRoleId || !visibleRoles.some((r) => r.id === selectedRoleId))) {
      selectRole(visibleRoles[0]);
    }
  }, [visibleRoles]);

  const handleRoleChange = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      selectRole(role);
    }
  };

  const currentRole = roles.find((r) => r.id === selectedRoleId);

  // Check if permissions have changed compared to saved
  const hasUnsavedChanges = useMemo(() => {
    if (selectedPermissions.length !== savedPermissions.length) return true;
    const s1 = new Set(selectedPermissions);
    return savedPermissions.some((p) => !s1.has(p));
  }, [selectedPermissions, savedPermissions]);

  const handleReset = () => {
    setSelectedPermissions(savedPermissions);
  };

  // Toggle single permission key
  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Toggle all 4 permissions for a single module
  const toggleModuleAll = (mod: MatrixModule) => {
    const modKeys = [mod.viewKey, mod.addKey, mod.updateKey, mod.deleteKey];
    const isAllSelected = modKeys.every((k) => selectedPermissions.includes(k));

    if (isAllSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !modKeys.includes(k)));
    } else {
      const set = new Set([...selectedPermissions, ...modKeys]);
      setSelectedPermissions(Array.from(set));
    }
  };

  // Toggle column for current filtered modules or all modules
  const toggleColumnAll = (action: "view" | "add" | "update" | "delete" | "all") => {
    let targetKeys: string[] = [];
    if (action === "view") targetKeys = filteredModules.map((m) => m.viewKey);
    else if (action === "add") targetKeys = filteredModules.map((m) => m.addKey);
    else if (action === "update") targetKeys = filteredModules.map((m) => m.updateKey);
    else if (action === "delete") targetKeys = filteredModules.map((m) => m.deleteKey);
    else if (action === "all") {
      targetKeys = filteredModules.flatMap((m) => [m.viewKey, m.addKey, m.updateKey, m.deleteKey]);
    }

    const allChecked = targetKeys.every((k) => selectedPermissions.includes(k));
    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !targetKeys.includes(k)));
    } else {
      const set = new Set([...selectedPermissions, ...targetKeys]);
      setSelectedPermissions(Array.from(set));
    }
  };

  // Preset Shortcuts
  const applyPreset = (preset: "grant_all" | "read_only" | "clear_all") => {
    if (preset === "grant_all") {
      const allMatrixKeys = MATRIX_MODULES.flatMap((m) => [m.viewKey, m.addKey, m.updateKey, m.deleteKey]);
      const set = new Set([...selectedPermissions, ...allMatrixKeys, ...ALL_CRM_PERMISSION_KEYS]);
      setSelectedPermissions(Array.from(set));
    } else if (preset === "read_only") {
      const allWriteKeys = MATRIX_MODULES.flatMap((m) => [m.addKey, m.updateKey, m.deleteKey]);
      const allViewKeys = MATRIX_MODULES.map((m) => m.viewKey);
      const filtered = selectedPermissions.filter((k) => !allWriteKeys.includes(k));
      const set = new Set([...filtered, ...allViewKeys]);
      setSelectedPermissions(Array.from(set));
    } else if (preset === "clear_all") {
      setSelectedPermissions([]);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedRoleId) {
      Swal.fire("Warning", "Please select a role first", "warning");
      return;
    }

    if (!currentRole) return;

    try {
      setSaving(true);
      const isAll = selectedPermissions.length >= ALL_CRM_PERMISSION_KEYS.length;

      const payload = {
        name: currentRole.name,
        description: currentRole.description || null,
        permission_type: isAll ? "all" : "custom",
        permissions: isAll ? ALL_CRM_PERMISSION_KEYS : selectedPermissions,
      };

      await useRoleStore.getState().saveRole(payload, selectedRoleId);
      setSavedPermissions([...selectedPermissions]);

      Swal.fire({
        icon: "success",
        title: "Access Saved!",
        text: `Permissions for role "${currentRole.name}" have been updated successfully.`,
        timer: 1500,
        showConfirmButton: false,
      });

      // Refresh roles
      const list = await useRoleStore.getState().fetchRoles(true);
      setRoles(list || []);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message || "Failed to save permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filtered modules based on category and search query
  const filteredModules = useMemo(() => {
    return MATRIX_MODULES.filter((m) => {
      const cat = getModuleCategory(m.id);
      const matchesCategory = activeCategory === "all" || cat === activeCategory;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  // Statistics Calculation
  const stats = useMemo(() => {
    let viewCount = 0;
    let addCount = 0;
    let updateCount = 0;
    let deleteCount = 0;

    MATRIX_MODULES.forEach((m) => {
      if (selectedPermissions.includes(m.viewKey)) viewCount++;
      if (selectedPermissions.includes(m.addKey)) addCount++;
      if (selectedPermissions.includes(m.updateKey)) updateCount++;
      if (selectedPermissions.includes(m.deleteKey)) deleteCount++;
    });

    const totalPossible = MATRIX_MODULES.length * 4;
    const totalGranted = viewCount + addCount + updateCount + deleteCount;
    const percent = Math.round((totalGranted / totalPossible) * 100);

    return {
      viewCount,
      addCount,
      updateCount,
      deleteCount,
      totalGranted,
      totalPossible,
      percent,
      totalModules: MATRIX_MODULES.length,
    };
  }, [selectedPermissions]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[350px]">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#0e90d9] border-t-transparent"></div>
        <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Loading roles and permissions matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Access Management</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <span>Access Management Matrix</span>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Unsaved Changes
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Visually manage granular CRM permissions across all roles with instant toggle controls
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/settings/roles"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 transition shadow-2xs"
          >
            <i className="mgc_user_shield_line text-base text-gray-500"></i>
            Manage Roles
          </Link>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-xl transition"
              title="Discard unsaved changes"
            >
              <i className="mgc_refresh_3_line text-base"></i>
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canEdit}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="mgc_save_line text-base"></i>
                <span>Save Permissions</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 👑 Role Selector Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Role Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 flex items-center justify-center text-[#0e90d9] font-bold text-lg shadow-2xs">
              <i className="mgc_user_shield_line"></i>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
                Target Role
              </span>
              <div className="relative mt-0.5 min-w-[240px]">
                <select
                  value={selectedRoleId || ""}
                  onChange={(e) => handleRoleChange(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-1.5 text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/70 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 cursor-pointer transition"
                >
                  {visibleRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.parent_role_id ? `(Sub-role)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Role Badges & Status */}
          {currentRole && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-100 dark:border-sky-900/50">
                #ROLE-{currentRole.id}
              </span>
              <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                stats.percent >= 90
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200"
                  : stats.percent > 0
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border-gray-200"
              }`}>
                {stats.percent >= 90 ? "Full Access" : `${stats.percent}% Access Granted`}
              </span>
              {currentRole.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate hidden lg:inline" title={currentRole.description}>
                  {currentRole.description}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 📊 Coverage Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-xs">
          {/* Total Granted */}
          <div className="p-3 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
            <span className="text-gray-400 block text-[11px] font-medium">Total Granted</span>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              {stats.totalGranted} <span className="text-xs text-gray-400 font-normal">/ {stats.totalPossible}</span>
            </span>
          </div>

          {/* VIEW */}
          <button
            type="button"
            onClick={() => toggleColumnAll("view")}
            className="p-3 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 rounded-xl border border-blue-200/60 dark:border-blue-800/60 text-left transition group"
            title="Click to toggle all View permissions"
          >
            <div className="flex items-center justify-between">
              <span className="text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
                <i className="mgc_eye_line text-xs"></i> View
              </span>
              <span className="text-[10px] text-blue-500 opacity-70 group-hover:opacity-100">Toggle</span>
            </div>
            <span className="text-base font-bold text-blue-800 dark:text-blue-200 block mt-0.5">
              {stats.viewCount} <span className="text-xs font-normal text-blue-500">/ {stats.totalModules}</span>
            </span>
          </button>

          {/* ADD */}
          <button
            type="button"
            onClick={() => toggleColumnAll("add")}
            className="p-3 bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 text-left transition group"
            title="Click to toggle all Add permissions"
          >
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <i className="mgc_add_line text-xs"></i> Add
              </span>
              <span className="text-[10px] text-emerald-500 opacity-70 group-hover:opacity-100">Toggle</span>
            </div>
            <span className="text-base font-bold text-emerald-800 dark:text-emerald-200 block mt-0.5">
              {stats.addCount} <span className="text-xs font-normal text-emerald-500">/ {stats.totalModules}</span>
            </span>
          </button>

          {/* UPDATE */}
          <button
            type="button"
            onClick={() => toggleColumnAll("update")}
            className="p-3 bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 rounded-xl border border-amber-200/60 dark:border-amber-800/60 text-left transition group"
            title="Click to toggle all Update permissions"
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                <i className="mgc_edit_line text-xs"></i> Update
              </span>
              <span className="text-[10px] text-amber-600 opacity-70 group-hover:opacity-100">Toggle</span>
            </div>
            <span className="text-base font-bold text-amber-900 dark:text-amber-200 block mt-0.5">
              {stats.updateCount} <span className="text-xs font-normal text-amber-600">/ {stats.totalModules}</span>
            </span>
          </button>

          {/* DELETE */}
          <button
            type="button"
            onClick={() => toggleColumnAll("delete")}
            className="p-3 bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200/60 dark:border-rose-800/60 text-left transition group"
            title="Click to toggle all Delete permissions"
          >
            <div className="flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                <i className="mgc_delete_line text-xs"></i> Delete
              </span>
              <span className="text-[10px] text-rose-500 opacity-70 group-hover:opacity-100">Toggle</span>
            </div>
            <span className="text-base font-bold text-rose-800 dark:text-rose-200 block mt-0.5">
              {stats.deleteCount} <span className="text-xs font-normal text-rose-500">/ {stats.totalModules}</span>
            </span>
          </button>

          {/* Presets Action */}
          <div className="p-2.5 bg-gray-50/80 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <span className="text-gray-400 block text-[11px] font-medium">Quick Presets</span>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => applyPreset("grant_all")}
                className="flex-1 py-1 px-1 bg-white dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-[#0e90d9] font-bold text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 transition text-center"
                title="Grant All Permissions"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => applyPreset("read_only")}
                className="flex-1 py-1 px-1 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 font-bold text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 transition text-center"
                title="Set Read-Only Access (View all)"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => applyPreset("clear_all")}
                className="flex-1 py-1 px-1 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 font-bold text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 transition text-center"
                title="Revoke All Permissions"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠️ Filter & Search Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="mgc_search_line text-base"></i>
            </span>
            <input
              type="text"
              placeholder="Search module by name or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-56 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeCategory === cat.key
                    ? "bg-[#0e90d9] text-white shadow-2xs"
                    : "bg-gray-100/70 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700"
                }`}
              >
                <i className={`${cat.icon} text-sm`}></i>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-600">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              title="Table Matrix View"
            >
              <i className="mgc_table_line text-sm"></i>
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
              title="Cards Grid View"
            >
              <i className="mgc_grid_2_line text-sm"></i>
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>

        {/* 📋 Permission Matrix Content */}
        {filteredModules.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <i className="mgc_search_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No matching CRM modules found.</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing the search or category filter</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards Grid View (Ultra Visible on all screen sizes) */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredModules.map((mod) => {
              const hasView = selectedPermissions.includes(mod.viewKey);
              const hasAdd = selectedPermissions.includes(mod.addKey);
              const hasUpdate = selectedPermissions.includes(mod.updateKey);
              const hasDelete = selectedPermissions.includes(mod.deleteKey);
              const count = (hasView ? 1 : 0) + (hasAdd ? 1 : 0) + (hasUpdate ? 1 : 0) + (hasDelete ? 1 : 0);
              const isFull = count === 4;

              return (
                <div
                  key={mod.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                    isFull
                      ? "border-[#0088cc]/50 dark:border-sky-800 shadow-2xs bg-sky-50/15 dark:bg-sky-950/10"
                      : count > 0
                      ? "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
                      : "border-gray-200 dark:border-gray-700/60 opacity-80"
                  }`}
                >
                  {/* Top: Avatar + Name + All Toggle */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs shrink-0 ${mod.avatarBg}`}>
                        {mod.avatarChar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {mod.name}
                        </p>
                        <span className="font-mono text-[11px] text-gray-400 block truncate">
                          {mod.slug}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModuleAll(mod)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                        isFull
                          ? "bg-[#0e90d9] text-white shadow-2xs"
                          : count > 0
                          ? "bg-sky-50 text-[#0088cc] dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      {isFull ? "Full Access" : `${count}/4 Active`}
                    </button>
                  </div>

                  {/* Body: 4 Big Interactive Color-Coded Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    {/* View */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.viewKey)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition active:scale-95 ${
                        hasView
                          ? "bg-blue-100/90 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300 dark:border-blue-700 shadow-2xs"
                          : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <i className="mgc_eye_line text-sm"></i> View
                      </span>
                      <input
                        type="checkbox"
                        checked={hasView}
                        readOnly
                        className="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer pointer-events-none"
                      />
                    </button>

                    {/* Add */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.addKey)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition active:scale-95 ${
                        hasAdd
                          ? "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-2xs"
                          : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <i className="mgc_add_line text-sm"></i> Add
                      </span>
                      <input
                        type="checkbox"
                        checked={hasAdd}
                        readOnly
                        className="rounded border-gray-300 text-emerald-600 focus:ring-0 cursor-pointer pointer-events-none"
                      />
                    </button>

                    {/* Update */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.updateKey)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition active:scale-95 ${
                        hasUpdate
                          ? "bg-amber-100/90 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs"
                          : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <i className="mgc_edit_line text-sm"></i> Update
                      </span>
                      <input
                        type="checkbox"
                        checked={hasUpdate}
                        readOnly
                        className="rounded border-gray-300 text-amber-600 focus:ring-0 cursor-pointer pointer-events-none"
                      />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => togglePermission(mod.deleteKey)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition active:scale-95 ${
                        hasDelete
                          ? "bg-rose-100/90 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border-rose-300 dark:border-rose-700 shadow-2xs"
                          : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <i className="mgc_delete_line text-sm"></i> Delete
                      </span>
                      <input
                        type="checkbox"
                        checked={hasDelete}
                        readOnly
                        className="rounded border-gray-300 text-rose-600 focus:ring-0 cursor-pointer pointer-events-none"
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Matrix View with Mobile Card Fallback */
          <div>
            {/* Mobile Fallback: Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {filteredModules.map((mod) => {
                const hasView = selectedPermissions.includes(mod.viewKey);
                const hasAdd = selectedPermissions.includes(mod.addKey);
                const hasUpdate = selectedPermissions.includes(mod.updateKey);
                const hasDelete = selectedPermissions.includes(mod.deleteKey);
                const count = (hasView ? 1 : 0) + (hasAdd ? 1 : 0) + (hasUpdate ? 1 : 0) + (hasDelete ? 1 : 0);
                const isFull = count === 4;

                return (
                  <div
                    key={mod.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs ${mod.avatarBg}`}>
                          {mod.avatarChar}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                            {mod.name}
                          </p>
                          <span className="text-[11px] text-gray-400 font-mono">{mod.slug}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModuleAll(mod)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                          isFull
                            ? "bg-[#0e90d9] text-white"
                            : count > 0
                            ? "bg-sky-50 text-[#0088cc] dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isFull ? "All" : `${count}/4`}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => togglePermission(mod.viewKey)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                          hasView
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-300"
                            : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 border-gray-200"
                        }`}
                      >
                        <span>View</span>
                        <input type="checkbox" checked={hasView} readOnly className="rounded text-blue-600 pointer-events-none" />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePermission(mod.addKey)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                          hasAdd
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border-emerald-300"
                            : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 border-gray-200"
                        }`}
                      >
                        <span>Add</span>
                        <input type="checkbox" checked={hasAdd} readOnly className="rounded text-emerald-600 pointer-events-none" />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePermission(mod.updateKey)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                          hasUpdate
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300"
                            : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 border-gray-200"
                        }`}
                      >
                        <span>Update</span>
                        <input type="checkbox" checked={hasUpdate} readOnly className="rounded text-amber-600 pointer-events-none" />
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePermission(mod.deleteKey)}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                          hasDelete
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200 border-rose-300"
                            : "bg-gray-50 text-gray-400 dark:bg-gray-900/40 border-gray-200"
                        }`}
                      >
                        <span>Delete</span>
                        <input type="checkbox" checked={hasDelete} readOnly className="rounded text-rose-600 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-6 min-w-[220px]">CRM Module</th>
                    <th className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleColumnAll("view")}
                        className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-bold"
                        title="Click to toggle all View permissions"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        VIEW ({stats.viewCount})
                      </button>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleColumnAll("add")}
                        className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                        title="Click to toggle all Add permissions"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ADD ({stats.addCount})
                      </button>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleColumnAll("update")}
                        className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-bold"
                        title="Click to toggle all Update permissions"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        UPDATE ({stats.updateCount})
                      </button>
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleColumnAll("delete")}
                        className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:underline font-bold"
                        title="Click to toggle all Delete permissions"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        DELETE ({stats.deleteCount})
                      </button>
                    </th>
                    <th className="py-3.5 px-6 text-center">
                      <button
                        type="button"
                        onClick={() => toggleColumnAll("all")}
                        className="text-[#0e90d9] dark:text-sky-400 hover:underline font-bold"
                        title="Click to toggle all permissions"
                      >
                        ALL
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {filteredModules.map((mod) => {
                    const hasView = selectedPermissions.includes(mod.viewKey);
                    const hasAdd = selectedPermissions.includes(mod.addKey);
                    const hasUpdate = selectedPermissions.includes(mod.updateKey);
                    const hasDelete = selectedPermissions.includes(mod.deleteKey);
                    const count = (hasView ? 1 : 0) + (hasAdd ? 1 : 0) + (hasUpdate ? 1 : 0) + (hasDelete ? 1 : 0);
                    const isRowAll = count === 4;

                    return (
                      <tr
                        key={mod.id}
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors ${
                          isRowAll ? "bg-sky-50/20 dark:bg-sky-950/10" : ""
                        }`}
                      >
                        {/* Module Info */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0 ${mod.avatarBg}`}>
                              {mod.avatarChar}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {mod.name}
                              </div>
                              <span className="font-mono text-xs text-gray-400">
                                {mod.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* VIEW */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.viewKey)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                              hasView
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                                : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasView}
                              readOnly
                              className="rounded border-gray-300 text-blue-600 focus:ring-0 pointer-events-none"
                            />
                            <span>View</span>
                          </button>
                        </td>

                        {/* ADD */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.addKey)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                              hasAdd
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs"
                                : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasAdd}
                              readOnly
                              className="rounded border-gray-300 text-emerald-600 focus:ring-0 pointer-events-none"
                            />
                            <span>Add</span>
                          </button>
                        </td>

                        {/* UPDATE */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.updateKey)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                              hasUpdate
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs"
                                : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasUpdate}
                              readOnly
                              className="rounded border-gray-300 text-amber-600 focus:ring-0 pointer-events-none"
                            />
                            <span>Update</span>
                          </button>
                        </td>

                        {/* DELETE */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.deleteKey)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                              hasDelete
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-2xs"
                                : "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasDelete}
                              readOnly
                              className="rounded border-gray-300 text-rose-600 focus:ring-0 pointer-events-none"
                            />
                            <span>Delete</span>
                          </button>
                        </td>

                        {/* ALL */}
                        <td className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => toggleModuleAll(mod)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                              isRowAll
                                ? "bg-[#0e90d9] text-white shadow-2xs"
                                : count > 0
                                ? "bg-sky-50 text-[#0088cc] dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200"
                            }`}
                          >
                            <span>{isRowAll ? "Full Access" : `${count}/4`}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
