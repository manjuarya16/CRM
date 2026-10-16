import { create } from "zustand";
import { persist } from "zustand/middleware";
import API, { SERVER_URL } from "@/config";
import { ConfigState } from "@/interface";

const resolveImageUrl = (url: string | null): string => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  let base = SERVER_URL || "";
  if (typeof window !== "undefined" && window.location) {
    if (base.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      base = `${window.location.protocol}//${window.location.hostname}:3040`;
    }
  }
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

import { getHoverColor, getActiveColor, getContrastTextColor } from "@/utils/colorHelper";

export const applyConfigEffects = (configs: Record<string, any>) => {
  if (!configs || typeof window === "undefined") return;

  // 1. Dynamic Brand Color (Active menu item highlight & all primary action buttons)
  const brandColor = configs["general.settings.menu_color.brand_color"] || "#040975";

  if (brandColor && typeof brandColor === "string" && brandColor.trim()) {
    const cleanBrand = brandColor.trim();
    const hoverColor = getHoverColor(cleanBrand);
    const activeColor = getActiveColor(cleanBrand);
    const contrastText = getContrastTextColor(cleanBrand);

    document.documentElement.style.setProperty("--brand-color", cleanBrand);
    document.documentElement.style.setProperty("--brand-color-hover", hoverColor);
    document.documentElement.style.setProperty("--brand-color-active", activeColor);
    document.documentElement.style.setProperty("--brand-color-text", contrastText);
    document.documentElement.style.setProperty("--brand-color-light", `${cleanBrand}18`);
    document.documentElement.style.setProperty("--brand-color-ring", `${cleanBrand}40`);
    document.documentElement.style.setProperty("--primary-color", cleanBrand);
    document.documentElement.style.setProperty("--tw-menu-item-active-bg", cleanBrand);
    document.documentElement.style.setProperty("--tw-menu-item-active-color", "#ffffff");

    // Keep sidebar container clean as earlier: remove any forced container background or text overrides
    document.documentElement.style.removeProperty("--tw-menu-bg");
    document.documentElement.style.removeProperty("--tw-menu-item-color");
    document.documentElement.style.removeProperty("--tw-menu-item-hover-color");
    document.documentElement.style.removeProperty("--tw-menu-item-hover-bg");
    document.documentElement.removeAttribute("data-menu-dark");

    // Ensure data-menu-color is restored to light mode if not in dark mode
    const currentMode = document.documentElement.getAttribute("data-mode");
    if (currentMode !== "dark") {
      const currentMenuColor = document.documentElement.getAttribute("data-menu-color");
      if (currentMenuColor === "dark") {
        document.documentElement.setAttribute("data-menu-color", "light");
      }
    }
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

let inFlightFetchPromise: Promise<Record<string, any>> | null = null;
let lastFetchedTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      configs: {},
      loading: false,
      hasFetched: false,

  fetchConfigs: async (force = false) => {
    // Return cached configs if already fetched within TTL and force is false
    if (!force && get().hasFetched && Date.now() - lastFetchedTime < CACHE_TTL_MS) {
      return get().configs;
    }

    // Deduplicate concurrent requests: if a request is actively in-flight, return the shared promise
    if (inFlightFetchPromise) {
      return inFlightFetchPromise;
    }

    set({ loading: true });

    inFlightFetchPromise = (async () => {
      try {
        const res = await API.get("/configuration");
        const data = res.data?.data || res.data || {};
        if (res.data?.success && data) {
          applyConfigEffects(data);
          lastFetchedTime = Date.now();
          set({ configs: data, loading: false, hasFetched: true });
          return data;
        }
      } catch (e) {
        console.error("Failed to fetch configs", e);
      } finally {
        lastFetchedTime = Date.now();
        set({ loading: false, hasFetched: true });
        inFlightFetchPromise = null;
      }
      return get().configs || {};
    })();

    return inFlightFetchPromise;
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

  simulateWhatsAppLead: async (formData: FormData) => {
    const response = await API.post("/whatsapp/simulate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

    setConfigs: (configs) => {
      applyConfigEffects(configs);
      set({ configs });
    },
  }),
  {
    name: "crm-app-config",
    partialize: (state) => ({ configs: state.configs }),
    onRehydrateStorage: () => (state) => {
      if (state?.configs) {
        applyConfigEffects(state.configs);
      }
    },
  }
));
