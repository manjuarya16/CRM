import { create } from "zustand";
import { API } from "@/config";

export interface IEmailTemplate {
  id: number;
  name: string;
  subject?: string;
  content?: string;
  [key: string]: any;
}

export interface EmailTemplateStore {
  emailTemplates: IEmailTemplate[];
  loading: boolean;
  error: string | null;
  fetchEmailTemplates: () => Promise<IEmailTemplate[]>;
  fetchEmailTemplateById: (id: number | string) => Promise<IEmailTemplate | null>;
  saveEmailTemplate: (data: any, id?: number | string) => Promise<IEmailTemplate>;
  deleteEmailTemplate: (id: number | string) => Promise<boolean>;
}

export const useEmailTemplateStore = create<EmailTemplateStore>((set) => ({
  emailTemplates: [],
  loading: false,
  error: null,

  fetchEmailTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const res = await API.get("/email-templates").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      set({ emailTemplates: list, loading: false });
      return list;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch email templates" });
      return [];
    }
  },

  fetchEmailTemplateById: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      const res = await API.get(`/email-templates/${id}`);
      set({ loading: false });
      return res.data?.data || null;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to fetch email template" });
      return null;
    }
  },

  saveEmailTemplate: async (data: any, id?: number | string) => {
    set({ loading: true, error: null });
    try {
      let res;
      if (id) {
        res = await API.put(`/email-templates/${id}`, data);
      } else {
        res = await API.post("/email-templates", data);
      }
      set({ loading: false });
      return res.data?.data || res.data;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to save email template" });
      throw err;
    }
  },

  deleteEmailTemplate: async (id: number | string) => {
    set({ loading: true, error: null });
    try {
      await API.delete(`/email-templates/${id}`);
      set((state) => ({
        emailTemplates: state.emailTemplates.filter((e) => String(e.id) !== String(id)),
        loading: false,
      }));
      return true;
    } catch (err: any) {
      set({ loading: false, error: err?.message || "Failed to delete email template" });
      throw err;
    }
  },
}));

export default useEmailTemplateStore;
