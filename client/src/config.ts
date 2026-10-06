import axios from "axios";

// Reads VITE_API_URL from .env file (defaults to /api if undefined)
export const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

export const SERVER_URL = API_URL?.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

// Note: Axios interceptors are configured in App.tsx via setupAxiosInterceptors()
// Do NOT set Authorization headers here - interceptors handle it dynamically

export default API;
