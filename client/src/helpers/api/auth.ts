import { API } from "@/config";

// account - using unified API instance from config.ts
function login(params: { username: string; password: string }) {
  const baseUrl = "/login";
  return API.post(`${baseUrl}`, params);
}

function logout() {
  const baseUrl = "/logout";
  return API.post(`${baseUrl}`, {});
}

function signup(params: { name: string; email: string; password: string }) {
  const baseUrl = "/register";
  return API.post(`${baseUrl}`, params);
}

function forgotPassword(params: { email: string }) {
  const baseUrl = "/forgot-password";
  return API.post(`${baseUrl}`, params);
}

function resetPassword(params: { email: string; new_password: string }) {
  const baseUrl = "/reset-password";
  return API.post(`${baseUrl}`, params);
}

export { login, logout, signup, forgotPassword, resetPassword };
