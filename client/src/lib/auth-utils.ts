/**
 * Utility functions for authentication
 */

export const logout = () => {
  // Clear token from sessionStorage
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("last_completed_status");

  // Clear authToken cookie
  document.cookie = "authToken=; path=/; max-age=0";

  // Redirect to login
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
};

export const getTokenFromCookie = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/authToken=([^;]+)/);
  return match ? match[1] : null;
};

export const getTokenFromSession = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token");
};

export const getTokenFromLocalStorageAuthStore = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const authStore = localStorage.getItem("auth-store");
    if (!authStore) return null;
    const parsed = JSON.parse(authStore);
    // Zustand persist wraps state under `state` key
    return parsed?.state?.token ?? parsed?.token ?? null;
  } catch (error) {
    console.warn("Failed to read auth-store token", error);
    return null;
  }
};

export const getToken = (): string | null => {
  return (
    getTokenFromSession() ||
    getTokenFromCookie() ||
    getTokenFromLocalStorageAuthStore()
  );
};

// Decode JWT payload (browser-only). Returns null on failure.
export const parseJwt = (token: string): any | null => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64Url -> base64 and padding
    let base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    if (padding === 2) base64 += "==";
    else if (padding === 3) base64 += "=";
    else if (padding !== 0) return null;

    // atob is available in browsers
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    return JSON.parse(json);
  } catch (e) {
    console.warn("Failed to parse JWT payload", e);
    return null;
  }
};

export const isTokenExpired = (token?: string | null): boolean => {
  try {
    if (!token) return true;
    const payload = parseJwt(token);
    if (!payload) return true;
    const exp = payload.exp as number | undefined;
    if (typeof exp !== "number") return true;
    return Date.now() >= exp * 1000;
  } catch (_e) {
    return true;
  }
};
