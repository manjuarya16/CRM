import { useOrganizationStore } from "../store";

const Footer = () => {
  return (
    <footer className="footer h-14 flex items-center justify-center px-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <div className="text-center">
        Powered by{" "}
        <a
          href="https://krayincrm.com"
          target="_blank"
          rel="noreferrer"
          className="text-[#0088cc] hover:underline font-medium"
        >
          Krayin
        </a>
        , an open-source project by{" "}
        <a
          href="https://webkul.com"
          target="_blank"
          rel="noreferrer"
          className="text-[#0088cc] hover:underline font-medium"
        >
          Webkul
        </a>
        .
      </div>
    </footer>
  );
};

export default Footer;