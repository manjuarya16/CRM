import axios from "axios";
import { getSubdomain } from "@/utils/subdomain";

const getApiUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname.toLowerCase();
    // If running on localhost / *.localhost (e.g. admin.localhost), always target local backend port 3040
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1") {
      return "http://localhost:3040/api";
    }
  }
  return (import.meta.env.VITE_API_URL as string) || "http://localhost:3040/api";
};


// Reads VITE_API_URL from .env file (defaults to /api if undefined)
export const API_URL = getApiUrl();

export const SERVER_URL = API_URL?.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

// Automatically inject tenant slug into every API request header when on a tenant subdomain
API.interceptors.request.use((config) => {
  const { slug } = getSubdomain();
  if (slug) {
    config.headers["X-Tenant-Slug"] = slug;
  }
  return config;
});

export default API;
