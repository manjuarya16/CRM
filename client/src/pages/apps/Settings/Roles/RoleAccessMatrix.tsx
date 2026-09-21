import React, { useState, useEffect } from "react";
import API from "@/config";
import Swal from "sweetalert2";
import { IRole, MatrixModule } from "@/interface";
import { ALL_CRM_PERMISSION_KEYS } from "@/constants/permissions";

const MATRIX_MODULES: MatrixModule[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    slug: "dashboards",
    avatarChar: "D",
    avatarBg: "bg-blue-600",
    viewKey: "dashboard.view",
    addKey: "dashboard.create",
    updateKey: "dashboard.edit",
    deleteKey: "dashboard.delete",
  },
  {
    id: "organization",
    name: "Organization",
    slug: "organization",
    avatarChar: "O",
    avatarBg: "bg-purple-600",
    viewKey: "organizations.view",
    addKey: "organizations.create",
    updateKey: "organizations.edit",
    deleteKey: "organizations.delete",
  },
  {
    id: "users",
    name: "Users",
    slug: "users",
    avatarChar: "U",
    avatarBg: "bg-sky-500",
    viewKey: "settings.users.view",
    addKey: "settings.users.create",
    updateKey: "settings.users.edit",
    deleteKey: "settings.users.delete",
  },
  {
    id: "roles",
    name: "Roles",
    slug: "roles",
    avatarChar: "R",
    avatarBg: "bg-emerald-600",
    viewKey: "settings.roles.view",
    addKey: "settings.roles.create",
    updateKey: "settings.roles.edit",
    deleteKey: "settings.roles.delete",
  },
  {
    id: "user_access",
    name: "User Access Manage",
    slug: "access-management",
    avatarChar: "U",
    avatarBg: "bg-amber-500",
    viewKey: "settings.roles.view",
    addKey: "settings.roles.create",
    updateKey: "settings.roles.edit",
    deleteKey: "settings.roles.delete",
  },
  {
    id: "branch",
    name: "Branch",
    slug: "branch",
    avatarChar: "B",
    avatarBg: "bg-rose-500",
    viewKey: "settings.branch.view",
    addKey: "settings.branch.create",
    updateKey: "settings.branch.edit",
    deleteKey: "settings.branch.delete",
  },
  {
    id: "department",
    name: "Department",
    slug: "department",
    avatarChar: "D",
    avatarBg: "bg-indigo-600",
    viewKey: "settings.groups.view",
    addKey: "settings.groups.create",
    updateKey: "settings.groups.edit",
    deleteKey: "settings.groups.delete",
  },
  {
    id: "leads",
    name: "Leads",
    slug: "leads",
    avatarChar: "L",
    avatarBg: "bg-cyan-600",
    viewKey: "leads.view",
    addKey: "leads.create",
    updateKey: "leads.edit",
    deleteKey: "leads.delete",
  },
  {
    id: "quotes",
    name: "Quotes",
    slug: "quotes",
    avatarChar: "Q",
    avatarBg: "bg-violet-600",
    viewKey: "quotes.view",
    addKey: "quotes.create",
    updateKey: "quotes.edit",
    deleteKey: "quotes.delete",
  },
  {
    id: "products",
    name: "Products",
    slug: "products",
    avatarChar: "P",
    avatarBg: "bg-teal-600",
    viewKey: "products.view",
    addKey: "products.create",
    updateKey: "products.edit",
    deleteKey: "products.delete",
  },
  {
    id: "activities",
    name: "Activities",
    slug: "activities",
    avatarChar: "A",
    avatarBg: "bg-orange-500",
    viewKey: "activities.view",
    addKey: "activities.create",
    updateKey: "activities.edit",
    deleteKey: "activities.delete",
  },
  {
    id: "mail",
    name: "Mail",
    slug: "mail",
    avatarChar: "M",
    avatarBg: "bg-blue-500",
    viewKey: "mail.inbox",
    addKey: "mail.draft",
    updateKey: "mail.setting",
    deleteKey: "mail.trash",
  },
  {
    id: "pipelines",
    name: "Pipelines",
    slug: "pipelines",
    avatarChar: "P",
    avatarBg: "bg-emerald-500",
    viewKey: "settings.pipelines.view",
    addKey: "settings.pipelines.create",
    updateKey: "settings.pipelines.edit",
    deleteKey: "settings.pipelines.delete",
  },
  {
    id: "sources",
    name: "Sources",
    slug: "sources",
    avatarChar: "S",
    avatarBg: "bg-indigo-500",
    viewKey: "settings.sources.view",
    addKey: "settings.sources.create",
    updateKey: "settings.sources.edit",
    deleteKey: "settings.sources.delete",
  },
  {
    id: "types",
    name: "Types",
    slug: "types",
    avatarChar: "T",
    avatarBg: "bg-purple-500",
    viewKey: "settings.types.view",
    addKey: "settings.types.create",
    updateKey: "settings.types.edit",
    deleteKey: "settings.types.delete",
  },
  {
    id: "configuration",
    name: "Configuration",
    slug: "configuration",
    avatarChar: "C",
    avatarBg: "bg-slate-600",
    viewKey: "settings.configuration.view",
    addKey: "settings.configuration.create",
    updateKey: "settings.configuration.edit",
    deleteKey: "settings.configuration.delete",
  },
];

