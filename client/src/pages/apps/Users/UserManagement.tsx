import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUserStore from "@/store/userStore";
import useBranchStore from "@/store/branchStore";
import useRoleStore from "@/store/roleStore";
import { useDepartmentStore } from "@/store";
import { useAuthorization } from "@/hooks/useAuthorization";
import { PageBreadcrumb } from "@/components";
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
  const { roles } = useRoleStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const activeRoles = React.useMemo(
    () => (roles || []).filter((r) => r.status !== false),
    [roles],
  );
  const [pendingRole, setPendingRole] = React.useState<string>("all");
  const [pendingSearchUser, setPendingSearchUser] = React.useState<string>("");
  const [pendingDateFrom, setPendingDateFrom] = React.useState<string>("");
  const [pendingDateTo, setPendingDateTo] = React.useState<string>("");
  const [activeRole, setActiveRole] = React.useState<string>("all");
  const [activeSearchUser, setActiveSearchUser] = React.useState<string>("");
  const [activeDateFrom, setActiveDateFrom] = React.useState<string>("");
  const [activeDateTo, setActiveDateTo] = React.useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const childrenMap = useMemo(() => {
    const m: Record<string, number[]> = {};
    (activeRoles || []).forEach((r) => {
      const pid = r.parent_role_id ? String(r.parent_role_id) : "__root";
      if (!m[pid]) m[pid] = [];
      m[pid].push(r.id);
    });
    return m;
  }, [roles]);

  const collectDescendants = (startId?: number | null) => {
    if (!startId) return [] as number[];
    const out: number[] = [];
    const stack = [startId];
    while (stack.length) {
      const cur = stack.pop();
      if (cur === undefined) continue;
      out.push(cur);
      const kids = childrenMap[String(cur)];
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
        .map((r) => r.id),
    );
  }, [roles]);

  const allowedRoleIds = useMemo(() => {
    if (!currentUser) return [] as number[];
    const currRole = activeRoles.find((r) => r.id === currentUser.role_id);
    if (currRole && String(currRole.name).toLowerCase() === "admin")
      return (roles || []).map((r) => r.id);
    if (!currentUser.role_id) return [] as number[];
    return collectDescendants(currentUser.role_id);
  }, [currentUser, roles, childrenMap]);

  const allowedUsers = useMemo(() => {
    if (!currentUser) return [] as any[];
    const currRole = activeRoles.find((r) => r.id === currentUser.role_id);
    const baseList =
      currRole && String(currRole.name).toLowerCase() === "admin"
        ? users
        : !currentUser.role_id
          ? users.filter((u) => u.id === currentUser.id)
          : (users || []).filter(
            (u) =>
              u.id === currentUser.id ||
              (u.role_id && new Set(allowedRoleIds).has(u.role_id)),
          );
    return baseList.filter(
      (u) => u.role_id == null || !volunteerRoleIds.has(u.role_id),
    );
  }, [users, currentUser, roles, allowedRoleIds, volunteerRoleIds]);

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
      fetchDepartments(),
      fetchUsers(1, 99999, force),
    ]).then(([, payload]) => {
      if ((payload as any)?.rows) setCurrentPage(1);
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
    flatRoles.forEach((r) => (byId[r.id] = { ...r, children: [] }));
    const roots: any[] = [];
    flatRoles.forEach((r) => {
      const parentId = (r as any).parent_role_id;
      if (parentId && byId[parentId]) byId[parentId].children.push(byId[r.id]);
      else roots.push(byId[r.id]);
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
    const currRole = roles.find((r) => r.id === currentUser.role_id);
    let list = activeRoles || [];
    // Hide all volunteer roles from the role selector.
    list = list.filter((r) => !volunteerRoleIds.has(r.id));
    if (!(currRole && String(currRole.name).toLowerCase() === "admin")) {
      list = list.filter((r) => allowedRoleIdSet.has(String(r.id)));
    }
    return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [roles, currentUser, allowedRoleIdSet, volunteerRoleIds]);

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
    return [...list].sort((a, b) => b.id - a.id);
  }, [
    allowedUsers,
    activeRole,
    activeSearchUser,
    activeDateFrom,
    activeDateTo,
  ]);

  const handleSearchClick = () => {
    setActiveRole(pendingRole);
    setActiveSearchUser(pendingSearchUser);
    setActiveDateFrom(pendingDateFrom);
    setActiveDateTo(pendingDateTo);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setPendingRole("all");
    setPendingSearchUser("");
    setPendingDateFrom("");
    setPendingDateTo("");
    setActiveRole("all");
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
