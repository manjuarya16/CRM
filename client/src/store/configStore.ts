import { create } from "zustand";
import { getConfigurations } from "@/services/configService";
import { SERVER_URL } from "@/config";

interface ConfigState {
  configs: Record<string, any>;
  loading: boolean;
  fetchConfigs: () => Promise<Record<string, any>>;
  setConfigs: (configs: Record<string, any>) => void;
}

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
    
    // Remove pre-existing icon link tags to bypass browser caching of old icons
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
      const res = await getConfigurations();
      if (res.success && res.data) {
        applyConfigEffects(res.data);
        set({ configs: res.data, loading: false });
        return res.data;
      }
    } catch (e) {
      console.error("Failed to fetch configs", e);
    }
    set({ loading: false });
    return {};
  },
  setConfigs: (configs) => {
    applyConfigEffects(configs);
    set({ configs });
  },
}));
