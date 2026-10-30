import { API } from "@/config";
import { getSuperAdminToken } from "@/lib/auth-utils";

export interface CreateTenantPayload {
  name: string;
  slug: string;
  plan?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;

  // Company Details
  registration_no?: string;
  email?: string;
  phone?: string;
  website?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  logo_url?: string;
  description?: string;
  registered_under_act?: string;
  social_media_links?: string;

  // Key Persons
  ceo_name?: string;
  ceo_contact?: string;
  chairperson_name?: string;
  chairperson_contact?: string;

  // Address & Location
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
}

export interface UpdateTenantPayload extends Partial<CreateTenantPayload> {
  status?: "active" | "suspended";
}

const authHeader = (explicitToken?: string) => {
  const token = explicitToken || getSuperAdminToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Authorization": `Bearer ${token}`,
        },
      }
    : {};
};

export const superAdminApi = {
  login: (credentials: { email: string; password: string }) => {
    return API.post("/super-admin/login", credentials);
  },

  getProfile: (token?: string) => {
    return API.get("/super-admin/me", authHeader(token));
  },

  getMetrics: (token?: string) => {
    return API.get("/super-admin/metrics", authHeader(token));
  },

  getTenants: (token?: string) => {
    return API.get("/super-admin/tenants", authHeader(token));
  },

  getSubscriptionPlans: (token?: string) => {
    return API.get("/super-admin/modules/subscription-plans", authHeader(token));
  },

  getTenant: (id: number, token?: string) => {
    return API.get(`/super-admin/tenants/${id}`, authHeader(token));
  },

  createTenant: (data: CreateTenantPayload, token?: string) => {
    return API.post("/super-admin/tenants", data, authHeader(token));
  },

  updateTenant: (id: number, data: UpdateTenantPayload, token?: string) => {
    return API.put(`/super-admin/tenants/${id}`, data, authHeader(token));
  },

  updateTenantStatus: (id: number, status: "active" | "suspended", token?: string) => {
    return API.patch(`/super-admin/tenants/${id}/status`, { status }, authHeader(token));
  },

  createTenantPaymentLink: (id: number, pricingTierId?: number, token?: string) => {
    return API.post(
      `/super-admin/modules/tenants/${id}/subscriptions/payment-link`,
      pricingTierId ? { pricing_tier_id: pricingTierId } : {},
      authHeader(token)
    );
  },

  getPublicTenant: (slug: string) => {
    return API.get(`/public/tenant/${slug}`);
  },
};
