import { create } from "zustand";
import { API } from "@/config";
import { handleErrorResponse } from "@/utils/swalAlert";

import { OrganizationState } from "@/interface/organizationInterface";

const useOrganizationStore = create<OrganizationState>((set) => {
  const normalize = (r: any) => {
    if (!r) return null;
    const merged = r.raw ? { ...r.raw, ...r } : { ...r };
    const mapped = {
      // always expose the integer PK as numeric_id so edit form sends it directly
      numeric_id: (() => {
        const candidates = [merged.numeric_id, merged.id, merged.raw?.id];
        for (const c of candidates) {
          const n = Number(c);
          if (Number.isFinite(n) && n > 0) return n;
        }
        return null;
      })(),
      id: merged.id ?? merged.org_id ?? null,
      org_id: merged.org_id ?? null,
      name: merged.name ?? null,
      registration_no: merged.registration_no ?? null,
      state: merged.state ?? merged.state_id ?? null,
      city: merged.city ?? merged.city_id ?? null,
      date_of_establishment: merged.date_of_establishment ?? null,
      website_url: merged.website_url ?? merged.website ?? null,
      social_media_links: merged.social_media_links ?? null,
      logo: merged.logo ?? merged.raw?.logo ?? merged.profile_img ?? null,
      purpose: merged.purpose ?? null,
      email: merged.email ?? null,
      phone: merged.phone ?? null,
      address_master:
        merged.address_master ??
        (merged.raw && merged.raw.address_master) ??
        null,
      address:
        merged.address ??
        merged.address_line1 ??
        (merged.address_master &&
          (merged.address_master.address_line ||
            merged.address_master.address)) ??
        null,
      street:
        merged.street ??
        (merged.address_master &&
          (merged.address_master.address_line ||
            merged.address_master.address)) ??
        merged.address ??
        merged.address_line1 ??
        null,
      pincode:
        merged.pincode ??
        merged.postal_code ??
        (merged.address_master && merged.address_master.pincode) ??
        null,
      postal_code:
        merged.postal_code ??
        merged.pincode ??
        (merged.address_master && merged.address_master.pincode) ??
        null,
      state_id:
        merged.state_id ??
        (merged.address_master && merged.address_master.state_id) ??
        null,
      city_id:
        merged.city_id ??
        (merged.address_master && merged.address_master.city_id) ??
        null,
      country:
        merged.country ??
        (merged.address_master && merged.address_master.country) ??
        null,
      address_type:
        merged.address_type ??
        (merged.address_master && merged.address_master.address_type) ??
        null,
      website: merged.website ?? merged.website_url ?? null,
      mainBranch: merged.mainBranch ?? merged.primary_branch_id ?? null,
      status: merged.status ?? null,
      // new fields
      registration_date: merged.registration_date ?? null,
      registered_under_act: merged.registered_under_act ?? null,
      branch_id: merged.branch_id ?? null,
      ceo_name: merged.ceo_name ?? null,
      ceo_contact: merged.ceo_contact ?? null,
      chairperson_name: merged.chairperson_name ?? null,
      chairperson_contact: merged.chairperson_contact ?? null,
      raw: merged,
    };

    return mapped;
  };

  return {
    organization: null,
    loading: false,
    error: null,

    getOrganization: async () => {
      try {
        set({
          loading: true,
          error: null,
        });

        const response = await API.get("/organizations");

        const row = response.data.data && response.data.data[0];

        set({
          organization: normalize(row),
          loading: false,
        });
      } catch (error) {
        set({
          error,
          loading: false,
        });

        handleErrorResponse("Organization", "fetch", error);
      }
    },

    updateOrganization: async (id: string, data: any) => {
      try {
        set({
          loading: true,
          error: null,
        });

        const response = await API.put(`/organizations/${id}`, data);

        set({
          organization: normalize(response.data.data) || data,
          loading: false,
        });

        return response;
      } catch (error) {
        set({
          error,
          loading: false,
        });

        throw error;
      }
    },
    fetchOrganizations: async (page = 1, per_page = 10, search = "") => {
      set({ loading: true, error: null });
      try {
        const response = await API.get(`/organizations?page=${page}&per_page=${per_page}&search=${encodeURIComponent(search)}`);
        set({ loading: false });
        return response.data || { data: [], total: 0 };
      } catch (error) {
        set({ error, loading: false });
        return { data: [], total: 0 };
      }
    },

    fetchOrganizationById: async (id: number | string) => {
      set({ loading: true, error: null });
      try {
        const response = await API.get(`/organizations/${id}`);
        set({ loading: false });
        return response.data?.data || null;
      } catch (error) {
        set({ error, loading: false });
        return null;
      }
    },

    createOrganization: async (data: any) => {
      set({ loading: true, error: null });
      try {
        const response = await API.post("/organizations", data);
        set({ loading: false });
        return response.data;
      } catch (error) {
        set({ error, loading: false });
        throw error;
      }
    },

    deleteOrganization: async (id: number | string) => {
      set({ loading: true, error: null });
      try {
        const response = await API.delete(`/organizations/${id}`);
        set({ loading: false });
        return response.data;
      } catch (error) {
        set({ error, loading: false });
        throw error;
      }
    },
  };
});

export { useOrganizationStore };

export default useOrganizationStore;
