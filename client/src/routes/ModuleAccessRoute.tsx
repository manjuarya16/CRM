import { Navigate } from "react-router-dom";
import useModuleAccess from "../hooks/useModuleAccess";
import { useAuthStore } from "../store";

/**
 * ModuleAccessRoute checks if the user has module-level access (can_view permission)
 * If the user doesn't have access, it redirects to home page
 */
const ModuleAccessRoute = ({
  component: Component,
  moduleKey,
  ...rest
}: any) => {
  const { user } = useAuthStore();
  const moduleAccess = useModuleAccess(moduleKey);

  // If no user, let PrivateRoute handle it
  if (!user) {
    return <Component {...rest} />;
  }

  // Check if user has view permission for this module
  if (!moduleAccess.can_view) {
    // No access, redirect to home
    return <Navigate to="/" />;
  }

  // Authorized so return component
  return <Component {...rest} />;
};

export default ModuleAccessRoute;
