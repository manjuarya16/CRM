import React from "react";
import { useAuthStore } from "@/store";

export const usePermission = () => {
  const { user } = useAuthStore();

  const isAllAccess =
    !user ||
    user.role === "admin" ||
    (user as any).role_name?.toLowerCase() === "admin" ||
    (user as any).permission_type === "all" ||
    (user as any).permission_type === "ALL";

  const userPermissions: string[] = React.useMemo(() => {
    if (!user) return [];
    const perms = (user as any).permissions;
    if (Array.isArray(perms)) {
      return perms;
    }
    if (typeof perms === "object" && perms !== null) {
      // Flatten keys if object format
      return Object.entries(perms).flatMap(([mod, actions]) => {
        if (Array.isArray(actions)) {
          return actions.map((act) => `${mod}.${act}`);
        }
        return [`${mod}`];
      });
    }
    return [];
  }, [user]);

  const hasPermission = React.useCallback(
    (permissionKey: string): boolean => {
      if (isAllAccess) return true;
      return userPermissions.includes(permissionKey);
    },
    [isAllAccess, userPermissions]
  );

  const hasAnyPermission = React.useCallback(
    (permissionKeys: string[]): boolean => {
      if (isAllAccess) return true;
      return permissionKeys.some((k) => userPermissions.includes(k));
    },
    [isAllAccess, userPermissions]
  );

  const hasAllPermissions = React.useCallback(
    (permissionKeys: string[]): boolean => {
      if (isAllAccess) return true;
      return permissionKeys.every((k) => userPermissions.includes(k));
    },
    [isAllAccess, userPermissions]
  );

  return {
    isAllAccess,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    can: hasPermission,
  };
};

interface CanProps {
  permission: string | string[];
  any?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  any = false,
  children,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let allowed = false;
  if (Array.isArray(permission)) {
    allowed = any ? hasAnyPermission(permission) : hasAllPermissions(permission);
  } else {
    allowed = hasPermission(permission);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default usePermission;
