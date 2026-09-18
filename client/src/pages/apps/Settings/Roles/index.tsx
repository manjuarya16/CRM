import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";

import { IRole } from "@/interface";

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<IRole[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal State for Create / Edit Role
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<IRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permission_type: "all",
  });
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchRoles();
  }, [page, perPage]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await API.get("/role/").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setRoles(list);
      setTotal(list.length);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRoles();
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "", permission_type: "all" });
    setIsModalOpen(true);
  };

  const openEditModal = (role: IRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name || "",
      description: role.description || "",
      permission_type: role.permission_type || "all",
    });
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire("Error", "Role name is required", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        await API.put(`/role/${editingRole.id}`, formData);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Role updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await API.post("/role/", formData);
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
      Swal.fire("Error", err?.response?.data?.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

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

  const startIndex = filteredRoles.length > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = filteredRoles.length > 0 ? Math.min(page * perPage, filteredRoles.length) : 0;
  const isAllSelected = filteredRoles.length > 0 && selectedIds.length === filteredRoles.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs and Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            /{" "}
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Roles</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Roles
          </h1>
        </div>

        <div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-base mr-1.5"></i>
            Create Role
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Toolbar Header (Search, Filter, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-56 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd] transition-colors"
            >
              Filter
            </button>
          </form>

          {/* Right side: Per Page & Pagination controls */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span>
              {startIndex} - {endIndex} of {filteredRoles.length}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Previous Page"
              >
                <i className="mgc_left_line text-base"></i>
              </button>
              <button
                type="button"
                disabled={filteredRoles.length < perPage || page * perPage >= filteredRoles.length}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Next Page"
              >
                <i className="mgc_right_line text-base"></i>
              </button>
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
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Description</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Permission Type</th>
                <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium"
                  >
                    No Records Available.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = selectedIds.includes(role.id);
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
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                        {role.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-100">
                        <button
                          onClick={() => openEditModal(role)}
                          className="hover:text-[#0088cc] transition-colors font-medium text-left"
                        >
                          {role.name}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                        {role.description || "-"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#0088cc] dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                          {role.permission_type || "All"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(role)}
                          className="inline-flex items-center text-gray-500 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(role)}
                          className="inline-flex items-center text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          <i className="mgc_delete_line text-base"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {editingRole ? "Edit Role" : "Create Role"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Role description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Permission Type
                </label>
                <select
                  value={formData.permission_type}
                  onChange={(e) => setFormData({ ...formData, permission_type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                >
                  <option value="all">All Permissions</option>
                  <option value="custom">Custom Permissions</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
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
                  className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Role"}
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
