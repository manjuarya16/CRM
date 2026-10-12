import axios from "axios";

const getApiUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string) || "/api";
  if (typeof window !== "undefined" && window.location) {
    const { hostname } = window.location;
    if (envUrl.includes("localhost") && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return envUrl.replace(/localhost(:\d+)?/, `${hostname}$1`);
    }
  }
  return envUrl;
};

// Reads VITE_API_URL from .env file (defaults to /api if undefined)
export const API_URL = getApiUrl();

export const SERVER_URL = API_URL?.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

// Note: Axios interceptors are configured in App.tsx via setupAxiosInterceptors()
// Do NOT set Authorization headers here - interceptors handle it dynamically

export default API;
