/**
 * Combined hook for accessing all management stores
 * Simplifies importing multiple stores in components
 */

import useUserStore from "@/store/userStore";
import useRoleStore from "@/store/roleStore";
import useBranchStore from "@/store/branchStore";

export const useManagementStores = () => {
  const users = useUserStore();
  const roles = useRoleStore();
  const branches = useBranchStore();

  return {
    users,
    roles,
    branches,
  };
};

export default useManagementStores;
