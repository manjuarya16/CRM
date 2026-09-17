import axios from "axios";
import {
  getTokenFromCookie,
  getTokenFromLocalStorageAuthStore,
  getToken,
  isTokenExpired,
} from "@/lib/auth-utils";

// Simple notification function (no external dependency)
const showNotification = (
  message: string,
  type: "error" | "warning" | "info" = "error",
) => {
  // Try to use sweetalert2 if available
  try {
    const Swal = (window as any).Swal || require("sweetalert2").default;
    if (Swal) {
      Swal.fire({
        icon: type,
        title: type === "error" ? "Error" : "Notice",
        text: message,
        timer: 3000,
        timerProgressBar: true,
      });
      return;
    }
  } catch (e) {
    // sweetalert2 not available
  }

  // Fallback: console log
  console.log(`[${type.toUpperCase()}] ${message}`);
};

let isSetup = false;

/**
 * Setup interceptors for provided axios instances.
 * Handles all authorization logic including token injection and error handling
 */
export default function setupAxiosInterceptors(apiInstance?: any) {
  if (isSetup) return;
  isSetup = true;

  // REQUEST INTERCEPTOR - Add Authorization Token
  const attachToken = (config: any) => {
    try {
      // Get token from sessionStorage or cookie
      let token = sessionStorage.getItem("token");

      if (!token) {
        token = getTokenFromCookie();
        if (token && !isTokenExpired(token)) {
          sessionStorage.setItem("token", token);
        } else {
          token = null;
        }
      }

      if (!token) {
        token = getTokenFromLocalStorageAuthStore();
        if (token && !isTokenExpired(token)) {
          sessionStorage.setItem("token", token); // sync to sessionStorage
        } else {
          token = null;
        }
      }

      // Validate token is not expired
      if (token && isTokenExpired(token)) {
        console.warn("Token expired, clearing from storage");
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        document.cookie = "authToken=; path=/; max-age=0";
        token = null;
      }

      // Attach token to request headers
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
        config.headers["X-Authorization"] = `Bearer ${token}`; // Backup header
      }

      // Add standard headers
      config.headers["Content-Type"] =
        config.headers["Content-Type"] || "application/json";

      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
  };

  const handleRequestError = (error: any) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  };

  // RESPONSE INTERCEPTOR - Handle Authorization Errors
  const handleResponseError = (error: any) => {
    if (!error || !error.response) {
      console.error("Network error:", error?.message);
  //  showNotification("Network error. Please check your connection.", "error");
  //     return Promise.reject(error);
      error.response = {
        status: 500,
        statusText: "Internal Server Error",
        data: { message: "Internal Server Error" },
      };
    }

    const status = error.response.status;
    const errorMessage =
      error.response.data?.message || error.response.statusText;

    // 401 UNAUTHORIZED - Token Invalid/Expired
    if (status === 401) {
      console.warn("401 Unauthorized - Invalid or expired token");
      // Clear all auth data
      try {
        sessionStorage.removeItem("token");
        localStorage.removeItem("token");
        localStorage.removeItem("auth-store");
        document.cookie = "authToken=; path=/; max-age=0";
      } catch (e) {
        console.warn("Error clearing token:", e);
      }

      // Show notification
      showNotification("Session expired. Please login again.", "error");
      // Redirect to login
      if (typeof window !== "undefined") {
        const loginPath = "/auth/login";
        const currentPath = window.location.pathname;

        if (currentPath !== loginPath) {
          console.log("Redirecting to login from:", currentPath);

          // Dispatch custom event for app-level handling
          try {
            window.dispatchEvent(new CustomEvent("unauthorized"));
          } catch (e) {
            console.warn("Error dispatching unauthorized event:", e);
          }

          // Redirect using multiple methods for reliability
          try {
            window.location.replace(loginPath);
          } catch (e) {
            try {
              window.location.assign(loginPath);
            } catch (e2) {
              window.location.href = loginPath;
            }
          }
        }
      }

      return Promise.reject(error);
    }

    // 403 FORBIDDEN - User Not Authorized
    if (status === 403) {
      console.warn("403 Forbidden - User not authorized for this resource");
      showNotification(
        "You don't have permission to access this resource",
        "warning",
      );
      // Dispatch event for app-level handling
      try {
        window.dispatchEvent(new CustomEvent("forbidden"));
      } catch (e) {
        console.warn("Error dispatching forbidden event:", e);
      }

      return Promise.reject(error);
    }

    // 404 NOT FOUND
    if (status === 404) {
      console.warn("404 Not Found:", error.config?.url);
      showNotification("Resource not found", "warning");
      return Promise.reject(error);
    }

    // 500 SERVER ERROR
    if (status === 500) {
      console.error("500 Server Error");
      showNotification("Server error. Please try again later.", "error");
      return Promise.reject(error);
    }

    // 400 BAD REQUEST
    if (status === 400) {
      // Log server validation payload for debugging
      // eslint-disable-next-line no-console
      console.debug("Axios 400 response data:", error.response?.data || error);
      console.warn("400 Bad Request:", errorMessage);
      showNotification(errorMessage || "Invalid request", "error");
      return Promise.reject(error);
    }

    // OTHER ERRORS
    console.error(`HTTP Error ${status}:`, errorMessage);
    showNotification(errorMessage || `Error: ${status}`, "error");

    return Promise.reject(error);
  };

  // ATTACH INTERCEPTORS TO AXIOS INSTANCES
  // Attach to provided instance (if Zustand store API)
  if (apiInstance && apiInstance.interceptors) {
    apiInstance.interceptors.request.use(attachToken, handleRequestError);
    apiInstance.interceptors.response.use((r: any) => r, handleResponseError);
  }

  // Always attach to default axios instance
  axios.interceptors.request.use(attachToken, handleRequestError);
  axios.interceptors.response.use((r: any) => r, handleResponseError);

  console.log("✅ Axios interceptors initialized for authorization");
}
