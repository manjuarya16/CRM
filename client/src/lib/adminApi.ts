import axios from "axios";
import { API_URL } from "../config";
import { getSuperAdminToken } from "./auth-utils";

export const adminApi = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: Attach Super Admin token if present
adminApi.interceptors.request.use(
  (config) => {
    const token =
      getSuperAdminToken() ||
      sessionStorage.getItem("super_admin_token") ||
      sessionStorage.getItem("super_admin_session") ||
      localStorage.getItem("super_admin_session");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["X-Authorization"] = `Bearer ${token}`;
    }
    config.headers["Content-Type"] = config.headers["Content-Type"] || "application/json";
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Redirect to admin login on 401 Unauthorized
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes("/admin/login") || error.config?.url?.includes("/super-admin/login");
      if (!isLoginRequest) {
        console.warn("Super Admin session expired or invalid. Redirecting to admin login...");
        sessionStorage.removeItem("super_admin_token");
        sessionStorage.removeItem("super_admin_session");
        if (typeof window !== "undefined") {
          const isSuperAdminPath = window.location.pathname.startsWith("/super-admin");
          window.location.href = isSuperAdminPath ? "/super-admin/login" : "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
