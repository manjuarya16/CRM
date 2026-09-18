import { Link } from "react-router-dom";
import { SettingItem, SettingCategory } from "@/interface";

const SETTINGS_SECTIONS: SettingCategory[] = [
  {
    id: "user",
    title: "User",
    subtitle: "Manage all your users and their permissions in the CRM, what they're allowed to do.",
    items: [
      {
        id: "groups",
        title: "Groups",
        description: "Add, edit or delete groups from CRM",
        icon: "mgc_group_line",
        url: "/settings/groups",
      },
      {
        id: "roles",
        title: "Roles",
        description: "Add, edit or delete roles from CRM",
        icon: "mgc_user_star_line",
        url: "/settings/roles",
      },
      {
        id: "users",
        title: "Users",
        description: "Add, edit or delete users from CRM",
        icon: "mgc_contacts_line",
        url: "/management/users",
      },
    ],
  },
  {
    id: "lead",
    title: "Lead",
    subtitle: "Manage all your leads related settings in the CRM",
    items: [
      {
        id: "pipelines",
        title: "Pipelines",
        description: "Add, edit or delete pipelines from CRM",
        icon: "mgc_git_commit_line",
        url: "/settings/pipelines",
      },
      {
        id: "sources",
        title: "Sources",
        description: "Add, edit or delete sources from CRM",
        icon: "mgc_share_forward_line",
        url: "/settings/sources",
      },
      {
        id: "types",
        title: "Types",
        description: "Add, edit or delete types from CRM",
        icon: "mgc_layout_grid_line",
        url: "/settings/types",
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    subtitle: "Manage all your inventory related settings in the CRM",
    items: [
      {
        id: "warehouses",
        title: "Warehouses",
        description: "Add, edit or delete warehouses from CRM",
        icon: "mgc_store_2_line",
        url: "/settings/warehouses",
      },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    subtitle: "Manage all your automation related settings in the CRM",
    gridCols: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    items: [
      {
        id: "attributes",
        title: "Attributes",
        description: "Add, edit or delete attributes from CRM",
        icon: "mgc_list_check_3_line",
        url: "/settings/attributes",
      },
      {
        id: "email_templates",
        title: "Email Templates",
        description: "Add, edit or delete email templates from CRM",
        icon: "mgc_mail_line",
        url: "/settings/email-templates",
      },
      {
        id: "events",
        title: "Events",
        description: "Add, edit or delete events from CRM",
        icon: "mgc_calendar_line",
        url: "/settings/events",
      },
      {
        id: "campaigns",
        title: "Campaigns",
        description: "Add, edit or delete campaigns from CRM",
        icon: "mgc_target_line",
        url: "/settings/campaigns",
      },
      {
        id: "webhooks",
        title: "Webhooks",
        description: "Add, edit or delete webhooks from CRM",
        icon: "mgc_link_2_line",
        url: "/settings/webhooks",
      },
      {
        id: "workflows",
        title: "Workflows",
        description: "Add, edit or delete workflows from CRM",
        icon: "mgc_fork_line",
        url: "/settings/workflows",
      },
      {
        id: "data_transfer",
        title: "Data Transfer",
        description: "Manage persons, products and leads data transfer related settings in the CRM",
        icon: "mgc_download_2_line",
        url: "/settings/data-transfer",
      },
    ],
  },
  {
    id: "other_settings",
    title: "Other Settings",
    subtitle: "Manage all your extra settings in the CRM",
    items: [
      {
        id: "web_forms",
        title: "Web Forms",
        description: "Add, edit or delete web forms from the CRM",
        icon: "mgc_browser_line",
        url: "/settings/web-forms",
      },
      {
        id: "tags",
        title: "Tags",
        description: "Add, edit or delete tags from CRM",
        icon: "mgc_tag_line",
        url: "/settings/tags",
      },
      {
        id: "google_contacts",
        title: "Google Contacts",
        description: "Connect a Google account and export CRM contacts to Google Contacts.",
        icon: "mgc_google_line",
        url: "/settings/google-contacts",
      },
    ],
  },
];

const SettingsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Breadcrumbs and Page Header */}
      <div>
        <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
          <Link to="/dashboard" className="text-[#0088cc] hover:underline">
            Dashboard
          </Link>{" "}
          / <span className="text-gray-700 dark:text-gray-300">Settings</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Settings
        </h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            {/* Section Header */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {section.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {section.subtitle}
              </p>
            </div>

            {/* Cards Grid */}
            <div
              className={`grid gap-4 ${
                section.gridCols
                  ? section.gridCols
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.url}
                  className="group flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/80 dark:border-gray-700 shadow-sm hover:border-[#0088cc]/50 hover:shadow-md transition-all duration-150"
                >
                  <div className="flex-shrink-0 h-11 w-11 rounded-lg bg-gray-50 dark:bg-gray-700/60 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:text-[#0088cc] group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 text-xl transition-colors">
                    <i className={item.icon}></i>
                  </div>
                  <div className="ml-3.5 min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#0088cc] transition-colors truncate">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
