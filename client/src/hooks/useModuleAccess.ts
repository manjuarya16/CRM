import { useMemo } from "react";
import { useAuthStore } from "@/store";
import useRoleStore from "@/store/roleStore";
import useAccessManagementStore from "@/store/accessManagementStore";

const useModuleAccess = (moduleKey: string) => {
  const { user } = useAuthStore();
  const { roles } = useRoleStore();
  const { userAccess } = useAccessManagementStore();

  const isAdmin = useMemo(() => {
    if (!user?.role_id) return false;
    if (Number(user.role_id) === 1) return true;
    // role_id===1 is known instantly; for name-based check wait for roles
    if (roles.length === 0) return false;
    const userRole = roles.find((r) => Number(r.id) === Number(user.role_id));
    return userRole?.name?.toLowerCase().includes("admin") ?? false;
  }, [roles, user?.role_id]);

  const moduleAccess = useMemo(() => {
    // Admin always gets full access
    if (isAdmin)
      return { can_view: true, can_add: true, can_update: true, can_delete: true };

    // Roles not loaded yet — don't block, wait
    if (!user?.role_id || roles.length === 0)
      return { can_view: false, can_add: false, can_update: false, can_delete: false };

    const found = userAccess.find((a) => a.module_key === moduleKey);
    return {
      can_view: found?.can_view ?? false,
      can_add: found?.can_add ?? false,
      can_update: found?.can_update ?? false,
      can_delete: found?.can_delete ?? false,
    };
  }, [isAdmin, userAccess, moduleKey, user?.role_id, roles.length]);

  return moduleAccess;
};

export const ACTIONS = [
  { key: "can_view", label: "View" },
  { key: "can_add", label: "Add" },
  { key: "can_update", label: "Update" },
  { key: "can_delete", label: "Delete" },
] as const;

export default useModuleAccess;
