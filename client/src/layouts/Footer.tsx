import { useEffect } from "react";
import { useConfigStore } from "../store";

const Footer = () => {
  const { configs, fetchConfigs } = useConfigStore();

  useEffect(() => {
    if (Object.keys(configs).length === 0) {
      fetchConfigs();
    }
  }, [configs, fetchConfigs]);

  const showFooter = String(configs["general.settings.footer.show"] ?? "1") === "1";
  const footerLabel = configs["general.settings.footer.label"];

  if (!showFooter) return null;

  return (
    <footer className="footer h-14 flex items-center justify-center px-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <div
        className="text-center"
        dangerouslySetInnerHTML={{
          __html:
            footerLabel ||
            `© ${new Date().getFullYear()} CRM System. All rights reserved.`,
        }}
      />
    </footer>
  );
};

export default Footer;