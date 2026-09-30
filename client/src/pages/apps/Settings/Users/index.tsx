import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IRole, IGroup, IUserData } from "@/interface";
import { userFormSchema } from "@/schemas";
import { ZodError } from "zod";

import { useAuthorization } from "@/hooks/useAuthorization";
import { usePermission } from "@/hooks/usePermission";

const UsersPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.users.create");
  const canEdit = hasPermission("settings.users.edit");
  const canDelete = hasPermission("settings.users.delete");
  const canView = hasPermission("settings.users.view");
  const { user: currentUser } = useAuthorization();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

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

  // Modal State for View User Details
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [viewingUser, setViewingUser] = useState<IUserData | null>(null);

  const openViewModal = (user: IUserData) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
  };
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
    fetchRolesAndGroups();
  }, []);

  useEffect(() => {
    if (location.pathname.includes("/create")) {
      openCreateModal();
    } else if (id && users.length > 0) {
      const u = users.find((x) => String(x.id) === String(id));
      if (u) {
        if (location.pathname.includes("/view")) {
          openViewModal(u);
        } else {
          openEditModal(u);
        }
      }
    }
  }, [location.pathname, id, users]);

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
    setErrors({});
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
      group_ids: user.group_ids || (user.groups || []).map((g: any) => g.id),
      view_permission: user.view_permission || "global",
    });
    setErrors({});
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      if (!editingUser && !formData.password) {
        setErrors({ password: "Password is required for new users" });
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
        await API.put(`/users/${editingUser.id}`, payload);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "User updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
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

  const matchedUser = useMemo(() => {
    if (!currentUser) return null;
    return (users || []).find(
      (u) => Number(u.id) === Number(currentUser.id) || u.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
  }, [currentUser, users]);

  const currentUserRoleId = useMemo(() => {
    if (currentUser?.role_id != null && Number(currentUser.role_id) > 0) {
      return Number(currentUser.role_id);
    }
    if (matchedUser?.role_id != null && Number(matchedUser.role_id) > 0) {
      return Number(matchedUser.role_id);
    }
    const roleStr = String((currentUser as any)?.role || (currentUser as any)?.role_name || (matchedUser as any)?.role_name || (matchedUser as any)?.role || "").toLowerCase();
    if (roleStr) {
      const found = (roles || []).find((r) => String(r.name).toLowerCase() === roleStr);
      if (found) return Number(found.id);
    }
    return null;
  }, [currentUser, matchedUser, roles]);

  const currentUserGroups = useMemo(() => {
    if (!currentUser && !matchedUser) return [] as number[];
    const gList = (matchedUser as any)?.group_ids || (matchedUser as any)?.groups || (currentUser as any)?.group_ids || (currentUser as any)?.groups || [];
    return (gList as any[]).map((g: any) => Number(g.id || g)).filter((id: number) => id > 0);
  }, [currentUser, matchedUser]);

  const currentUserViewPermission = useMemo(() => {
    const perm = (matchedUser as any)?.view_permission || (currentUser as any)?.view_permission || "global";
    return String(perm).toLowerCase();
  }, [currentUser, matchedUser]);

  const isAdministrator = useMemo(() => {
    const roleName = String(
      (currentUser as any)?.role || (currentUser as any)?.role_name || (matchedUser as any)?.role_name || (matchedUser as any)?.role || ""
    ).toLowerCase();
    if (roleName === "administrator") return true;
    if (currentUserRoleId === 1) return true;
    if (currentUserRoleId) {
      const found = (roles || []).find((r) => Number(r.id) === Number(currentUserRoleId));
      if (found && String(found.name).toLowerCase() === "administrator") {
        return true;
      }
    }
    return false;
  }, [currentUser, matchedUser, currentUserRoleId, roles]);

  const displayGroups = useMemo(() => {
    if (isAdministrator || !currentUserGroups || currentUserGroups.length === 0) {
      return groups;
    }
    const userGroupSet = new Set(currentUserGroups);
    return groups.filter((g) => userGroupSet.has(Number(g.id)));
  }, [groups, isAdministrator, currentUserGroups]);

  const getEffectiveParentId = useCallback((r: IRole, flatRoles: IRole[]): number | null => {
    const idNum = Number(r.id);
    const name = String(r.name || "").toLowerCase();

    if (idNum === 1 || name === "administrator") return null;

    if (r.parent_role_id != null && String(r.parent_role_id).trim() !== "" && Number(r.parent_role_id) > 0) {
      const explicitParent = Number(r.parent_role_id);
      if (explicitParent !== idNum) return explicitParent;
    }

    const adminRole = flatRoles.find(
      (x) => Number(x.id) === 1 || String(x.name).toLowerCase() === "administrator"
    );
    const adminId = adminRole ? Number(adminRole.id) : 1;
    if (idNum === adminId) return null;

    const managerRole = flatRoles.find((x) => String(x.name).toLowerCase().includes("manager"));
    const managerId = managerRole ? Number(managerRole.id) : null;

    if (name.includes("manager")) {
      return adminId;
    }
    if (name.includes("user") || name.includes("test") || name.includes("staff") || name.includes("agent") || name.includes("employee")) {
      return managerId && managerId !== idNum ? managerId : adminId;
    }

    return adminId;
  }, []);

  const childrenMap = useMemo(() => {
    const m: Record<number, number[]> = {};
    (roles || []).forEach((r) => {
      const rid = Number(r.id);
      const rName = String(r.name || "").toLowerCase();
      if (rName === "administrator" || rid === 1) return;

      const pid = getEffectiveParentId(r, roles);
      if (pid && pid > 0 && pid !== rid) {
        if (!m[pid]) m[pid] = [];
        if (!m[pid].includes(rid)) m[pid].push(rid);
      }

      // Ensure Manager roles treat all non-administrator user/staff/admin roles as children
      if (rName.includes("manager")) {
        (roles || []).forEach((sub) => {
          const subId = Number(sub.id);
          const subName = String(sub.name || "").toLowerCase();
          if (subId !== rid && subId !== 1 && subName !== "administrator") {
            if (!m[rid]) m[rid] = [];
            if (!m[rid].includes(subId)) m[rid].push(subId);
          }
        });
      }
    });
    return m;
  }, [roles, getEffectiveParentId]);

  const collectDescendants = useCallback((startId?: number | null) => {
    if (startId == null || startId === undefined) return [] as number[];
    const numericStart = Number(startId);
    if (!numericStart) return [] as number[];
    const out: number[] = [];
    const stack = [numericStart];
    const visited = new Set<number>();

    while (stack.length) {
      const cur = stack.pop();
      if (cur === undefined || visited.has(cur)) continue;
      visited.add(cur);
      out.push(cur);
      const kids = childrenMap[cur];
      if (kids && kids.length) stack.push(...kids);
    }
    return out;
  }, [childrenMap]);


  const allowedRoleIds = useMemo(() => {
    if (isAdministrator) {
      return (roles || []).map((r) => Number(r.id));
    }

    const nonAdminRoleIds = (roles || [])
      .filter((r) => Number(r.id) !== 1 && String(r.name).toLowerCase() !== "administrator")
      .map((r) => Number(r.id));

    if (currentUserRoleId) {
      const descendants = collectDescendants(currentUserRoleId);
      return Array.from(new Set([...descendants, Number(currentUserRoleId), ...nonAdminRoleIds]));
    }
    return nonAdminRoleIds;
  }, [isAdministrator, currentUserRoleId, roles, collectDescendants]);

  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const allowedUsers = useMemo(() => {
    if (!currentUser && (!users || !users.length)) return [] as IUserData[];

    const currentUserId = currentUser?.id != null
      ? Number(currentUser.id)
      : (matchedUser?.id != null ? Number(matchedUser.id) : null);

    const normPermission = String(currentUserViewPermission || "global").toLowerCase();

    const isRootAdmin = (u: any) => {
      const rid = u.role_id != null ? Number(u.role_id) : null;
      const rname = String(u.role_name || u.role || "").toLowerCase();
      return rid === 1 || rname === "administrator";
    };

    // 1. Administrator -> see all users
    if (isAdministrator) {
      return users || [];
    }

    // Filter out Administrator role users for all non-administrators (like Komal)
    const list = (users || []).filter((u) => !isRootAdmin(u));

    // 2. Individual view permission -> see only self
    if (normPermission === "individual") {
      return list.filter((u) => Number(u.id) === currentUserId);
    }

    // 3. Global view permission -> see all non-administrator users
    if (normPermission === "global") {
      return list;
    }

    const allowedSet = new Set(allowedRoleIds.map(Number));

    // 4. Group / Subordinates / Hierarchical / Default view permission
    const groupSet = new Set(currentUserGroups);
    return list.filter((u) => {
      if (currentUserId && Number(u.id) === currentUserId) return true;
      // Role hierarchy match
      if (u.role_id == null || allowedSet.has(Number(u.role_id))) return true;
      // Group match
      const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((g: any) => g.id || g)).map(Number);
      return uGroups.some((gid: number) => groupSet.has(gid));
    });
  }, [users, currentUser, matchedUser, isAdministrator, currentUserRoleId, allowedRoleIds, currentUserGroups, currentUserViewPermission]);


  const buildRoleTree = (flatRoles: IRole[]) => {
    const byId: Record<number, any> = {};
    flatRoles.forEach((r) => {
      const idNum = Number(r.id);
      byId[idNum] = { ...r, id: idNum, children: [] };
    });
    const roots: any[] = [];
    flatRoles.forEach((r) => {
      const idNum = Number(r.id);
      const pid = getEffectiveParentId(r, flatRoles);
      if (pid && pid > 0 && byId[pid] && pid !== idNum) {
        byId[pid].children.push(byId[idNum]);
      } else {
        roots.push(byId[idNum]);
      }
    });
    return roots;
  };

  const flattenWithDepth = (nodes: any[], depth = 0, out: any[] = []) => {
    for (const n of nodes) {
      out.push({ ...n, __depth: depth });
      if (Array.isArray(n.children) && n.children.length > 0) {
        flattenWithDepth(n.children, depth + 1, out);
      }
    }
    return out;
  };

  const flattenedRoles = useMemo(() => {
    const active = (roles || []).filter((r) => (r as any).status !== false);
    const tree = buildRoleTree(active);
    return flattenWithDepth(tree);
  }, [roles]);

  // Filtering & Pagination
  const filteredUsers = useMemo(() => {
    const list = allowedUsers.filter((u) => {
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

      // Group filter
      if (selectedGroup !== "all") {
        const uGroups = (u.group_ids || (u.groups || []).map((g: any) => g.id || g)).map(Number);
        if (!uGroups.includes(Number(selectedGroup))) return false;
      }

      return true;
    });

    const roleOrderMap = new Map<number, number>();
    flattenedRoles.forEach((r, idx) => roleOrderMap.set(r.id, idx));

    return [...list].sort((a, b) => {
      const orderA = a.role_id != null ? (roleOrderMap.get(Number(a.role_id)) ?? 999) : 999;
      const orderB = b.role_id != null ? (roleOrderMap.get(Number(b.role_id)) ?? 999) : 999;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [allowedUsers, search, selectedRole, selectedStatus, selectedGroup, flattenedRoles]);

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
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b3] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-lg"></i>
            Create User
          </button>
        )}
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
              {flattenedRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {"\u00A0\u00A0".repeat(r.__depth)}{r.__depth > 0 ? "└─ " : ""}{r.name}
                </option>
              ))}
            </select>

            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setPage(1);
              }}
              className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-[#0088cc]"
            >
              <option value="all">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
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
                      <td className="p-4 font-bold text-[#0088cc]">
                        <Link
                          to={`/settings/users/view/${user.id}`}
                          className="hover:underline text-left cursor-pointer font-bold"
                        >
                          {user.name}
                        </Link>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {canView && (
                            <Link
                              to={`/settings/users/view/${user.id}`}
                              className="p-1.5 rounded-lg text-[#0088cc] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="View User Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </Link>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                              title="Edit User"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                              title="Delete User"
                            >
                              <i className="mgc_delete_2_line text-base"></i>
                            </button>
                          )}
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

            <form noValidate onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      errors.email
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>
                  )}
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
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      errors.password
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirm_password: e.target.value,
                      })
                    }
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      errors.confirm_password
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  />
                  {errors.confirm_password && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirm_password}</p>
                  )}
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
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      errors.role_id
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  >
                    {flattenedRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {"\u00A0\u00A0".repeat(r.__depth)}{r.__depth > 0 ? "└─ " : ""}{r.name}
                      </option>
                    ))}
                  </select>
                  {errors.role_id && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.role_id}</p>
                  )}
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
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      errors.view_permission
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                    }`}
                  >
                    <option value="global">Global (Access all data)</option>
                    <option value="group">Group (Access group data)</option>
                    <option value="individual">Individual (Only own data)</option>
                  </select>
                  {errors.view_permission && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.view_permission}</p>
                  )}
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

      {/* View User Modal */}
      {isViewModalOpen && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden">
            {/* Modal Header Banner */}
            <div className="bg-gradient-to-r from-[#0088cc] to-[#006699] p-6 text-white relative">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 font-bold text-2xl flex items-center justify-center text-white shrink-0 shadow-inner">
                  {viewingUser.name ? viewingUser.name.substring(0, 2).toUpperCase() : "US"}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">{viewingUser.name}</h3>
                  <p className="text-xs text-blue-100 flex items-center gap-1.5 truncate">
                    <i className="mgc_mail_line text-sm"></i>
                    {viewingUser.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body Details */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">User ID</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">#{viewingUser.id}</span>
                </div>

                <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">Account Status</span>
                  {viewingUser.status ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inactive
                    </span>
                  )}
                </div>

                <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">Role</span>
                  <span className="font-bold text-[#0088cc] text-xs block">{viewingUser.role_name || "User"}</span>
                </div>

                <div className="space-y-1 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-400 font-semibold block uppercase text-[10px]">View Permission</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200 capitalize text-xs block">
                    {viewingUser.view_permission || "Global"}
                  </span>
                </div>
              </div>

              {/* Groups */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Assigned Groups</span>
                <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[44px] items-center">
                  {viewingUser.groups && viewingUser.groups.length > 0 ? (
                    viewingUser.groups.map((g) => (
                      <span key={g.id} className="px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800">
                        {g.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No groups assigned.</span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex justify-between text-gray-500">
                  <span>Created Date:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString() : "-"}
                  </span>
                </div>
                {viewingUser.updated_at && (
                  <div className="flex justify-between text-gray-500">
                    <span>Last Updated:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {new Date(viewingUser.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(viewingUser);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <i className="mgc_edit_line text-sm"></i> Edit User
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
