import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { isTokenExpired, getToken } from "@/lib/auth-utils";

/**
 * Hook to check and handle authorization
 * Redirects to login if not authenticated
 */
export const useAuthorization = () => {
  const navigate = useNavigate();
  const { user, token, userLoggedIn } = useAuthStore();

  useEffect(() => {
    // Check authentication on mount
    const authToken = token || getToken();

    if (!authToken || isTokenExpired(authToken) || !userLoggedIn) {
      console.warn("Authorization check failed - redirecting to login");
      navigate("/auth/login");
    }
  }, [token, user, userLoggedIn, navigate]);

  return {
    isAuthenticated: !!(
      user &&
      token &&
      userLoggedIn &&
      !isTokenExpired(token)
    ),
    user,
    token,
  };
};

/**
 * Hook to check if user has specific roles
 */
export const useRoleCheck = (requiredRoles: number[]) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !requiredRoles.includes(user.role_id || 0)) {
      console.warn("Role check failed - user does not have required role");
      navigate("/access-denied");
    }
  }, [user, requiredRoles, navigate]);

  return {
    hasRole: user ? requiredRoles.includes(user.role_id || 0) : false,
    userRole: user?.role_id,
  };
};

/**
 * Hook to monitor authorization events (401, 403, etc.)
 */
export const useAuthorizationEvents = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      console.warn("Unauthorized event received - logging out");
      logout();
      navigate("/auth/login");
    };

    const handleForbidden = () => {
      console.warn("Forbidden event received - redirecting to access denied");
      navigate("/access-denied");
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    window.addEventListener("forbidden", handleForbidden);

    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
      window.removeEventListener("forbidden", handleForbidden);
    };
  }, [logout, navigate]);
};

/**
 * Hook to get authorization token
 */
export const useAuthToken = () => {
  const { token } = useAuthStore();
  const currentToken = token || getToken();

  return {
    token: currentToken,
    isValid: currentToken ? !isTokenExpired(currentToken) : false,
    isExpired: currentToken ? isTokenExpired(currentToken) : true,
  };
};
