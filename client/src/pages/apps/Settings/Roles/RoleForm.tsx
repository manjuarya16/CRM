import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { ZodError } from "zod";
import { roleSchema } from "@/schemas";
import { ALL_CRM_PERMISSION_KEYS } from "@/constants/permissions";
import { MatrixModule, RoleFormProps } from "@/interface";

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

export const RoleForm: React.FC<RoleFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [permissionType, setPermissionType] = useState<"all" | "custom">("custom");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(mode === "edit");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      fetchRoleDetails(id);
    }
  }, [mode, id]);

  const fetchRoleDetails = async (roleId: string) => {
    try {
      setLoading(true);
      const res = await API.get("/role/" + roleId);
      const data = res.data?.data;
      if (data) {
        setName(data.name || "");
        setDescription(data.description || "");
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
        permission_type: permissionType,
        permissions: permissionType === "all" ? ALL_CRM_PERMISSION_KEYS : permissions,
      };

      const validated = roleSchema.parse(payload);
      setErrors({});
      setSaving(true);

      if (mode === "edit" && id) {
        await API.put("/role/" + id, validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await API.post("/role/", validated);
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
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading role details...</span>
        </div>
      </div>
    );
  }

  const isCreate = mode === "create";
  const pageTitle = isCreate ? "Create Role" : "Edit Role";

  return (
    <form noValidate onSubmit={handleSubmit} className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Actions Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            /{" "}
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            /{" "}
            <Link to="/settings/roles" className="text-[#0088cc] hover:underline">
              Roles
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">{pageTitle}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/roles"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
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

      {/* Top Card: General Role Information & Permission Scope */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          Role Details & Scope
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Role Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Field Officers, Sales Manager"
              className={`w-full px-3.5 py-2.5 text-sm border ${
                errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#4f46e5]"
              } rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
              }}
              placeholder="e.g. Access permissions for field agents"
              className={`w-full px-3.5 py-2.5 text-sm border ${
                errors.description ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#4f46e5]"
              } rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent`}
            />
            {errors.description && <p className="mt-1 text-xs text-red-500 font-medium">{errors.description}</p>}
          </div>

          {/* Permission Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              Permission Type <span className="text-red-500">*</span>
            </label>
            <select
              value={permissionType}
              onChange={(e) =>
                handlePermissionTypeChange(e.target.value as "all" | "custom")
              }
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent cursor-pointer"
            >
              <option value="custom">Custom (Select Modules Below)</option>
              <option value="all">All (Full Administrative Access)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Permissions Matrix Table matching Screenshot Listing Design */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Table Top Bar: Legend & Column Selection */}
        <div className="p-4 bg-gray-50/70 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Module Permissions Matrix
          </div>

          {/* Legend */}
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
        </div>

        {/* Permissions Matrix Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/40 text-xs uppercase font-semibold tracking-wider">
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
                const hasView = permissions.includes(mod.viewKey);
                const hasAdd = permissions.includes(mod.addKey);
                const hasUpdate = permissions.includes(mod.updateKey);
                const hasDelete = permissions.includes(mod.deleteKey);
                const isRowAll = hasView && hasAdd && hasUpdate && hasDelete;

                return (
                  <tr
                    key={mod.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors"
                  >
                    {/* Module avatar badge & title */}
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
    </form>
  );
};
