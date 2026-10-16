import { useEffect, useState } from "react";
import { useOrganizationStore, useAuthStore, useConfigStore } from "../store";
import commonAPI from "../helpers/api/common";
import { API_URL } from "../config";

const resolveLogoUrl = (logo: string | null): string | null => {
  if (!logo) return null;
  if (logo.startsWith("data:") || logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  let base = API_URL.replace(/\/api$/, "");
  if (typeof window !== "undefined" && window.location) {
    if (base.includes("localhost") && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      base = `${window.location.protocol}//${window.location.hostname}:3040`;
    }
  }
  return `${base}${logo.startsWith("/") ? "" : "/"}${logo}`;
};

const useAppLogo = () => {
  const { organization, getOrganization } = useOrganizationStore();
  const { userLoggedIn } = useAuthStore();
  const configs = useConfigStore((s) => s.configs);
  const fetchConfigs = useConfigStore((s) => s.fetchConfigs);
  const [publicBranding, setPublicBranding] = useState<{
    name: string | null;
    logo: string | null;
  }>({ name: null, logo: null });

  // Only sync configs from server once on mount or when login state changes
  useEffect(() => {
    fetchConfigs();
  }, [userLoggedIn]);

  useEffect(() => {
    if (userLoggedIn) {
      if (!organization) getOrganization();
    } else {
      commonAPI
        .getPublicBranding()
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setPublicBranding({
              name: res.data.data.name,
              logo: res.data.data.logo,
            });
          }
        })
        .catch(() => {});
    }
  }, [userLoggedIn]);

  // Admin Logo configured in Configuration is the primary brand logo for the entire system
  const adminLogo = configs["general.general.admin_logo.logo_image"];
  const rawLogo = adminLogo || (userLoggedIn ? organization?.logo : publicBranding.logo);
  const orgLogo = resolveLogoUrl(rawLogo ?? null);

  // Favicon configured in Configuration -> General settings for condensed/small sidebar
  const adminFavicon = configs["general.general.admin_logo.favicon_image"];
  const faviconUrl = resolveLogoUrl(adminFavicon ?? null);

  return {
    logoLight: orgLogo,
    logoDark: orgLogo,
    logoSm: faviconUrl || orgLogo,
    orgName:
      (userLoggedIn ? organization?.name : publicBranding.name) ?? "CRM",
  };
};

export default useAppLogo;
