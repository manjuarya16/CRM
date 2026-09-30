import { useMemo } from "react";
import { useAuthStore } from "@/store";
import useRoleStore from "@/store/roleStore";
import useAccessManagementStore from "@/store/accessManagementStore";
import { usePermission } from "./usePermission";

const useModuleAccess = (moduleKey: string) => {
  const { user } = useAuthStore();
  const { roles } = useRoleStore();
  const { userAccess } = useAccessManagementStore();
  const { isAllAccess, userPermissions } = usePermission();

  const isAdmin = useMemo(() => {
    if (isAllAccess) return true;
    if (!user?.role_id) return false;
    if (Number(user.role_id) === 1) return true;
    if (roles.length === 0) return false;
    const userRole = roles.find((r) => Number(r.id) === Number(user.role_id));
    return userRole?.name?.toLowerCase().includes("admin") ?? false;
  }, [isAllAccess, roles, user?.role_id]);

  const moduleAccess = useMemo(() => {
    if (isAdmin)
      return { can_view: true, can_add: true, can_update: true, can_delete: true };

    const normalizeKey = (k: string) => {
      const lower = k.toLowerCase().trim();
      return lower.endsWith("s") ? lower.slice(0, -1) : lower;
    };

    const targetNorm = normalizeKey(moduleKey);

    // 1. Check user.permissions array first (e.g. "organizations.view", "dashboard.view", "settings.users.view")
    const perms: string[] = Array.isArray(user?.permissions) && user.permissions.length > 0
      ? user.permissions
      : userPermissions;

    if (perms && perms.length > 0) {
      const hasView = perms.some((p) => {
        const parts = p.toLowerCase().split(".");
        const mod = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const act = parts[parts.length - 1];
        return (normalizeKey(mod) === targetNorm || p.toLowerCase().includes(targetNorm)) && (act === "view" || act === "read" || parts.length === 1);
      });

      const hasAdd = perms.some((p) => {
        const parts = p.toLowerCase().split(".");
        const mod = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const act = parts[parts.length - 1];
        return (normalizeKey(mod) === targetNorm || p.toLowerCase().includes(targetNorm)) && (act === "create" || act === "add");
      });

      const hasUpdate = perms.some((p) => {
        const parts = p.toLowerCase().split(".");
        const mod = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const act = parts[parts.length - 1];
        return (normalizeKey(mod) === targetNorm || p.toLowerCase().includes(targetNorm)) && (act === "edit" || act === "update");
      });

      const hasDelete = perms.some((p) => {
        const parts = p.toLowerCase().split(".");
        const mod = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        const act = parts[parts.length - 1];
        return (normalizeKey(mod) === targetNorm || p.toLowerCase().includes(targetNorm)) && (act === "delete" || act === "remove");
      });

      if (hasView || hasAdd || hasUpdate || hasDelete) {
        return {
          can_view: hasView,
          can_add: hasAdd,
          can_update: hasUpdate,
          can_delete: hasDelete,
        };
      }
    }

    // 2. Fallback to access_management table (userAccess)
    const found = userAccess.find((a) => {
      const dbNorm = normalizeKey(a.module_key);
      return dbNorm === targetNorm || a.module_key === moduleKey;
    });

    return {
      can_view: found?.can_view ?? false,
      can_add: found?.can_add ?? false,
      can_update: found?.can_update ?? false,
      can_delete: found?.can_delete ?? false,
    };
  }, [isAdmin, user, userPermissions, userAccess, moduleKey]);

  return moduleAccess;
};

export const ACTIONS = [
  { key: "can_view", label: "View" },
  { key: "can_add", label: "Add" },
  { key: "can_update", label: "Update" },
  { key: "can_delete", label: "Delete" },
] as const;

export default useModuleAccess;
