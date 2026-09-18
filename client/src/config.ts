import axios from "axios";

export const API_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:3040/api";

export const SERVER_URL = API_URL.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

// Note: Axios interceptors are configured in App.tsx via setupAxiosInterceptors()
// Do NOT set Authorization headers here - interceptors handle it dynamically

export default API;
