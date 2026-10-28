import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { useUserStore, useRoleStore, useGroupStore } from "@/store";
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
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");

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

  const getInitials = (name?: string, fallback = "US") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

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
      const res: any = await useUserStore.getState().fetchUsers(1, 200, true);
      const userList = res?.rows || res || [];
      setUsers(userList);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolesAndGroups = async () => {
    try {
      const [rolesList, groupsList] = await Promise.all([
        useRoleStore.getState().fetchRoles(true),
        useGroupStore.getState().fetchGroups(),
      ]);
      setRoles(rolesList || []);
      setGroups(groupsList || []);
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

      const existingEmail = editingUser?.email || formData.email || "";
      const dataToValidate = {
        ...formData,
        email: existingEmail || "user@crm.com",
      };

      const validated = userFormSchema.parse(dataToValidate);
      setSaving(true);

      const payload: any = {
        name: validated.name,
        status: validated.status,
        role_id: validated.role_id,
        group_ids: validated.group_ids,
        view_permission: validated.view_permission,
        email: editingUser?.email || formData.email || undefined,
      };

      if (validated.password) {
        payload.password = validated.password;
      }

      if (editingUser?.id) {
        await useUserStore.getState().updateUser(Number(editingUser.id), payload);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "User updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await useUserStore.getState().addUser(payload);
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
          if (field && (!editingUser || field !== "email")) {
            fieldErrors[String(field)] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
      const rawMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save user";
      if (!editingUser && (rawMsg.toLowerCase().includes("users_email_key") || rawMsg.toLowerCase().includes("email address already exists"))) {
        const cleanMsg = "A user with this email address already exists. Please use a different email.";
        setErrors({ email: cleanMsg });
        Swal.fire("Email Already Exists", cleanMsg, "error");
        return;
      }
      Swal.fire(
        "Error",
        rawMsg,
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
          await useUserStore.getState().deleteUser(Number(user.id));
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete ${selectedIds.length} selected user(s)? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete them!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useUserStore.getState().deleteUser(Number(id))));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Selected users deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchUsers();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete users", "error");
      }
    }
  };

  const handleExport = () => {
    if (filteredUsers.length === 0) {
      Swal.fire("Export", "No users to export", "info");
      return;
    }

    const headers = ["ID", "Name", "Email", "Status", "Role", "Groups", "View Permission", "Created At"];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      u.status ? "Active" : "Inactive",
      `"${(u.role_name || "").replace(/"/g, '""')}"`,
      `"${(u.groups || []).map((g: any) => g.name || g).join("; ").replace(/"/g, '""')}"`,
      u.view_permission || "global",
      u.created_at ? new Date(u.created_at).toLocaleDateString() : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredUsers.slice(start, start + perPage);
  }, [filteredUsers, page, perPage]);

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllSelected = paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id));

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

  // Responsive Full-Detail User Card (Person-like card design)
  const renderUserCard = (user: IUserData, idx: number) => {
    const isSelected = selectedIds.includes(user.id);
    const avatarColor = AVATAR_COLORS[(user.id || idx) % AVATAR_COLORS.length];
    const permInfo = getViewPermissionLabel(user.view_permission || "");
    const userGroups = user.groups || [];

    return (
      <div
        key={user.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar with status indicator + Name + Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(user.id)}
              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
            />
            <div
              onClick={() => canView && navigate(`/settings/users/view/${user.id}`)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <div className="relative shrink-0 mt-0.5">
                <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${avatarColor}`}>
                  {getInitials(user.name, "US")}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    user.status ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  title={user.status ? "Active" : "Inactive"}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {user.email || "No email"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #USR-{user.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Role, Groups, Scope & Details */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5 font-medium">
              <i className="mgc_shield_line text-sm text-[#0088cc]"></i>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{user.role_name || "User"}</span>
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${permInfo.color}`}
            >
              {permInfo.label} Scope
            </span>
          </div>

          {/* Groups list */}
          <div className="flex items-start gap-1.5 pt-0.5">
            <i className="mgc_group_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
              {userGroups.length > 0 ? (
                userGroups.map((g: any) => (
                  <span
                    key={g.id || g}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 font-medium"
                  >
                    {g.name || g}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-xs italic">No groups assigned</span>
              )}
            </div>
          </div>

          {/* Creation date */}
          <div className="flex items-center justify-between text-gray-400 text-[11px] pt-1 border-t border-gray-50 dark:border-gray-800">
            <span className="flex items-center gap-1">
              <i className="mgc_calendar_line text-xs"></i>
              <span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</span>
            </span>
            <span className="font-mono">
              ID: {user.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Status Pill + Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          {user.status ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Active Account</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Inactive Account</span>
            </span>
          )}

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <Link
                to={`/settings/users/view/${user.id}`}
                className="p-1 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition inline-flex items-center"
                title="View User Details"
              >
                <i className="mgc_eye_line text-sm"></i>
              </Link>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => openEditModal(user)}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit User"
              >
                <i className="mgc_edit_line text-sm"></i>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(user)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete User"
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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Users</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Users
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage user accounts, roles, team memberships, and access scopes
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
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Filters and Controls Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                placeholder="Search by ID, Name or Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-48 sm:w-60 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="pl-3 pr-8 min-w-[125px] py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
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
              className="pl-3 pr-8 min-w-[125px] py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
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
              className="pl-3 pr-8 min-w-[115px] py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
                className="per-page-select pl-2.5 pr-8 min-w-[5.25rem] py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Quick pagination arrows in toolbar */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <i className="mgc_left_line text-xs"></i>
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {page}/{totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Page"
              >
                <i className="mgc_right_line text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <div>
            Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{paginatedUsers.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> users
            {total > 0 && ` (${startIndex} - ${endIndex} of ${total})`}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-[#0088cc] font-medium">
              {selectedIds.length} user(s) selected
            </div>
          )}
        </div>

        {/* 📦 View Modes Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading users...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <i className="mgc_user_star_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No users found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedUsers.map((user, idx) => renderUserCard(user, idx))}
          </div>
        ) : (
          /* Table View with Mobile Card Fallback */
          <div>
            {/* Mobile Fallback: Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {paginatedUsers.map((user, idx) => renderUserCard(user, idx))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                    <th className="py-3.5 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 w-16">ID</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="py-3.5 px-4 font-semibold text-center text-gray-600 dark:text-gray-300">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Role</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Groups</th>
                    <th className="py-3.5 px-4 font-semibold text-center text-gray-600 dark:text-gray-300">View Permission</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                    <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginatedUsers.map((user) => {
                    const permInfo = getViewPermissionLabel(user.view_permission || "");
                    const isSelected = selectedIds.includes(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(user.id)}
                            className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                          {user.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                          <Link
                            to={`/settings/users/view/${user.id}`}
                            className="text-[#0088cc] hover:underline font-semibold"
                          >
                            {user.name}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                          {user.email}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {user.status ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {user.role_name || "User"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${permInfo.color}`}
                          >
                            {permInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-xs">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                          {canView && (
                            <Link
                              to={`/settings/users/view/${user.id}`}
                              className="inline-flex items-center text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 p-1.5 rounded-lg transition-colors"
                              title="View User Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </Link>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="inline-flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <i className="mgc_delete_2_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {startIndex} to {endIndex} of {total} entries
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
        )}
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
                    disabled={Boolean(editingUser)}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                      editingUser ? "opacity-75 bg-gray-200 dark:bg-gray-800 cursor-not-allowed text-gray-500" : ""
                    } ${
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
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={editingUser ? "Enter new password (leave blank to keep)" : "Enter password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className={`w-full px-3.5 pr-10 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                        errors.password
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPassword((prev) => !prev);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer select-none z-10"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`mgc_${showPassword ? "eye_line" : "eye_close_line"} text-base`}></i>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={editingUser ? "Confirm new password" : "Confirm password"}
                      value={formData.confirm_password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirm_password: e.target.value,
                        })
                      }
                      className={`w-full px-3.5 pr-10 py-2 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg focus:outline-none ${
                        errors.confirm_password
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 dark:border-gray-600 focus:border-[#0088cc]"
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowConfirmPassword((prev) => !prev);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer select-none z-10"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`mgc_${showConfirmPassword ? "eye_line" : "eye_close_line"} text-base`}></i>
                    </button>
                  </div>
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
