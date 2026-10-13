import { create } from "zustand";
import { persist } from "zustand/middleware";
import { superAdminApi, CreateTenantPayload } from "@/helpers/api/superAdmin";
import { API } from "@/config";

export interface SuperAdminUser {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface TenantRecord {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  status: "active" | "suspended";
  plan: string;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
  user_count: number;
  lead_count: number;
}

export interface SuperAdminMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalLeads: number;
}

interface SuperAdminState {
  admin: SuperAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  tenants: TenantRecord[];
  metrics: SuperAdminMetrics | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchTenants: () => Promise<void>;
  fetchMetrics: () => Promise<void>;
  createTenant: (payload: CreateTenantPayload) => Promise<{ success: boolean; tenant?: any; error?: string }>;
  toggleTenantStatus: (id: number, currentStatus: "active" | "suspended") => Promise<boolean>;
}

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      tenants: [],
      metrics: null,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const res = await superAdminApi.login({ email, password });
          if (res.data?.success && res.data?.token) {
            const token = res.data.token;
            const admin = res.data.admin;

            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            set({
              admin,
              token,
              isAuthenticated: true,
              loading: false,
              error: null,
            });
            return true;
          }
          set({ loading: false, error: "Authentication failed" });
          return false;
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || "Login failed";
          set({ loading: false, error: msg });
          return false;
        }
      },

      logout: () => {
        delete API.defaults.headers.common["Authorization"];
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
          tenants: [],
          metrics: null,
          error: null,
        });
      },

      fetchTenants: async () => {
        set({ loading: true });
        try {
          const token = get().token;
          if (token) {
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          const res = await superAdminApi.getTenants();
          if (res.data?.success) {
            set({ tenants: res.data.data, loading: false });
          }
        } catch (err: any) {
          set({ loading: false, error: err.message });
        }
      },

      fetchMetrics: async () => {
        try {
          const token = get().token;
          if (token) {
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          const res = await superAdminApi.getMetrics();
          if (res.data?.success) {
            set({ metrics: res.data.data });
          }
        } catch (err: any) {
          console.error("fetchMetrics error:", err);
        }
      },

      createTenant: async (payload: CreateTenantPayload) => {
        set({ loading: true, error: null });
        try {
          const token = get().token;
          if (token) {
            API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          }
          const res = await superAdminApi.createTenant(payload);
          if (res.data?.success) {
            await get().fetchTenants();
            await get().fetchMetrics();
            set({ loading: false });
            return { success: true, tenant: res.data.tenant };
          }
          set({ loading: false });
          return { success: false, error: "Failed to create organization" };
        } catch (err: any) {
          const msg = err.response?.data?.message || err.message || "Failed to create organization";
          set({ loading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      toggleTenantStatus: async (id: number, currentStatus: "active" | "suspended") => {
        const nextStatus = currentStatus === "active" ? "suspended" : "active";
        try {
          const res = await superAdminApi.updateTenantStatus(id, nextStatus);
          if (res.data?.success) {
            set({
              tenants: get().tenants.map((t) =>
                t.id === id ? { ...t, status: nextStatus } : t
              ),
            });
            await get().fetchMetrics();
            return true;
          }
          return false;
        } catch (err: any) {
          console.error("toggleTenantStatus error:", err);
          return false;
        }
      },
    }),
    {
      name: "saas_super_admin_session",
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
