import { API } from "@/config";

export interface CreateTenantPayload {
  name: string;
  slug: string;
  plan?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
}

export const superAdminApi = {
  login: (credentials: { email: string; password: string }) => {
    return API.post("/super-admin/login", credentials);
  },

  getProfile: () => {
    return API.get("/super-admin/me");
  },

  getMetrics: () => {
    return API.get("/super-admin/metrics");
  },

  getTenants: () => {
    return API.get("/super-admin/tenants");
  },

  createTenant: (data: CreateTenantPayload) => {
    return API.post("/super-admin/tenants", data);
  },

  updateTenantStatus: (id: number, status: "active" | "suspended") => {
    return API.patch(`/super-admin/tenants/${id}/status`, { status });
  },

  getPublicTenant: (slug: string) => {
    return API.get(`/public/tenant/${slug}`);
  },
};
