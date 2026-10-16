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

export const useTenantStore = create<TenantState>((set, get) => ({
  profile: null,
  loading: false,
  saving: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/tenant/current");
      if (res.data?.success && res.data?.data) {
        set({ profile: res.data.data, loading: false });
        return res.data.data;
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
        set({ profile: res.data.data, saving: false });
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
