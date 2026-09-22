import { useEffect, useState } from "react";
import { useOrganizationStore, useAuthStore, useConfigStore } from "../store";
import commonAPI from "../helpers/api/common";
import { API_URL } from "../config";

const resolveLogoUrl = (logo: string | null): string | null => {
  if (!logo) return null;
  if (logo.startsWith("data:") || logo.startsWith("http")) return logo;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${logo.startsWith("/") ? "" : "/"}${logo}`;
};

const useAppLogo = () => {
  const { organization, getOrganization } = useOrganizationStore();
  const { userLoggedIn } = useAuthStore();
  const { configs, fetchConfigs } = useConfigStore();
  const [publicBranding, setPublicBranding] = useState<{
    name: string | null;
    logo: string | null;
  }>({ name: null, logo: null });

  useEffect(() => {
    if (Object.keys(configs).length === 0) {
      fetchConfigs();
    }
  }, [configs, fetchConfigs]);

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

  const adminLogo = configs["general.general.admin_logo.logo_image"];
  const rawLogo = userLoggedIn
    ? (organization?.logo || adminLogo)
    : (publicBranding.logo || adminLogo);
  const orgLogo = resolveLogoUrl(rawLogo ?? null);

  return {
    logoLight: orgLogo,
    logoDark: orgLogo,
    logoSm: orgLogo,
    orgName:
      (userLoggedIn ? organization?.name : publicBranding.name) ?? "CRM",
  };
};

export default useAppLogo;
