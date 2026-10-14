import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useGroupStore, useUserStore } from "@/store";
import { IGroup, IUserData } from "@/interface";
import { groupSchema } from "@/schemas";
import { ZodError } from "zod";
import { useAuthorization } from "@/hooks/useAuthorization";
import { usePermission } from "@/hooks/usePermission";

const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-purple-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-teal-600 text-white",
  "bg-rose-500 text-white",
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
];

const getInitials = (name?: string, fallback = "GP") => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const GroupsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.groups.create");
  const canEdit = hasPermission("settings.groups.edit");
  const canDelete = hasPermission("settings.groups.delete");
  const canView = hasPermission("settings.groups.view");
  const { user: currentUser } = useAuthorization();

  const [groups, setGroups] = useState<IGroup[]>([]);
  const [users, setUsers] = useState<IUserData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");

  // Modal State for Create / Edit Group
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<IGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const list = await useGroupStore.getState().fetchGroups();
      setGroups(list || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res: any = await useUserStore.getState().fetchUsers(1, 200);
      const userList = res?.rows || res || [];
      setUsers(userList);
    } catch {
      setUsers([]);
    }
  };

  const matchedUser = useMemo(() => {
    if (!currentUser || !users || !users.length) return null;
    return (users || []).find(
      (u) => Number(u.id) === Number(currentUser.id) || u.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
  }, [currentUser, users]);

  const currentUserGroups = useMemo(() => {
    if (!currentUser && !matchedUser) return [] as number[];
    const gList = (matchedUser as any)?.group_ids || (matchedUser as any)?.groups || (currentUser as any)?.group_ids || (currentUser as any)?.groups || [];
    return (gList as any[]).map((g: any) => Number(g.id || g)).filter((id: number) => id > 0);
  }, [currentUser, matchedUser]);

  const isAdministrator = useMemo(() => {
    const roleName = String(
      (currentUser as any)?.role || (currentUser as any)?.role_name || (matchedUser as any)?.role_name || (matchedUser as any)?.role || ""
    ).toLowerCase();
    if (roleName === "administrator") return true;
    const roleId = (currentUser as any)?.role_id || (matchedUser as any)?.role_id;
    if (Number(roleId) === 1) return true;
    return false;
  }, [currentUser, matchedUser]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData({ name: "", description: "" });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (group: IGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name || "",
      description: group.description || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = groupSchema.parse(formData);
      setSaving(true);
      if (editingGroup?.id) {
        await useGroupStore.getState().saveGroup(validated, editingGroup.id);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Group updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await useGroupStore.getState().saveGroup(validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Group created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      fetchGroups();
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
      Swal.fire(
        "Error",
        err?.response?.data?.message || "Failed to save group",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await useGroupStore.getState().deleteGroup(id);
          setSelectedIds((prev) => prev.filter((item) => item !== id));
          Swal.fire("Deleted!", "Group has been deleted.", "success");
          fetchGroups();
        } catch (err: any) {
          Swal.fire(
            "Error",
            err?.response?.data?.message || "Failed to delete group",
            "error"
          );
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected group(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useGroupStore.getState().deleteGroup(id)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${selectedIds.length} group(s) deleted successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchGroups();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete groups", "error");
      }
    }
  };

  const handleExport = () => {
    if (filteredGroups.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }
    const headers = ["ID", "Name", "Description", "Member Count"];
    const rows = filteredGroups.map((g) => {
      const memberCount = (users || []).filter((u) => {
        const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((x: any) => x.id || x)).map(Number);
        return uGroups.includes(Number(g.id));
      }).length;
      return [
        g.id,
        `"${(g.name || "").replace(/"/g, '""')}"`,
        `"${(g.description || "").replace(/"/g, '""')}"`,
        memberCount,
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `groups_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and pagination
  const filteredGroups = useMemo(() => {
    let list = groups;

    if (!isAdministrator && currentUserGroups && currentUserGroups.length > 0) {
      const userGroupSet = new Set(currentUserGroups);
      list = list.filter((g) => userGroupSet.has(Number(g.id)));
    }

    if (!search.trim()) return list;

    const q = search.toLowerCase();
    return list.filter(
      (g) =>
        String(g.id).includes(q) ||
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, isAdministrator, currentUserGroups, search]);

  const total = filteredGroups.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredGroups.slice(start, start + perPage);
  }, [filteredGroups, page, perPage]);

  const isAllSelected = paginatedGroups.length > 0 && paginatedGroups.every((g) => selectedIds.includes(g.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedGroups.map((g) => g.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;

  // Responsive Full-Detail Group Card (Person-like card design)
  const renderGroupCard = (group: IGroup, idx: number) => {
    const isSelected = selectedIds.includes(group.id);
    const avatarColor = AVATAR_COLORS[(group.id || idx) % AVATAR_COLORS.length];
    const memberCount = (users || []).filter((u) => {
      const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((x: any) => x.id || x)).map(Number);
      return uGroups.includes(Number(group.id));
    }).length;

    return (
      <div
        key={group.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(group.id)}
              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
            />
            <div
              onClick={() => canEdit && openEditModal(group)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(group.name, "GP")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {group.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Organizational Unit
                </p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #GRP-{group.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Description & Details */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
            <i className="mgc_information_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <span className="leading-relaxed line-clamp-2">
              {group.description || <span className="text-gray-400 italic">No description provided</span>}
            </span>
          </div>

          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs pt-0.5">
            <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <i className="mgc_user_3_line text-xs text-gray-400"></i>
              <span>{memberCount} {memberCount === 1 ? "assigned user" : "assigned users"}</span>
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              ID: {group.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Member Pill + Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
            <i className="mgc_group_line text-xs shrink-0"></i>
            <span>{memberCount} Members</span>
          </span>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canEdit && (
              <button
                type="button"
                onClick={() => openEditModal(group)}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Group"
              >
                <i className="mgc_edit_line text-sm"></i>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(group.id)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Group"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Groups</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Groups
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Organize users into teams and functional units for permissions and assignments
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              onClick={handleBulkDelete}
              className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-sm"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-white dark:bg-gray-800 hover:bg-[#e0f2fe] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-sm text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="h-8 px-3 sm:px-3.5 inline-flex items-center justify-center gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors active:scale-98 shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Create Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
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
              placeholder="Search groups..."
              className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-48 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-600">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Cards View"
              >
                <i className="mgc_grid_2_line text-sm"></i>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Table View"
              >
                <i className="mgc_table_line text-sm"></i>
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Next Page"
              >
                <i className="mgc_right_line text-base"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{paginatedGroups.length}</strong> {paginatedGroups.length === 1 ? "group" : "groups"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading groups...</p>
          </div>
        ) : paginatedGroups.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedGroups.map((group, idx) => renderGroupCard(group, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW (With Mobile Cards Fallback) */
          <>
            <div className="block md:hidden p-3 space-y-3">
              {paginatedGroups.map((group, idx) => renderGroupCard(group, idx))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold w-16">ID</th>
                    <th className="py-3 px-4 font-semibold">Group Name</th>
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold text-center">Members</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginatedGroups.map((group, idx) => {
                    const isSelected = selectedIds.includes(group.id);
                    const avatarColor = AVATAR_COLORS[(group.id || idx) % AVATAR_COLORS.length];
                    const memberCount = (users || []).filter((u) => {
                      const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((x: any) => x.id || x)).map(Number);
                      return uGroups.includes(Number(group.id));
                    }).length;

                    return (
                      <tr
                        key={group.id}
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(group.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0088cc] dark:text-[#38bdf8] font-bold">
                          #{group.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(group.name, "GP")}
                            </span>
                            <button
                              type="button"
                              onClick={() => canEdit && openEditModal(group)}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-[#0088cc] dark:hover:text-[#38bdf8] hover:underline text-left"
                            >
                              {group.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate">
                          {group.description || <span className="text-gray-400 italic">No description</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                            {memberCount} members
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(group)}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="Edit Group"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(group.id)}
                              className="text-gray-500 hover:text-red-600 p-1 inline-block transition-colors"
                              title="Delete Group"
                            >
                              <i className="mgc_delete_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <span>
              {startIndex} – {endIndex} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✏️ ADD / EDIT GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#0088cc]/10 text-[#0088cc]">
                  <i className="mgc_group_line text-xl"></i>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {editingGroup ? "Edit Group" : "Create New Group"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  placeholder="e.g. Sales Tier 1"
                  className={`w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 border ${
                    errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
                  } rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 dark:text-gray-200 transition`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this group responsible for?"
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc] dark:text-gray-200 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{editingGroup ? "Save Changes" : "Create Group"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
