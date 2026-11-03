import axios from "axios";
import { getSubdomain } from "@/utils/subdomain";

// Resolve API base URL dynamically
const getBaseApiUrl = (): string => {
  const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (configuredApiUrl) return configuredApiUrl;

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    // Keep local subdomains on the configured development API unless overridden.
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1") {
      return "http://localhost:3040/api";
    }
  }
  return "http://localhost:3040/api";
};

export const API_URL = getBaseApiUrl();
export const SERVER_URL = API_URL?.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

// Automatically inject tenant slug into every API request header when on a tenant subdomain or session
API.interceptors.request.use((config) => {
  const { slug } = getSubdomain();
  const savedSlug = typeof window !== "undefined"
    ? (sessionStorage.getItem("active_tenant_slug") || localStorage.getItem("active_tenant_slug"))
    : null;
  const effectiveSlug = slug || savedSlug;
  if (effectiveSlug && !config.headers["X-Tenant-Slug"]) {
    config.headers["X-Tenant-Slug"] = effectiveSlug;
  }
  return config;
});

export default API;
