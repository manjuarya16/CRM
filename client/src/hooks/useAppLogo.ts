import { useEffect, useState } from "react";
import { useOrganizationStore, useAuthStore, useConfigStore, useTenantStore } from "../store";
import commonAPI from "../helpers/api/common";
import { superAdminApi } from "../helpers/api/superAdmin";
import { getSubdomain } from "../utils/subdomain";
import { API_URL } from "../config";

export const resolveLogoUrl = (logo: string | null | undefined): string | null => {
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
  const { profile: tenantProfile, fetchProfile: fetchTenantProfile } = useTenantStore();
  const { userLoggedIn } = useAuthStore();
  const configs = useConfigStore((s) => s.configs);
  const fetchConfigs = useConfigStore((s) => s.fetchConfigs);
  const subdomain = getSubdomain();
  const [publicBranding, setPublicBranding] = useState<{
    name: string | null;
    logo: string | null;
  }>({ name: null, logo: null });
  const [publicTenant, setPublicTenant] = useState<{
    name: string | null;
    logo_url: string | null;
  }>({ name: null, logo_url: null });

  // Only sync configs from server once on mount or when login state changes
  useEffect(() => {
    fetchConfigs();
  }, [userLoggedIn]);

  useEffect(() => {
    if (userLoggedIn) {
      if (!organization) getOrganization();
      if (!tenantProfile) fetchTenantProfile();
    } else {
      if (subdomain.slug) {
        superAdminApi
          .getPublicTenant(subdomain.slug)
          .then((res) => {
            if (res.data?.success && res.data?.data) {
              setPublicTenant({
                name: res.data.data.name || null,
                logo_url: res.data.data.logo_url || null,
              });
            }
          })
          .catch(() => {});
      }
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
  }, [userLoggedIn, subdomain.slug]);

  const adminLogo = configs["general.general.admin_logo.logo_image"];
  const tenantLogo = userLoggedIn ? tenantProfile?.logo_url : publicTenant.logo_url;
  const rawLogo =
    tenantLogo ||
    adminLogo ||
    (userLoggedIn ? organization?.logo : null) ||
    publicTenant.logo_url ||
    publicBranding.logo;

  const orgLogo = resolveLogoUrl(rawLogo ?? null) || "/logo-2.png";
  const isCustomLogo = Boolean(rawLogo);

  // Favicon configured in Configuration -> General settings for condensed/small sidebar
  const adminFavicon = configs["general.general.admin_logo.favicon_image"];
  const faviconUrl = resolveLogoUrl(adminFavicon ?? null);

  return {
    logoLight: orgLogo,
    logoDark: orgLogo,
    logoSm: faviconUrl || orgLogo,
    isCustomLogo,
    orgName:
      (userLoggedIn
        ? tenantProfile?.name || organization?.name
        : publicTenant.name || publicBranding.name) ?? "MORSE CRM",
  };
};

export default useAppLogo;
