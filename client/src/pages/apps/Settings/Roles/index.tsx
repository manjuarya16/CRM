import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";

import { IRole } from "@/interface";
import { roleSchema } from "@/schemas";
import { ZodError } from "zod";
import { CRM_PERMISSION_GROUPS, ALL_CRM_PERMISSION_KEYS } from "@/constants/permissions";
import { RoleAccessMatrix } from "./RoleAccessMatrix";

const RolesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"matrix" | "list">("matrix");
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<IRole | null>(null);
  const [viewingRole, setViewingRole] = useState<IRole | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    permission_type: "all" | "custom";
    permissions: string[];
  }>({
    name: "",
    description: "",
    permission_type: "all",
    permissions: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [permissionSearch, setPermissionSearch] = useState<string>("");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await API.get("/role/").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setRoles(list);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permission_type: "all",
      permissions: [...ALL_CRM_PERMISSION_KEYS],
    });
    setErrors({});
    setPermissionSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (role: IRole) => {
    setEditingRole(role);
    let perms: string[] = [];
    if (Array.isArray(role.permissions)) {
      perms = role.permissions;
    } else if (typeof role.permissions === "string") {
      try {
        perms = JSON.parse(role.permissions);
      } catch {
        perms = [];
      }
    } else if (role.permission_type === "all") {
      perms = [...ALL_CRM_PERMISSION_KEYS];
    }

    setFormData({
      name: role.name || "",
      description: role.description || "",
      permission_type: (role.permission_type as "all" | "custom") || "all",
      permissions: perms,
    });
    setErrors({});
    setPermissionSearch("");
    setIsModalOpen(true);
  };

  const openViewModal = (role: IRole) => {
    setViewingRole(role);
    setIsViewModalOpen(true);
  };

  // Permission selection helpers
  const handleTogglePermission = (key: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(key);
      const updated = exists
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: updated };
    });
  };

  const handleToggleGroup = (groupKeys: string[]) => {
    setFormData((prev) => {
      const allSelected = groupKeys.every((k) => prev.permissions.includes(k));
      let updated: string[];
      if (allSelected) {
        // Deselect group
        updated = prev.permissions.filter((k) => !groupKeys.includes(k));
      } else {
        // Select all in group
        const set = new Set([...prev.permissions, ...groupKeys]);
        updated = Array.from(set);
      }
      return { ...prev, permissions: updated };
    });
  };

  const handleSelectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [...ALL_CRM_PERMISSION_KEYS],
    }));
  };

  const handleClearAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  // Unified Save (Add & Edit)
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        permission_type: formData.permission_type,
        permissions:
          formData.permission_type === "all"
            ? ALL_CRM_PERMISSION_KEYS
            : formData.permissions,
      };

      const validated = roleSchema.parse(payload);
      setSaving(true);

      if (editingRole) {
        // Update
        await API.put(`/role/${editingRole.id}`, validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // Add
        await API.post("/role/", validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const field = issue.path[0];
          if (field) {
            fieldErrors[String(field)] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
      Swal.fire("Error", err?.response?.data?.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Role
  const handleDelete = async (role: IRole) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete role "${role.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/role/${role.id}`);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Role deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchRoles();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete role", "error");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRoles.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredRoles = roles.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(s) ||
      r.description?.toLowerCase().includes(s) ||
      r.permission_type?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil(filteredRoles.length / perPage) || 1;
  const paginatedRoles = filteredRoles.slice((page - 1) * perPage, page * perPage);
  const isAllSelected = paginatedRoles.length > 0 && paginatedRoles.every((r) => selectedIds.includes(r.id));

  // Filter permission groups for custom builder search
  const filteredGroups = CRM_PERMISSION_GROUPS.map((group) => {
    if (!permissionSearch.trim()) return group;
    const q = permissionSearch.toLowerCase();
    const matchingPerms = group.permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
    return {
      ...group,
      permissions: matchingPerms,
    };
  }).filter((g) => g.permissions.length > 0);

  // Parse viewing role permissions for display
  const viewingRolePerms: string[] = React.useMemo(() => {
    if (!viewingRole) return [];
    if (viewingRole.permission_type === "all") return ALL_CRM_PERMISSION_KEYS;
    if (Array.isArray(viewingRole.permissions)) return viewingRole.permissions;
    if (typeof viewingRole.permissions === "string") {
      try {
        return JSON.parse(viewingRole.permissions);
      } catch {
        return [];
      }
    }
    return [];
  }, [viewingRole]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs and Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Roles & Permissions</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Roles & Permissions
          </h1>
        </div>

        <div>
          <Link
            to="/settings/roles/create"
            className="inline-flex items-center px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-base mr-1.5"></i>
            Create Role
          </Link>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "matrix"
              ? "border-[#4f46e5] text-[#4f46e5] dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Role Access Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("list")}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "list"
              ? "border-[#0088cc] text-[#0088cc]"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Roles List
        </button>
      </div>

      {activeTab === "matrix" ? (
        <RoleAccessMatrix />
      ) : (
      /* Main Card */
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="mgc_search_line text-base"></i>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search roles..."
              className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-64 dark:text-gray-200 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 w-16">ID</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Role Name</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Description</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Permission Scope</th>
                <th className="py-3.5 px-4 font-semibold text-center text-gray-600 dark:text-gray-300">Users</th>
                <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : paginatedRoles.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium"
                  >
                    No roles found.
                  </td>
                </tr>
              ) : (
                paginatedRoles.map((role) => {
                  const isSelected = selectedIds.includes(role.id);
                  const isAll = role.permission_type === "all" || !role.permission_type;
                  const permsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;

                  return (
                    <tr
                      key={role.id}
                      className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                        isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(role.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {role.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => openViewModal(role)}
                          className="hover:text-[#0088cc] transition-colors font-semibold text-left flex items-center gap-1.5"
                        >
                          {role.name}
                          <i className="mgc_information_line text-gray-400 hover:text-[#0088cc] text-xs"></i>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                        {role.description || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        {isAll ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <i className="mgc_shield_check_line text-sm"></i>
                            All Permissions (Full Access)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0088cc] dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                            <i className="mgc_key_2_line text-sm"></i>
                            Custom ({permsCount} / {ALL_CRM_PERMISSION_KEYS.length})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {role.user_count || 0} user{role.user_count === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openViewModal(role)}
                          className="inline-flex items-center text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 p-1.5 rounded-lg transition-colors"
                          title="View Role & Permissions Details"
                        >
                          <i className="mgc_eye_line text-base"></i>
                        </button>
                        <Link
                          to={`/settings/roles/edit/${role.id}`}
                          className="inline-flex items-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg transition-colors"
                          title="Edit Role & Permissions"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(role)}
                          className="inline-flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"
                          title="Delete Role"
                        >
                          <i className="mgc_delete_2_line text-base"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredRoles.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredRoles.length)} of {filteredRoles.length} roles
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 1. VIEW ROLE DETAILS MODAL */}
      {isViewModalOpen && viewingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc]">
                  <i className="mgc_shield_check_line text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {viewingRole.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {viewingRole.description || "No description provided"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* Role Meta Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Scope</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 capitalize">
                    {viewingRole.permission_type === "all" ? "Full Access (All)" : "Custom"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Active Perms</div>
                  <div className="text-xs font-bold text-[#0088cc] mt-1">
                    {viewingRole.permission_type === "all"
                      ? `${ALL_CRM_PERMISSION_KEYS.length} (All)`
                      : `${viewingRolePerms.length} Active`}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Assigned Users</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                    {viewingRole.user_count || 0} user(s)
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Created Date</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                    {viewingRole.created_at ? new Date(viewingRole.created_at).toLocaleDateString() : "-"}
                  </div>
                </div>
              </div>

              {/* Granted Permissions Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Granted Module Permissions
                </h3>

                {viewingRole.permission_type === "all" ? (
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
                    <i className="mgc_shield_check_line text-2xl text-emerald-600"></i>
                    <div>
                      <div className="font-semibold text-sm">Full Administrative Access</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        This role has unrestricted permissions across all CRM modules (View, Create, Edit, Delete).
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {CRM_PERMISSION_GROUPS.map((group) => {
                      const grantedInGroup = group.permissions.filter((p) =>
                        viewingRolePerms.includes(p.key)
                      );
                      if (grantedInGroup.length === 0) return null;

                      return (
                        <div
                          key={group.id}
                          className="p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 text-xs">
                              <i className={`${group.icon} text-base text-[#0088cc]`}></i>
                              {group.name}
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-gray-700 text-gray-500 font-medium">
                              {grantedInGroup.length} / {group.permissions.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {grantedInGroup.map((p) => (
                              <span
                                key={p.key}
                                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-[#0088cc] border border-sky-200 dark:border-sky-800 font-medium"
                              >
                                <i className="mgc_check_line text-xs"></i>
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(viewingRole);
                }}
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <i className="mgc_edit_line text-sm"></i>
                Edit This Role
              </button>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATE / EDIT ROLE MODAL WITH CRM PERMISSIONS BUILDER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {editingRole ? "Edit Role & Permissions" : "Create New Role"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure CRM functional access control and permissions for users assigned to this role.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form noValidate onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Role Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Manager, Support Lead"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none ${
                      errors.name
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of this role's duties"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none ${
                      errors.description
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.description}</p>
                  )}
                </div>
              </div>

              {/* Permission Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Permission Scope <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, permission_type: "all" })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.permission_type === "all"
                        ? "border-[#0088cc] bg-sky-50/50 dark:bg-sky-950/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.permission_type === "all" ? "bg-[#0088cc] text-white" : "bg-gray-100 text-gray-500"}`}>
                        <i className="mgc_shield_check_line text-xl"></i>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          All Permissions
                        </div>
                        <div className="text-xs text-gray-500">
                          Grants unrestricted administrative access to all CRM modules (View, Create, Edit, Delete).
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, permission_type: "custom" })}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.permission_type === "custom"
                        ? "border-[#0088cc] bg-sky-50/50 dark:bg-sky-950/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.permission_type === "custom" ? "bg-[#0088cc] text-white" : "bg-gray-100 text-gray-500"}`}>
                        <i className="mgc_key_2_line text-xl"></i>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          Custom Permissions
                        </div>
                        <div className="text-xs text-gray-500">
                          Select granular View, Add, Update, and Delete permissions per module.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Permission Matrix */}
              {formData.permission_type === "custom" && (
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Granular CRM Permissions Matrix
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formData.permissions.length} of {ALL_CRM_PERMISSION_KEYS.length} actions enabled
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <input
                        type="text"
                        placeholder="Search permissions..."
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc] w-44"
                      />
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="px-2.5 py-1.5 text-xs font-semibold text-[#0088cc] bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllPermissions}
                        className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Modules Accordion / Matrix Grid */}
                  <div className="space-y-3">
                    {filteredGroups.map((group) => {
                      const groupKeys = group.permissions.map((p) => p.key);
                      const selectedInGroup = groupKeys.filter((k) =>
                        formData.permissions.includes(k)
                      );
                      const isGroupAllSelected =
                        groupKeys.length > 0 && selectedInGroup.length === groupKeys.length;
                      const isGroupPartial =
                        selectedInGroup.length > 0 && selectedInGroup.length < groupKeys.length;

                      return (
                        <div
                          key={group.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50/40 dark:bg-gray-800/40"
                        >
                          {/* Module Header */}
                          <div className="p-3.5 bg-gray-100/60 dark:bg-gray-700/50 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isGroupAllSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isGroupPartial;
                                  }}
                                  onChange={() => handleToggleGroup(groupKeys)}
                                  className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                                />
                              </label>
                              <div className="flex items-center gap-2">
                                <i className={`${group.icon} text-lg text-[#0088cc]`}></i>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                  {group.name}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                              {selectedInGroup.length} / {groupKeys.length} selected
                            </span>
                          </div>

                          {/* Individual Permission Checkboxes (View, Add, Edit, Delete) */}
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-gray-800">
                            {group.permissions.map((perm) => {
                              const isChecked = formData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                    isChecked
                                      ? "border-[#0088cc]/50 bg-sky-50/40 dark:bg-sky-950/20"
                                      : "border-gray-100 dark:border-gray-700 hover:border-gray-200"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="mt-0.5 rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                        {perm.name}
                                      </span>
                                      {perm.action && (
                                        <span
                                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                            perm.action === "view"
                                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                                              : perm.action === "create"
                                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                                              : perm.action === "edit"
                                              ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                                              : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
                                          }`}
                                        >
                                          {perm.action}
                                        </span>
                                      )}
                                    </div>
                                    {perm.description && (
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                        {perm.description}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      {perm.key}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingRole ? "Update Role" : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
