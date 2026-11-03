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

export const processUrlAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const token =
      params.get("impersonate_token") ||
      params.get("token") ||
      params.get("auth_token");

    if (token && !isTokenExpired(token)) {
      // 1. Store token in sessionStorage
      sessionStorage.setItem("token", token);

      // Save tenant slug and id if present
      const orgSlug = params.get("org_slug") || params.get("tenant");
      if (orgSlug) {
        sessionStorage.setItem("active_tenant_slug", orgSlug.toLowerCase().trim());
        try {
          localStorage.setItem("active_tenant_slug", orgSlug.toLowerCase().trim());
        } catch {}
      }
      const orgId = params.get("org_id") || params.get("tenant_id");
      if (orgId) {
        sessionStorage.setItem("active_tenant_id", orgId.trim());
        try {
          localStorage.setItem("active_tenant_id", orgId.trim());
        } catch {}
      }

      // 2. Parse user data
      let userData: any = null;
      const userParam = params.get("user");
      if (userParam) {
        try {
          userData = JSON.parse(userParam);
        } catch {
          userData = null;
        }
      }
      if (!userData) {
        const payload = parseJwt(token);
        if (payload) {
          userData = {
            id: payload.sub,
            name: payload.name || payload.email || "Admin",
            email: payload.email,
            role: payload.role || "admin",
            tenant_id: payload.tenant_id,
          };
        }
      }

      if (userData) {
        if (!userData.role_id) userData.role_id = 1;
        if (!userData.role) userData.role = "admin";
        sessionStorage.setItem(
          "app_user",
          JSON.stringify({
            token,
            ...userData,
          })
        );
        try {
          localStorage.setItem(
            "auth-store",
            JSON.stringify({
              state: {
                user: userData,
                token: token,
                userLoggedIn: true,
              },
              version: 0,
            })
          );
        } catch (e) {
          console.warn("Failed to write auth-store to localStorage", e);
        }
      }

      // 3. Set cookie
      document.cookie = `authToken=${token}; path=/; max-age=7200; SameSite=Lax`;

      // 4. Clean search params from URL address bar without reloading
      params.delete("impersonate_token");
      params.delete("token");
      params.delete("auth_token");
      params.delete("user");
      params.delete("org_name");
      params.delete("org_slug");
      params.delete("org_id");
      params.delete("tenant_id");
      const cleanSearch = params.toString() ? `?${params.toString()}` : "";
      const cleanUrl = `${window.location.pathname}${cleanSearch}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);

      return token;
    }
  } catch (err) {
    console.warn("Failed to process URL auth token:", err);
  }
  return null;
};

export const getToken = (): string | null => {
  const urlToken = processUrlAuthToken();
  if (urlToken) return urlToken;

  return (
    getTokenFromSession() ||
    getTokenFromCookie() ||
    getTokenFromLocalStorageAuthStore()
  );
};

export const getSuperAdminToken = (): string | null => {
  if (typeof window === "undefined") return null;
  // 1. Try sessionStorage first
  const sessionToken = sessionStorage.getItem("super_admin_token");
  if (sessionToken && !isTokenExpired(sessionToken)) {
    return sessionToken;
  }

  // 2. Try saas_super_admin_session from localStorage
  try {
    const raw = localStorage.getItem("saas_super_admin_session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token ?? parsed?.token ?? null;
    if (token && !isTokenExpired(token)) {
      return token;
    }
  } catch (error) {
    console.warn("Failed to read saas_super_admin_session token", error);
  }

  return null;
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