export const RoleAccessMatrix: React.FC = () => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await API.get("/role/").catch(() => ({ data: { data: [] } }));
      const list: IRole[] = res.data?.data || [];
      setRoles(list);
      if (list.length > 0) {
        selectRole(list[0]);
      }
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

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
  };

  const handleRoleChange = (roleId: number) => {
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      selectRole(role);
    }
  };

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleModuleAll = (mod: MatrixModule) => {
    const modKeys = [mod.viewKey, mod.addKey, mod.updateKey, mod.deleteKey];
    const isAllSelected = modKeys.every((k) => selectedPermissions.includes(k));

    if (isAllSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((k) => !modKeys.includes(k))
      );
    } else {
      const set = new Set([...selectedPermissions, ...modKeys]);
      setSelectedPermissions(Array.from(set));
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

    const allChecked = targetKeys.every((k) => selectedPermissions.includes(k));
    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((k) => !targetKeys.includes(k)));
    } else {
      const set = new Set([...selectedPermissions, ...targetKeys]);
      setSelectedPermissions(Array.from(set));
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) {
      Swal.fire("Warning", "Please select a role first", "warning");
      return;
    }

    const currentRole = roles.find((r) => r.id === selectedRoleId);
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

      await API.put("/role/" + selectedRoleId, payload);
      Swal.fire({
        icon: "success",
        title: "Access Saved!",
        text: "Permissions for role \"" + currentRole.name + "\" have been updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Refresh roles
      const res = await API.get("/role/").catch(() => ({ data: { data: [] } }));
      const list: IRole[] = res.data?.data || [];
      setRoles(list);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message || "Failed to save permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  const currentRole = roles.find((r) => r.id === selectedRoleId);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading roles and permissions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Top Bar Header matching screenshot */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Role Dropdown Selector */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="relative min-w-[220px]">
            <select
              value={selectedRoleId || ""}
              onChange={(e) => handleRoleChange(Number(e.target.value))}
              className="w-full pl-3.5 pr-8 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] cursor-pointer shadow-sm appearance-none"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Middle: Legend */}
        <div className="flex items-center gap-5 text-xs font-medium text-gray-600 dark:text-gray-300">
          <button
            type="button"
            onClick={() => toggleColumnAll("view")}
            className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
            title="Click to toggle all View permissions"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>View</span>
          </button>
          <button
            type="button"
            onClick={() => toggleColumnAll("add")}
            className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
            title="Click to toggle all Add permissions"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={() => toggleColumnAll("update")}
            className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"
            title="Click to toggle all Update permissions"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Update</span>
          </button>
          <button
            type="button"
            onClick={() => toggleColumnAll("delete")}
            className="flex items-center gap-1.5 hover:text-rose-500 transition-colors"
            title="Click to toggle all Delete permissions"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Delete</span>
          </button>
        </div>

        {/* Right: Save Access Button */}
        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Access</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 text-xs uppercase font-semibold tracking-wider">
              <th className="py-4 px-6 text-gray-500 dark:text-gray-400 w-80">
                MODULE
              </th>
              <th className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumnAll("view")}
                  className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  VIEW
                </button>
              </th>
              <th className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumnAll("add")}
                  className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  ADD
                </button>
              </th>
              <th className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumnAll("update")}
                  className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  UPDATE
                </button>
              </th>
              <th className="py-4 px-4 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumnAll("delete")}
                  className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  DELETE
                </button>
              </th>
              <th className="py-4 px-6 text-center">
                <button
                  type="button"
                  onClick={() => toggleColumnAll("all")}
                  className="text-[#4f46e5] dark:text-indigo-400 hover:underline font-semibold"
                >
                  ALL
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {MATRIX_MODULES.map((mod) => {
              const hasView = selectedPermissions.includes(mod.viewKey);
              const hasAdd = selectedPermissions.includes(mod.addKey);
              const hasUpdate = selectedPermissions.includes(mod.updateKey);
              const hasDelete = selectedPermissions.includes(mod.deleteKey);
              const isRowAll = hasView && hasAdd && hasUpdate && hasDelete;

              return (
                <tr
                  key={mod.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors"
                >
                  {/* Module avatar & title */}
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={"w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm " + mod.avatarBg}
                      >
                        {mod.avatarChar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {mod.name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
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
                      className="w-5 h-5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer transition-colors"
                    />
                  </td>

                  {/* ADD Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={hasAdd}
                      onChange={() => togglePermission(mod.addKey)}
                      className="w-5 h-5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer transition-colors"
                    />
                  </td>

                  {/* UPDATE Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={hasUpdate}
                      onChange={() => togglePermission(mod.updateKey)}
                      className="w-5 h-5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer transition-colors"
                    />
                  </td>

                  {/* DELETE Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={hasDelete}
                      onChange={() => togglePermission(mod.deleteKey)}
                      className="w-5 h-5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer transition-colors"
                    />
                  </td>

                  {/* ALL Checkbox */}
                  <td className="py-3.5 px-6 text-center">
                    <input
                      type="checkbox"
                      checked={isRowAll}
                      onChange={() => toggleModuleAll(mod)}
                      className="w-5 h-5 rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] cursor-pointer transition-colors"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
