import { Role } from "@/interface/roleInterface";

export const getRoleById = (
  roles: Role[],
  roleId?: number | string | null,
): Role | undefined => {
  if (roleId === undefined || roleId === null || roleId === "") return undefined;
  const numericId = Number(roleId);
  if (!Number.isFinite(numericId)) return undefined;
  return roles.find((role) => Number(role.id) === numericId);
};

export const isAdminRole = (role?: Partial<Role> | null): boolean => {
  if (!role?.name) return false;
  return String(role.name).toLowerCase().includes("admin");
};

export const isUserAdmin = (
  userRoleId: number | string | undefined | null,
  roles: Role[],
): boolean => {
  const role = getRoleById(roles, userRoleId);
  return isAdminRole(role);
};
