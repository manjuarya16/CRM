import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getConfigurations, saveConfigurations } from "@/services/configService";

interface NavItem {
  id: string;
  key: string;
  title: string;
  icon: string;
  subItems?: { id: string; key: string; title: string }[];
}

const CONFIG_NAV: { category: string; items: NavItem[] }[] = [
  {
    category: "General Configuration",
    items: [
      {
        id: "general",
        key: "general.general",
        title: "General",
        icon: "mgc_settings_1_line",
        subItems: [
          { id: "locale_settings", key: "general.general.locale_settings", title: "Locale Settings" },
          { id: "admin_logo", key: "general.general.admin_logo", title: "Admin Logo" },
        ],
      },
      {
        id: "settings",
        key: "general.settings",
        title: "Settings",
        icon: "mgc_tune_line",
        subItems: [
          { id: "footer", key: "general.settings.footer", title: "Footer" },
          { id: "menu_color", key: "general.settings.menu_color", title: "Brand & Menu Color" },
          { id: "dashboard", key: "general.settings.dashboard", title: "Dashboard Settings" },
        ],
      },
      {
        id: "magic_ai",
        key: "general.magic_ai",
        title: "Magic AI",
        icon: "mgc_magic_2_line",
        subItems: [
          { id: "magic_ai_settings", key: "general.magic_ai.settings", title: "Magic AI Settings" },
          { id: "doc_generation", key: "general.magic_ai.doc_generation", title: "Doc Generation" },
        ],
      },
    ],
  },
  {
    category: "Email Settings",
    items: [
      {
        id: "imap",
        key: "email.imap",
        title: "IMAP Settings",
        icon: "mgc_mail_line",
        subItems: [
          { id: "imap_account", key: "email.imap.account", title: "IMAP Account" },
        ],
      },
    ],
  },
];

const ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [activeSubTab, setActiveSubTab] = useState<string>("locale_settings");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formValues, setFormValues] = useState<Record<string, any>>({
    // General - Locale
    "general.general.locale_settings.locale": "en",
    // General - Admin Logo
    "general.general.admin_logo.logo_image": "",
    "general.general.admin_logo.favicon_image": "",
    // Settings - Footer
    "general.settings.footer.show": "1",
    "general.settings.footer.label": 'Powered by <span style="color: rgb(14, 144, 217);"><a href="http://www.krayincrm.com" target="_blank">Krayin</a></span>',
    // Settings - Color
    "general.settings.menu_color.brand_color": "#0E90D9",
    // Settings - Dashboard
    "general.settings.dashboard.date_range": "1_month",
    "general.settings.dashboard.custom_days": "30",
    // Magic AI
    "general.magic_ai.settings.enable": "1",
    "general.magic_ai.settings.api_key": "",
    "general.magic_ai.settings.model": "openai/gpt-4o-mini",
    "general.magic_ai.settings.other_model": "",
    "general.magic_ai.doc_generation.enabled": "1",
    // Email - IMAP
    "email.imap.account.host": "imap.gmail.com",
    "email.imap.account.port": "993",
    "email.imap.account.encryption": "ssl",
    "email.imap.account.validate_cert": "1",
    "email.imap.account.username": "",
    "email.imap.account.password": "",
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await getConfigurations();
      if (res.success && res.data) {
        setFormValues((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (err) {
      console.error("Failed to load configurations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveConfigurations(formValues);
      if (res.success) {
        setStatusMessage({ type: "success", text: "Configuration saved successfully!" });
        if (res.data) {
          setFormValues((prev) => ({ ...prev, ...res.data }));
        }
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to save configuration." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.response?.data?.message || "An error occurred while saving." });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Switch primary nav item
  const handleNavClick = (item: NavItem) => {
    setActiveTab(item.id);
    if (item.subItems && item.subItems.length > 0) {
      setActiveSubTab(item.subItems[0].id);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header & Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Configuration</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Configuration
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <span
              className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                statusMessage.type === "success"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
              }`}
            >
              {statusMessage.text}
            </span>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077bb] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <i className="mgc_loading_2_line animate-spin mr-2"></i> Saving...
              </>
            ) : (
              <>
                <i className="mgc_check_line mr-1.5"></i> Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3 text-gray-500">
            <i className="mgc_loading_2_line animate-spin text-2xl text-[#0088cc]"></i>
            <span className="text-sm font-medium">Loading configurations...</span>
          </div>
        </div>
      ) : (
        /* Configuration Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Navigation Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {CONFIG_NAV.map((navGroup) => (
              <div key={navGroup.category} className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider px-2">
                  {navGroup.category}
                </h3>
                <div className="space-y-1">
                  {navGroup.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleNavClick(item)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-blue-50 text-[#0088cc] dark:bg-blue-950/40 dark:text-blue-400"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <i className={`${item.icon} text-lg`}></i>
                            <span>{item.title}</span>
                          </div>
                          {item.subItems && (
                            <i
                              className={`mgc_chevron_${isActive ? "down" : "right"}_line text-xs text-gray-400`}
                            ></i>
                          )}
                        </button>

                        {/* Sub-items */}
                        {isActive && item.subItems && (
                          <div className="ml-7 pl-2 border-l border-gray-200 dark:border-gray-700 space-y-1">
                            {item.subItems.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => setActiveSubTab(sub.id)}
                                className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                                  activeSubTab === sub.id
                                    ? "font-bold text-[#0088cc] dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                              >
                                {sub.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Configuration Form Content */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SECTION: GENERAL -> General */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  {/* Locale Settings */}
                  {(activeSubTab === "locale_settings" || activeSubTab === "all") && (
                    <div className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700/60">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Locale Settings
                        </h2>
                        <p className="text-xs text-gray-500">
                          Configure application primary locale and language settings.
                        </p>
                      </div>

                      <div className="max-w-md space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Locale
                        </label>
                        <select
                          value={formValues["general.general.locale_settings.locale"] || "en"}
                          onChange={(e) =>
                            handleInputChange("general.general.locale_settings.locale", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                        >
                          <option value="en">English (en)</option>
                          <option value="es">Spanish (es)</option>
                          <option value="fr">French (fr)</option>
                          <option value="de">German (de)</option>
                          <option value="hi">Hindi (hi)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Admin Logo */}
                  {(activeSubTab === "admin_logo" || activeSubTab === "all") && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Admin Logo & Branding
                        </h2>
                        <p className="text-xs text-gray-500">
                          Configure custom logos and favicon for your CRM panel.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Logo Image URL / Path
                          </label>
                          <input
                            type="text"
                            value={formValues["general.general.admin_logo.logo_image"] || ""}
                            onChange={(e) =>
                              handleInputChange("general.general.admin_logo.logo_image", e.target.value)
                            }
                            placeholder="e.g. /images/logo.png"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Favicon Image URL / Path
                          </label>
                          <input
                            type="text"
                            value={formValues["general.general.admin_logo.favicon_image"] || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "general.general.admin_logo.favicon_image",
                                e.target.value
                              )
                            }
                            placeholder="e.g. /images/favicon.ico"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: GENERAL -> Settings */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Footer */}
                  {(activeSubTab === "footer" || activeSubTab === "all") && (
                    <div className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700/60">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Footer Configuration
                        </h2>
                        <p className="text-xs text-gray-500">
                          Toggle and customize CRM footer credit text.
                        </p>
                      </div>

                      <div className="space-y-4 max-w-xl">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Show Footer
                          </label>
                          <select
                            value={formValues["general.settings.footer.show"] ?? "1"}
                            onChange={(e) =>
                              handleInputChange("general.settings.footer.show", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                          >
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Powered By Text
                          </label>
                          <textarea
                            rows={3}
                            value={formValues["general.settings.footer.label"] || ""}
                            onChange={(e) =>
                              handleInputChange("general.settings.footer.label", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Menu Color */}
                  {(activeSubTab === "menu_color" || activeSubTab === "all") && (
                    <div className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700/60">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Brand & Menu Color
                        </h2>
                        <p className="text-xs text-gray-500">
                          Customize global accent brand theme color.
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 max-w-sm">
                        <input
                          type="color"
                          value={formValues["general.settings.menu_color.brand_color"] || "#0E90D9"}
                          onChange={(e) =>
                            handleInputChange("general.settings.menu_color.brand_color", e.target.value)
                          }
                          className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formValues["general.settings.menu_color.brand_color"] || "#0E90D9"}
                          onChange={(e) =>
                            handleInputChange("general.settings.menu_color.brand_color", e.target.value)
                          }
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dashboard Settings */}
                  {(activeSubTab === "dashboard" || activeSubTab === "all") && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Dashboard Preferences
                        </h2>
                        <p className="text-xs text-gray-500">
                          Set default metrics date range for dashboard reporting.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Default Date Range
                          </label>
                          <select
                            value={formValues["general.settings.dashboard.date_range"] || "1_month"}
                            onChange={(e) =>
                              handleInputChange("general.settings.dashboard.date_range", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            <option value="1_month">1 Month</option>
                            <option value="3_months">3 Months</option>
                            <option value="9_months">9 Months</option>
                            <option value="1_year">1 Year</option>
                            <option value="2_years">2 Years</option>
                            <option value="custom">Custom Days</option>
                          </select>
                        </div>

                        {formValues["general.settings.dashboard.date_range"] === "custom" && (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Custom Days
                            </label>
                            <input
                              type="number"
                              value={formValues["general.settings.dashboard.custom_days"] || "30"}
                              onChange={(e) =>
                                handleInputChange("general.settings.dashboard.custom_days", e.target.value)
                              }
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: GENERAL -> Magic AI */}
              {activeTab === "magic_ai" && (
                <div className="space-y-6">
                  {(activeSubTab === "magic_ai_settings" || activeSubTab === "all") && (
                    <div className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700/60">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <i className="mgc_magic_2_line text-[#0088cc]"></i>
                          Magic AI Settings
                        </h2>
                        <p className="text-xs text-gray-500">
                          Configure LLM engine, API key and models for automated CRM insights.
                        </p>
                      </div>

                      <div className="space-y-4 max-w-xl">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Enable Magic AI
                          </label>
                          <select
                            value={formValues["general.magic_ai.settings.enable"] ?? "1"}
                            onChange={(e) =>
                              handleInputChange("general.magic_ai.settings.enable", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            <option value="1">Enabled</option>
                            <option value="0">Disabled</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={formValues["general.magic_ai.settings.api_key"] || ""}
                            onChange={(e) =>
                              handleInputChange("general.magic_ai.settings.api_key", e.target.value)
                            }
                            placeholder="sk-..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            LLM Model
                          </label>
                          <select
                            value={formValues["general.magic_ai.settings.model"] || "openai/gpt-4o-mini"}
                            onChange={(e) =>
                              handleInputChange("general.magic_ai.settings.model", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            <option value="openai/chatgpt-4o-latest">OpenAI ChatGPT 4o</option>
                            <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                            <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash</option>
                            <option value="deepseek/deepseek-r1-distill-llama-8b">DeepSeek R1</option>
                            <option value="meta-llama/llama-3.2-3b-instruct">Meta Llama 3.2</option>
                            <option value="x-ai/grok-2-1212">xAI Grok 2</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Other Model Identifier (Optional)
                          </label>
                          <input
                            type="text"
                            value={formValues["general.magic_ai.settings.other_model"] || ""}
                            onChange={(e) =>
                              handleInputChange("general.magic_ai.settings.other_model", e.target.value)
                            }
                            placeholder="e.g. custom-model-id"
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(activeSubTab === "doc_generation" || activeSubTab === "all") && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                          Document Generation AI
                        </h2>
                        <p className="text-xs text-gray-500">
                          Enable AI-powered quotation and proposal document creation.
                        </p>
                      </div>

                      <div className="max-w-md space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Enable Doc Generation
                        </label>
                        <select
                          value={formValues["general.magic_ai.doc_generation.enabled"] ?? "1"}
                          onChange={(e) =>
                            handleInputChange("general.magic_ai.doc_generation.enabled", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          <option value="1">Enabled</option>
                          <option value="0">Disabled</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: EMAIL -> IMAP */}
              {activeTab === "imap" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <i className="mgc_mail_line text-[#0088cc]"></i>
                      IMAP Email Account Settings
                    </h2>
                    <p className="text-xs text-gray-500">
                      Configure IMAP credentials for email synchronization and inbox integration.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        IMAP Host
                      </label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.host"] || ""}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.host", e.target.value)
                        }
                        placeholder="imap.gmail.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        IMAP Port
                      </label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.port"] || "993"}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.port", e.target.value)
                        }
                        placeholder="993"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Encryption
                      </label>
                      <select
                        value={formValues["email.imap.account.encryption"] || "ssl"}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.encryption", e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        <option value="ssl">SSL</option>
                        <option value="tls">TLS</option>
                        <option value="none">None</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Validate SSL Certificate
                      </label>
                      <select
                        value={formValues["email.imap.account.validate_cert"] ?? "1"}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.validate_cert", e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      >
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Username / Email
                      </label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.username"] || ""}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.username", e.target.value)
                        }
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Password / App Password
                      </label>
                      <input
                        type="password"
                        value={formValues["email.imap.account.password"] || ""}
                        onChange={(e) =>
                          handleInputChange("email.imap.account.password", e.target.value)
                        }
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPage;
