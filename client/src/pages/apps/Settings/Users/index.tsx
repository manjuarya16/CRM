import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IRole, IGroup, IUserData } from "@/interface";
import { userFormSchema } from "@/schemas";
import { ZodError } from "zod";

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<IUserData[]>([]);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State for Create / Edit User
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<IUserData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    status: true,
    role_id: 1,
    group_ids: [] as number[],
    view_permission: "global",
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
    fetchRolesAndGroups();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users");
      setUsers(res.data?.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndGroups = async () => {
    try {
      const [rolesRes, groupsRes] = await Promise.all([
        API.get("/roles").catch(() => ({ data: { data: [] } })),
        API.get("/groups").catch(() => ({ data: { data: [] } })),
      ]);
      setRoles(rolesRes.data?.data || []);
      setGroups(groupsRes.data?.data || []);
    } catch {
      // Fallback
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      confirm_password: "",
      status: true,
      role_id: roles[0]?.id || 1,
      group_ids: [],
      view_permission: "global",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: IUserData) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      confirm_password: "",
      status: Boolean(user.status),
      role_id: user.role_id || 1,
      group_ids: user.group_ids || (user.groups || []).map((g) => g.id),
      view_permission: user.view_permission || "global",
    });
    setIsModalOpen(true);
  };

  const toggleGroupSelection = (groupId: number) => {
    setFormData((prev) => {
      const current = prev.group_ids || [];
      const updated = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];
      return { ...prev, group_ids: updated };
    });
  };

  // Single unified function for both Add and Edit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!editingUser && !formData.password) {
        Swal.fire("Validation Error", "Password is required for new users", "warning");
        return;
      }

      const validated = userFormSchema.parse(formData);
      setSaving(true);

      const payload: any = {
        name: validated.name,
        email: validated.email,
        status: validated.status,
        role_id: validated.role_id,
        group_ids: validated.group_ids,
        view_permission: validated.view_permission,
      };

      if (validated.password) {
        payload.password = validated.password;
      }

      if (editingUser?.id) {
        // Edit / Update
        await API.put(`/users/${editingUser.id}`, payload);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "User updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        // Add / Create
        await API.post("/users", payload);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "User created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      if (err instanceof ZodError) {
        Swal.fire("Validation Error", err.issues[0]?.message || "Invalid input", "warning");
        return;
      }
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to save user",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: IUserData) => {
    Swal.fire({
      title: "Are you sure?",
      text: `Delete user "${user.name}" (${user.email})?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/users/${user.id}`);
          Swal.fire("Deleted!", "User has been deleted.", "success");
          fetchUsers();
        } catch (err: any) {
          Swal.fire(
            "Error",
            err?.response?.data?.message || "Failed to delete user",
            "error"
          );
        }
      }
    });
  };

  // Filtering & Pagination
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          String(u.id).includes(q) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.role_name && u.role_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Role filter
      if (selectedRole !== "all") {
        if (String(u.role_id) !== selectedRole) return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        const isAct = selectedStatus === "active";
        if (Boolean(u.status) !== isAct) return false;
      }

      return true;
    });
  }, [users, search, selectedRole, selectedStatus]);

  const totalPages = Math.ceil(filteredUsers.length / perPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredUsers.slice(start, start + perPage);
  }, [filteredUsers, page, perPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedUsers.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getViewPermissionLabel = (perm: string) => {
    switch (perm) {
      case "global":
        return { label: "Global", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" };
      case "group":
        return { label: "Group", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
      case "individual":
        return { label: "Individual", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
      default:
        return { label: perm || "Global", color: "bg-gray-100 text-gray-700" };
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Users</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Users
          </h1>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <i className="mgc_add_line text-lg"></i>
          Create User
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters and Controls Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
              <input
                type="text"
                placeholder="Search by ID, Name or Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0088cc]"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0088cc]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Per Page:
            </span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0088cc]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedUsers.length > 0 &&
                      paginatedUsers.every((u) => selectedIds.includes(u.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                  />
                </th>
                <th className="p-4 w-16">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Role</th>
                <th className="p-4">Groups</th>
                <th className="p-4 text-center">View Permission</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0088cc]"></div>
                    <p className="mt-2 text-xs">Loading users...</p>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    <i className="mgc_user_star_line text-4xl text-gray-300 dark:text-gray-600"></i>
                    <p className="mt-2 text-sm">No users found.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const permInfo = getViewPermissionLabel(user.view_permission);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => handleSelectOne(user.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                      </td>
                      <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                        {user.id}
                      </td>
                      <td className="p-4 font-semibold text-gray-900 dark:text-gray-100">
                        {user.name}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="p-4 text-center">
                        {user.status ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {user.role_name || "User"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1 max-w-xs">
                          {user.groups && user.groups.length > 0 ? (
                            user.groups.map((g) => (
                              <span
                                key={g.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              >
                                {g.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${permInfo.color}`}
                        >
                          {permInfo.label}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                            title="Edit User"
                          >
                            <i className="mgc_edit_line text-base"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            title="Delete User"
                          >
                            <i className="mgc_delete_2_line text-base"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredUsers.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredUsers.length)} of{" "}
            {filteredUsers.length} entries
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-xl my-8 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingUser ? "Edit User" : "Create User"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Password {editingUser ? "(Leave blank to keep)" : <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required={!editingUser && Boolean(formData.password)}
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirm_password: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role_id: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    View Permission <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.view_permission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        view_permission: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:border-[#0088cc]"
                  >
                    <option value="global">Global (Access all data)</option>
                    <option value="group">Group (Access group data)</option>
                    <option value="individual">Individual (Only own data)</option>
                  </select>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user_status"
                  checked={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.checked })
                  }
                  className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                />
                <label
                  htmlFor="user_status"
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Status (Active account)
                </label>
              </div>

              {/* Groups Selector */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Assign Groups
                </label>
                {groups.length === 0 ? (
                  <p className="text-xs text-gray-400">No groups available.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                    {groups.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.group_ids.includes(g.id)}
                          onChange={() => toggleGroupSelection(g.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow transition-colors disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingUser
                    ? "Save User"
                    : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
