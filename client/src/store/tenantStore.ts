import { create } from "zustand";
import API from "@/config";
import Swal from "sweetalert2";

export interface TenantAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface TenantAdminUser {
  id: number;
  name: string;
  email: string;
}

export interface TenantStats {
  users: number;
  leads: number;
  contacts: number;
}

export interface TenantProfile {
  id: number;
  name: string;
  slug: string;
  domain?: string | null;
  status: string;
  plan: string;
  is_trial?: boolean;
  trial_days_remaining?: number | null;
  computed_status?: string;
  sub_status?: string | null;
  subscription_expiry_date?: string | null;
  subscription_start_date?: string | null;
  tier_name?: string | null;
  logo_url?: string | null;
  settings: Record<string, any>;
  email?: string;
  phone?: string;
  website?: string;
  registration_no?: string;
  established_date?: string;
  currency?: string;
  timezone?: string;
  address?: TenantAddress;
  admin?: TenantAdminUser | null;
  stats?: TenantStats;
  created_at?: string;
  updated_at?: string;
}

export interface TenantState {
  profile: TenantProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchProfile: () => Promise<TenantProfile | null>;
  updateProfile: (data: Partial<TenantProfile>) => Promise<boolean>;
}

const getInitialProfile = (): TenantProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("current_tenant_profile") || localStorage.getItem("current_tenant_profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useTenantStore = create<TenantState>((set, get) => ({
  profile: getInitialProfile(),
  loading: false,
  saving: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/tenant/current");
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("current_tenant_profile", JSON.stringify(data));
            localStorage.setItem("current_tenant_profile", JSON.stringify(data));
            if (data.slug) {
              sessionStorage.setItem("active_tenant_slug", data.slug);
              localStorage.setItem("active_tenant_slug", data.slug);
            }
            if (data.id) {
              sessionStorage.setItem("active_tenant_id", String(data.id));
              localStorage.setItem("active_tenant_id", String(data.id));
            }
          } catch {}
        }
        set({ profile: data, loading: false });
        return data;
      }
      throw new Error(res.data?.message || "Failed to load organization profile");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to fetch organization details";
      set({ error: msg, loading: false });
      return null;
    }
  },

  updateProfile: async (data: Partial<TenantProfile>) => {
    set({ saving: true, error: null });
    try {
      const res = await API.put("/tenant/current", data);
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("current_tenant_profile", JSON.stringify(data));
            localStorage.setItem("current_tenant_profile", JSON.stringify(data));
          } catch {}
        }
        set({ profile: data, saving: false });
        Swal.fire({
          icon: "success",
          title: "Organization Updated",
          text: res.data.message || "Organization details have been saved successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        return true;
      }
      throw new Error(res.data?.message || "Failed to update organization");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to update organization details";
      set({ error: msg, saving: false });
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: msg,
      });
      return false;
    }
  },
}));

export default useTenantStore;
