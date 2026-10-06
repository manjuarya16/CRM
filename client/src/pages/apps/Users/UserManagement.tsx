import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUserStore from "@/store/userStore";
import useBranchStore from "@/store/branchStore";
import useRoleStore from "@/store/roleStore";
import { useDepartmentStore, useGroupStore } from "@/store";
import { useAuthorization } from "@/hooks/useAuthorization";
import { PageBreadcrumb } from "@/components";
import { IGroup } from "@/interface";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import useModuleAccess from "@/hooks/useModuleAccess";

const ITEMS_PER_PAGE = 20;

const paginateRows = <T,>(rows: T[], page: number) => {
  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  return {
    totalPages,
    startIndex,
    rows: rows.slice(startIndex, startIndex + ITEMS_PER_PAGE),
  };
};

const PaginationControls = ({
  currentPage,
  totalPages,
  startIndex,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  totalItems: number;
  onPageChange: (p: number) => void;
}) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = (current: number, total: number) => {
    const delta = 1,
      range = [],
      rangeWithDots: (number | string)[] = [];
    let l: number | undefined;
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      )
        range.push(i);
    }
    for (const i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l > 2) rangeWithDots.push("...");
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };
  return (
    <div className="flex justify-end items-center p-4">
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn-sm"
        >
          Previous
        </button>
        {getPageNumbers(currentPage, totalPages).map((page, idx) =>
          page === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 py-1 text-gray-500 self-center"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`btn btn-sm ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthorization();
  const { can_add, can_update, can_delete } = useModuleAccess("users");
  const { users, loading, deleteUser, fetchUsers } = useUserStore();
  const { branches } = useBranchStore();
  const { roles, fetchRoles } = useRoleStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const activeRoles = React.useMemo(
    () => (roles || []).filter((r) => r.status !== false),
    [roles],
  );
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [pendingRole, setPendingRole] = React.useState<string>("all");
  const [pendingGroup, setPendingGroup] = React.useState<string>("all");
  const [pendingSearchUser, setPendingSearchUser] = React.useState<string>("");
  const [pendingDateFrom, setPendingDateFrom] = React.useState<string>("");
  const [pendingDateTo, setPendingDateTo] = React.useState<string>("");
  const [activeRole, setActiveRole] = React.useState<string>("all");
  const [activeGroup, setActiveGroup] = React.useState<string>("all");
  const [activeSearchUser, setActiveSearchUser] = React.useState<string>("");
  const [activeDateFrom, setActiveDateFrom] = React.useState<string>("");
  const [activeDateTo, setActiveDateTo] = React.useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const getEffectiveParentId = (r: any, flatRoles: any[]): number | null => {
    const idNum = Number(r.id);
    const name = String(r.name || "").toLowerCase();

    // Only root Administrator (ID 1 or exact name 'administrator') has null parent
    if (idNum === 1 || name === "administrator") return null;

    // 1. Explicit parent_role_id from database takes top priority
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
  };

  const childrenMap = useMemo(() => {
    const m: Record<number, number[]> = {};
    (activeRoles || []).forEach((r) => {
      const rid = Number(r.id);
      const rName = String(r.name || "").toLowerCase();
      if (rName === "administrator" || rid === 1) return;

      const pid = getEffectiveParentId(r, activeRoles);
      if (pid && pid > 0 && pid !== rid) {
        if (!m[pid]) m[pid] = [];
        if (!m[pid].includes(rid)) m[pid].push(rid);
      }

      // Ensure Manager roles treat all non-administrator user/staff roles as children
      if (rName.includes("manager")) {
        (activeRoles || []).forEach((sub) => {
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
  }, [roles, activeRoles]);

  const collectDescendants = (startId?: number | null) => {
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
  };

  const volunteerRoleIds = useMemo(() => {
    return new Set(
      (roles || [])
        .filter((r) => {
          const name = String(r.name || "").toLowerCase();
          return (
            name.includes("volunteer") &&
            !name.includes("coordinator") &&
            !name.includes("cordinator")
          );
        })
        .map((r) => Number(r.id)),
    );
  }, [roles]);

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

  const allowedRoleIds = useMemo(() => {
    if (isAdministrator) {
      return (roles || []).map((r) => Number(r.id));
    }
    const matchedRole = (roles || []).find((r) => Number(r.id) === Number(currentUserRoleId));
    const userRoleStr = String(
      (currentUser as any)?.role || (currentUser as any)?.role_name || (matchedUser as any)?.role_name || (matchedUser as any)?.role || matchedRole?.name || ""
    ).toLowerCase();

    // Any non-administrator role (like Manager) gets access to all non-administrator subordinate roles (Manager, Admin, User, test, etc.)
    const nonAdminRoleIds = (roles || [])
      .filter((r) => Number(r.id) !== 1 && String(r.name).toLowerCase() !== "administrator")
      .map((r) => Number(r.id));

    if (currentUserRoleId) {
      const descendants = collectDescendants(currentUserRoleId);
      return Array.from(new Set([...descendants, Number(currentUserRoleId), ...nonAdminRoleIds]));
    }
    return nonAdminRoleIds;
  }, [isAdministrator, currentUserRoleId, currentUser, matchedUser, roles, childrenMap]);

  const allowedUsers = useMemo(() => {
    if (!currentUser && (!users || !users.length)) return [] as any[];

    const currentUserId = currentUser?.id != null
      ? Number(currentUser.id)
      : (matchedUser?.id != null ? Number(matchedUser.id) : null);

    const normPermission = String(currentUserViewPermission || "global").toLowerCase();

    const isRootAdmin = (u: any) => {
      const rid = u.role_id != null ? Number(u.role_id) : null;
      const rname = String(u.role_name || u.role || "").toLowerCase();
      return rid === 1 || rname === "administrator";
    };

    // 1. Administrator -> see all non-volunteer users
    if (isAdministrator) {
      return (users || []).filter(
        (u) => u.role_id == null || !volunteerRoleIds.has(Number(u.role_id)),
      );
    }

    // Filter out Administrator role users & volunteer users for all non-administrators
    const list = (users || []).filter(
      (u) => !isRootAdmin(u) && (u.role_id == null || !volunteerRoleIds.has(Number(u.role_id))),
    );

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
      if (volunteerRoleIds.has(Number(u.role_id))) return false;
      // Role hierarchy match (subordinates)
      if (u.role_id == null || allowedSet.has(Number(u.role_id))) return true;
      // Group match
      const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((g: any) => g.id || g)).map(Number);
      return uGroups.some((gid: number) => groupSet.has(gid));
    });
  }, [users, currentUser, matchedUser, isAdministrator, currentUserRoleId, allowedRoleIds, volunteerRoleIds, currentUserGroups, currentUserViewPermission]);

  const displayGroups = useMemo(() => {
    if (isAdministrator || currentUserGroups.length === 0) {
      return groups;
    }
    const userGroupSet = new Set(currentUserGroups);
    return groups.filter((g) => userGroupSet.has(Number(g.id)));
  }, [groups, isAdministrator, currentUserGroups]);

  const stats = useMemo(
    () => ({
      total: allowedUsers.length,
      active: allowedUsers.filter(
        (u) => u && (u.status === true || Number(u.status) === 1),
      ).length,
      inactive: allowedUsers.filter(
        (u) => u && (u.status === false || Number(u.status) === 0),
      ).length,
    }),
    [allowedUsers],
  );

  useEffect(() => {
    const force = useUserStore.getState().users.length === 0;
    Promise.all([
      fetchRoles(),
      fetchDepartments(),
      fetchUsers(1, 99999, force),
      useGroupStore.getState().fetchGroups(),
    ]).then(([, , payload, groupList]) => {
      if ((payload as any)?.rows || Array.isArray(payload)) setCurrentPage(1);
      if (groupList) {
        setGroups(groupList);
      }
    }).catch(() => { });
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const deleted = await deleteUser(id);
      if (deleted) handleSuccessResponse("User", "deleted", null);
    } catch (error) {
      handleErrorResponse("User", "delete", error);
    }
  };

  const buildRoleTree = (flatRoles: any[]) => {
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
      if (Array.isArray(n.children) && n.children.length)
        flattenWithDepth(n.children, depth + 1, out);
    }
    return out;
  };

  const allowedRoleIdSet = useMemo(
    () => new Set(allowedRoleIds.map(String)),
    [allowedRoleIds],
  );

  const flattenedRoles = React.useMemo(() => {
    if (!currentUser) return [];
    let list = activeRoles || [];
    // Hide all volunteer roles from the role selector.
    list = list.filter((r) => !volunteerRoleIds.has(r.id));
    if (!isAdministrator) {
      list = list.filter((r) => allowedRoleIdSet.has(String(r.id)));
    }
    return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [currentUser, isAdministrator, allowedRoleIdSet, volunteerRoleIds, activeRoles]);

  React.useEffect(() => {
    if (pendingRole === "all" || pendingRole === "__unassigned") return;
    if (!flattenedRoles.some((r) => String(r.id) === pendingRole))
      setPendingRole("all");
  }, [flattenedRoles, pendingRole]);

  const filteredUsers = useMemo(() => {
    let list = allowedUsers;
    if (activeRole === "__unassigned") list = list.filter((u) => !u.role_id);
    else if (activeRole !== "all")
      list = list.filter((u) => String(u.role_id) === activeRole);
    if (activeGroup !== "all") {
      const gid = Number(activeGroup);
      list = list.filter((u) => {
        const uGroups = ((u as any).group_ids || ((u as any).groups || []).map((g: any) => g.id || g)).map(Number);
        return uGroups.includes(gid);
      });
    }
    if (activeSearchUser.trim()) {
      const q = activeSearchUser.trim().toLowerCase();
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phone && u.phone.toLowerCase().includes(q)),
      );
    }
    if (activeDateFrom) {
      list = list.filter((u) => {
        const cd = u.created_at ? String(u.created_at).slice(0, 10) : null;
        return cd && cd >= activeDateFrom;
      });
    }
    if (activeDateTo) {
      list = list.filter((u) => {
        const cd = u.created_at ? String(u.created_at).slice(0, 10) : null;
        return cd && cd <= activeDateTo;
      });
    }
    // Show only active users (status true)
    list = list.filter(
      (u) => u && (u.status === true || Number(u.status) === 1),
    );

    return [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }, [
    allowedUsers,
    activeRole,
    activeGroup,
    activeSearchUser,
    activeDateFrom,
    activeDateTo,
  ]);

  const handleSearchClick = () => {
    setActiveRole(pendingRole);
    setActiveGroup(pendingGroup);
    setActiveSearchUser(pendingSearchUser);
    setActiveDateFrom(pendingDateFrom);
    setActiveDateTo(pendingDateTo);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setPendingRole("all");
    setPendingGroup("all");
    setPendingSearchUser("");
    setPendingDateFrom("");
    setPendingDateTo("");
    setActiveRole("all");
    setActiveGroup("all");
    setActiveSearchUser("");
    setActiveDateFrom("");
    setActiveDateTo("");
    setCurrentPage(1);

    // Restore the complete list as well as clearing the client-side filters.
    void fetchUsers(1, 99999, true);
  };

  // For now, we paginate on the client-side using filteredUsers. If needed,
  // this can be switched to server-driven filtering by passing filters to
  // `fetchUsers` and storing paged results in the store.
  const pagination = paginateRows(filteredUsers, currentPage);
  const pageUsers = pagination.rows;

  const showUserIdColumn = filteredUsers.some(
    (u) =>
      u &&
      u.user_id !== undefined &&
      u.user_id !== null &&
      String(u.user_id).trim() !== "",
  );

  const roleColors = [
    "blue",
    "green",
    "purple",
    "orange",
    "pink",
    "teal",
    "indigo",
    "rose",
  ];
  const getRoleColor = (roleId?: number) =>
    !roleId ? "gray" : roleColors[roleId % roleColors.length];
  const getInitials = (name: string) =>
    name
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : "?";

  const rolePillClass: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    purple:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    orange:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    indigo:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  };
  const avatarBgClass: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
    teal: "bg-teal-500",
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
    gray: "bg-gray-400",
  };

  return (
    <>
      <PageBreadcrumb
        name="User Management"
        title="User Management"
        breadCrumbItems={["Konrix", "Users"]}
      />

      <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6 mb-6">
        <div className="card border-b-4 border-blue-500 dark:border-blue-400">
          <div className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm dark:text-gray-400 mb-1">
                  Total Users
                </p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {stats.total}
                </h3>
              </div>
              <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                <i className="mgc_user_3_line text-3xl text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-b-4 border-red-500 dark:border-red-400">
          <div className="p-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm dark:text-gray-400 mb-1">
                  Total Roles
                </p>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {flattenedRoles.length}
                </h3>
              </div>
              <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center bg-red-100 dark:bg-red-900/50">
                <i className="mgc_user_3_line text-3xl text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            {can_add && (
              <button
                onClick={() => navigate("/management/users/create")}
                className="btn bg-primary/20 text-sm font-medium text-primary hover:text-white hover:bg-primary flex items-center gap-2 whitespace-nowrap"
              >
                <i className="mgc_add_circle_line"></i> Add User
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-end justify-start gap-3">
            <div className="relative min-w-[180px]">
              <i className="mgc_user_shield_2_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              <select
                value={pendingRole}
                onChange={(e) => {
                  setPendingRole(e.target.value);
                }}
                className="pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger appearance-none cursor-pointer w-full"
              >
                <option value="all">
                  All Roles User ({allowedUsers.length})
                </option>
                {flattenedRoles.map((r) => {
                  const count = allowedUsers.filter(
                    (u) => String(u.role_id) === String(r.id),
                  ).length;
                  return (
                    <option key={r.id} value={String(r.id)}>
                      {r.name} ({count})
                    </option>
                  );
                })}
                {allowedUsers.some((u) => !u.role_id) && (
                  <option value="__unassigned">
                    Unassigned ({allowedUsers.filter((u) => !u.role_id).length})
                  </option>
                )}
              </select>
            </div>
            <div className="relative min-w-[220px]">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              <input
                type="text"
                value={pendingSearchUser}
                onChange={(e) => setPendingSearchUser(e.target.value)}
                placeholder="Search user..."
                className="pl-8 pr-8 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger w-full"
              />
              {pendingSearchUser && (
                <button
                  onClick={() => setPendingSearchUser("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  <i className="mgc_close_line"></i>
                </button>
              )}
            </div>
            
            <div className="flex flex-col min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={pendingDateFrom}
                onChange={(e) => setPendingDateFrom(e.target.value)}
                title="From date"
                placeholder="From date"
                className="py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger w-full"
              />
            </div>
            <div className="flex flex-col min-w-[140px]">
              <label className="text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={pendingDateTo}
                onChange={(e) => setPendingDateTo(e.target.value)}
                title="To date"
                placeholder="To date"
                className="py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger w-full"
              />
            </div>
            <button
              onClick={handleSearchClick}
              className="btn bg-primary/10 text-primary text-sm px-4 py-2 whitespace-nowrap"
              title="Search"
            >
              <i className="mgc_search_line me-2"></i>Search
            </button>
            <button
              onClick={handleResetFilters}
              className="btn bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm px-4 py-2 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Reset Filters"
            >
              <i className="mgc_refresh_line me-2"></i>Reset
            </button>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 ps-5 pe-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-12">
                  #
                </th>
                {showUserIdColumn && (
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    User ID
                  </th>
                )}
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  User
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Phone
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Role
                </th>

                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Created Date
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={showUserIdColumn ? 8 : 7}
                    className="py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <i className="mgc_loading_4_line text-3xl animate-spin"></i>
                      <span className="text-sm">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={showUserIdColumn ? 8 : 7}
                    className="py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <i className="mgc_user_3_line text-4xl"></i>
                      <span className="text-sm">No users found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageUsers.map((user, idx) => {
                  const userRole = roles.find((r) => r.id === user.role_id);
                  const color = getRoleColor(user.role_id);
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3.5 ps-5 pe-3 text-sm font-semibold text-gray-400 dark:text-gray-500">
                        {pagination.startIndex + idx + 1}
                      </td>
                      {showUserIdColumn && (
                        <td className="px-3 py-3.5 text-sm font-mono text-gray-600 dark:text-gray-400">
                          {user.user_id !== undefined &&
                            user.user_id !== null &&
                            String(user.user_id).trim() !== "" ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/management/users/view/${user.id}`)
                              }
                              className="text-left text-sm font-mono text-gray-600 dark:text-gray-400 hover:text-primary hover:underline"
                            >
                              {`USR-${String(user.user_id)}`}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarBgClass[color]}`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {user.phone || "-"}
                      </td>
                      <td className="px-3 py-3.5">
                        {userRole ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${rolePillClass[color]}`}
                          >
                            {userRole.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              navigate(`/management/users/view/${user.id}`)
                            }
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="View"
                          >
                            <i className="mgc_eye_2_line text-base"></i>
                          </button>
                          {can_update &&
                            !volunteerRoleIds.has(user.role_id) && (
                              <button
                                onClick={() =>
                                  navigate(`/management/users/edit/${user.id}`)
                                }
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                title="Edit"
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </button>
                            )}
                          {can_delete && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Delete"
                            >
                              <i className="mgc_delete_line text-base"></i>
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

        <div className="flex items-center justify-between px-6 py-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            Showing {pageUsers.length} rows on this page
            {filteredUsers.length !== pageUsers.length &&
              ` (of ${filteredUsers.length} total)`}
          </div>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          startIndex={pagination.startIndex}
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
};

export default UserManagement;
