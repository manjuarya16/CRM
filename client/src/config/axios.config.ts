import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3040/api";
export const SERVER_URL = API_URL?.replace(/\/api$/, "");

export const API = axios.create({
  baseURL: API_URL,
});

export default API;
