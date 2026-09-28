import { create } from "zustand";
import API, { SERVER_URL } from "@/config";
import { ConfigState } from "@/interface";

const resolveImageUrl = (url: string | null): string => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SERVER_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const applyConfigEffects = (configs: Record<string, any>) => {
  if (!configs || typeof window === "undefined") return;

  // 1. Brand / Menu Color
  const brandColor = configs["general.settings.menu_color.brand_color"];
  if (brandColor && typeof brandColor === "string") {
    document.documentElement.style.setProperty("--brand-color", brandColor);
    document.documentElement.style.setProperty("--primary-color", brandColor);
    document.documentElement.style.setProperty("--tw-menu-item-active-bg", brandColor);
  }

  // 2. Favicon Image
  const favicon = configs["general.general.admin_logo.favicon_image"];
  if (favicon && typeof favicon === "string" && favicon.trim() !== "") {
    const fullFaviconUrl = resolveImageUrl(favicon);
    
    const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    existingIcons.forEach((link) => {
      link.parentNode?.removeChild(link);
    });

    const newLink = document.createElement("link");
    newLink.rel = "shortcut icon";
    newLink.type = "image/x-icon";
    newLink.href = fullFaviconUrl;
    document.head.appendChild(newLink);
  }
};

export const useConfigStore = create<ConfigState>((set) => ({
  configs: {},
  loading: false,

  fetchConfigs: async () => {
    set({ loading: true });
    try {
      const res = await API.get("/configuration");
      const data = res.data?.data || res.data || {};
      if (res.data?.success && data) {
        applyConfigEffects(data);
        set({ configs: data, loading: false });
        return data;
      }
    } catch (e) {
      console.error("Failed to fetch configs", e);
    }
    set({ loading: false });
    return {};
  },

  saveConfigurations: async (settings: Record<string, any>) => {
    const response = await API.post("/configuration", { settings });
    if (response.data?.success) {
      const updated = { ...response.data.data };
      applyConfigEffects(updated);
      set({ configs: updated });
    }
    return response.data;
  },

  uploadConfigImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await API.post("/configuration/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  testSmtpConnection: async (testConfig?: Record<string, any>) => {
    const response = await API.post("/configuration/test-smtp", { testConfig });
    return response.data;
  },

  setConfigs: (configs) => {
    applyConfigEffects(configs);
    set({ configs });
  },
}));
