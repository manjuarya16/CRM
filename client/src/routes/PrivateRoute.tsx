import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store";
import { isTokenExpired, getToken } from "../lib/auth-utils";

/**
 * Private Route forces the authorization before the route can be accessed
 */
const PrivateRoute = ({ component: Component, roles, ...rest }: any) => {
  const { user, token, userLoggedIn } = useAuthStore();
  const location = useLocation();

  // Check if user is authenticated
  const isAuthenticated = (() => {
    // Check if token is valid and not expired
    const authToken = token || getToken();
    if (!authToken || isTokenExpired(authToken)) {
      return false;
    }
    return userLoggedIn && (user || !!authToken);
  })();

  if (!isAuthenticated) {
    // Not logged in so redirect to login page with return url
    return (
      <Navigate
        to={`/auth/login?next=${encodeURIComponent(location.pathname)}`}
      />
    );
  }

  // Check if route is restricted by role
  if (roles && user && roles.indexOf(user.role_id) === -1) {
    // Role not authorized so redirect to home
    return <Navigate to="/" />;
  }

  // Authorized so return component
  return <Component {...rest} />;
};

export default PrivateRoute;
