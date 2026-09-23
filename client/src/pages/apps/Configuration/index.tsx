import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getConfigurations, saveConfigurations, uploadConfigImage, testSmtpConnection } from "@/services/configService";
import { useConfigStore } from "@/store";
import { SERVER_URL } from "@/config";

const resolveImageUrl = (url: string | null): string => {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SERVER_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

interface NavItem {
  id: string;
  key: string;
  title: string;
  icon: string;
  subItems?: { id: string; key: string; title: string }[];
}

// ── Reusable Toggle Switch ───────────────────────────────────────────────────
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 mt-0.5 ${
        checked ? "bg-[#0088cc]" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
    {(label || hint) && (
      <div>
        {label && <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</p>}
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>}
      </div>
    )}
  </div>
);

// ── Nav Structure ────────────────────────────────────────────────────────────
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
          { id: "menu_labels", key: "general.settings.menu", title: "Menu Labels" },
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
        id: "smtp",
        key: "email.smtp",
        title: "SMTP Settings",
        icon: "mgc_send_line",
        subItems: [
          { id: "smtp_account", key: "email.smtp.account", title: "SMTP Configuration" },
        ],
      },
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

// ── Menu label entries (Krayin general.settings.menu.*) ──────────────────────
const MENU_LABEL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "dashboard", label: "Dashboard", placeholder: "Dashboard" },
  { key: "leads", label: "Leads", placeholder: "Leads" },
  { key: "quotes", label: "Quotes", placeholder: "Quotes" },
  { key: "mail", label: "Mail", placeholder: "Mail" },
  { key: "mail.inbox", label: "Mail → Inbox", placeholder: "Inbox" },
  { key: "mail.draft", label: "Mail → Draft", placeholder: "Draft" },
  { key: "mail.outbox", label: "Mail → Outbox", placeholder: "Outbox" },
  { key: "mail.sent", label: "Mail → Sent", placeholder: "Sent" },
  { key: "mail.trash", label: "Mail → Trash", placeholder: "Trash" },
  { key: "activities", label: "Activities", placeholder: "Activities" },
  { key: "contacts", label: "Contacts", placeholder: "Contacts" },
  { key: "contacts.persons", label: "Contacts → Persons", placeholder: "Persons" },
  { key: "contacts.organizations", label: "Contacts → Organizations", placeholder: "Organizations" },
  { key: "products", label: "Products", placeholder: "Products" },
  { key: "settings", label: "Settings", placeholder: "Settings" },
  { key: "configuration", label: "Configuration", placeholder: "Configuration" },
];

// ── Component ────────────────────────────────────────────────────────────────
const ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [activeSubTab, setActiveSubTab] = useState<string>("admin_logo");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingFavicon, setUploadingFavicon] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formValues, setFormValues] = useState<Record<string, any>>({
    // General — Admin Logo
    "general.general.admin_logo.logo_image": "",
    "general.general.admin_logo.favicon_image": "",
    // Settings — Footer
    "general.settings.footer.show": "1",
    "general.settings.footer.label": 'Powered by <span style="color: rgb(14, 144, 217);"><a href="http://www.krayincrm.com" target="_blank">Krayin</a></span>',
    // Settings — Brand Color
    "general.settings.menu_color.brand_color": "#0E90D9",
    // Settings — Dashboard
    "general.settings.dashboard.date_range": "1_month",
    "general.settings.dashboard.custom_days": "30",
    // Settings — Menu Labels (all empty = use system defaults)
    ...Object.fromEntries(MENU_LABEL_FIELDS.map((f) => [`general.settings.menu.${f.key}`, ""])),
    // Magic AI
    "general.magic_ai.settings.enable": "1",
    "general.magic_ai.settings.api_key": "",
    "general.magic_ai.settings.model": "openai/gpt-4o-mini",
    "general.magic_ai.settings.other_model": "",
    "general.magic_ai.doc_generation.enabled": "1",
    // Email — SMTP Configuration
    "email.smtp.account.enable": "1",
    "email.smtp.account.host": "smtp.gmail.com",
    "email.smtp.account.port": "587",
    "email.smtp.account.encryption": "tls",
    "email.smtp.account.username": "",
    "email.smtp.account.password": "",
    "email.smtp.account.from_name": "CRM Admin",
    "email.smtp.account.from_email": "",
    // Email — IMAP
    "email.imap.account.host": "imap.gmail.com",
    "email.imap.account.port": "993",
    "email.imap.account.encryption": "ssl",
    "email.imap.account.validate_cert": "1",
    "email.imap.account.username": "",
    "email.imap.account.password": "",
  });

  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [testingSmtp, setTestingSmtp] = useState<boolean>(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { fetchConfigs(); }, []);

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await testSmtpConnection({
        enabled: isOn("email.smtp.account.enable"),
        host: formValues["email.smtp.account.host"],
        port: Number(formValues["email.smtp.account.port"]) || 587,
        secure: formValues["email.smtp.account.encryption"] === "ssl",
        user: formValues["email.smtp.account.username"],
        pass: formValues["email.smtp.account.password"],
        fromName: formValues["email.smtp.account.from_name"],
        fromEmail: formValues["email.smtp.account.from_email"],
      });
      setSmtpTestResult(res);
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.response?.data?.message || "Failed to test SMTP connection.",
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await getConfigurations();
      if (res.success && res.data) {
        setFormValues((prev) => ({ ...prev, ...res.data }));
        useConfigStore.getState().setConfigs(res.data);
      }
    } catch (err) {
      console.error("Failed to load configurations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (field: string, checked: boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: checked ? "1" : "0" }));
  };

  const isOn = (field: string) => String(formValues[field]) === "1";

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fieldKey === "general.general.admin_logo.logo_image") {
      setUploadingLogo(true);
    } else {
      setUploadingFavicon(true);
    }

    try {
      const res = await uploadConfigImage(file);
      if (res.success && res.data?.url) {
        handleInputChange(fieldKey, res.data.url);
        setStatusMessage({ type: "success", text: "Image uploaded successfully! Remember to save settings." });
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to upload image." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.response?.data?.message || "Error uploading image." });
    } finally {
      setUploadingLogo(false);
      setUploadingFavicon(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await saveConfigurations(formValues);
      if (res.success) {
        setStatusMessage({ type: "success", text: "Configuration saved successfully!" });
        const updatedData = res.data || formValues;
        setFormValues((prev) => ({ ...prev, ...updatedData }));
        useConfigStore.getState().setConfigs(updatedData);
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

  const handleNavClick = (item: NavItem) => {
    setActiveTab(item.id);
    if (item.subItems && item.subItems.length > 0) {
      setActiveSubTab(item.subItems[0].id);
    }
  };

  // ── Shared input classes ───────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc]";
  const sectionHeaderCls = "space-y-4 pb-6 border-b border-gray-100 dark:border-gray-700/60";
  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300";

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">Dashboard</Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Configuration</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Configuration</h1>
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${
              statusMessage.type === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
            }`}>
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
              <><i className="mgc_loading_2_line animate-spin mr-2"></i>Saving...</>
            ) : (
              <><i className="mgc_check_line mr-1.5"></i>Save Configuration</>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Left Sidebar Nav ─────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-1">
            {CONFIG_NAV.map((navGroup) => (
              <div key={navGroup.category} className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
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
                            <i className={`mgc_chevron_${isActive ? "down" : "right"}_line text-xs text-gray-400`}></i>
                          )}
                        </button>

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

          {/* ── Right Content Panel ──────────────────────────────────────── */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ════════════════════════════════════════════════════════════
                  GENERAL → General
              ════════════════════════════════════════════════════════════ */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  {/* Admin Logo */}
                  {activeSubTab === "admin_logo" && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Admin Logo</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Configure logo image for your admin panel.</p>
                      </div>

                      <div className="space-y-6 max-w-xl">
                        {/* Logo Image */}
                        <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Logo Image</label>
                          
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp"
                                onChange={(e) => handleLogoUpload(e, "general.general.admin_logo.logo_image")}
                                className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 dark:file:border-gray-600 file:text-xs file:font-semibold file:bg-white dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600 cursor-pointer"
                              />
                              {uploadingLogo && <i className="mgc_loading_2_line animate-spin text-base text-[#0088cc]"></i>}
                            </div>

                            <p className="text-xs text-gray-500 italic">*Recommended formats: PNG, JPG, or WebP.</p>

                            {/* Current Logo Preview */}
                            {formValues["general.general.admin_logo.logo_image"] && (
                              <div className="mt-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <img
                                    src={resolveImageUrl(formValues["general.general.admin_logo.logo_image"])}
                                    alt="Admin Logo Preview"
                                    className="h-9 max-w-[120px] object-contain rounded"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                  />
                                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[220px]">
                                    {formValues["general.general.admin_logo.logo_image"]}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange("general.general.admin_logo.logo_image", "")}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Favicon Image */}
                        <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Favicon Image</label>
                          
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept="image/x-icon, image/png, image/jpeg, image/jpg, image/webp, image/ico"
                                onChange={(e) => handleLogoUpload(e, "general.general.admin_logo.favicon_image")}
                                className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 dark:file:border-gray-600 file:text-xs file:font-semibold file:bg-white dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600 cursor-pointer"
                              />
                              {uploadingFavicon && <i className="mgc_loading_2_line animate-spin text-base text-[#0088cc]"></i>}
                            </div>

                            <p className="text-xs text-gray-500 italic">*Recommended formats: ICO, PNG, or WebP.</p>

                            {/* Current Favicon Preview */}
                            {formValues["general.general.admin_logo.favicon_image"] && (
                              <div className="mt-2 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <img
                                    src={resolveImageUrl(formValues["general.general.admin_logo.favicon_image"])}
                                    alt="Favicon Preview"
                                    className="h-6 w-6 object-contain rounded"
                                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                                  />
                                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[220px]">
                                    {formValues["general.general.admin_logo.favicon_image"]}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleInputChange("general.general.admin_logo.favicon_image", "")}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 space-y-1">
                          <p className="font-semibold">NOTE:</p>
                          <p>These settings will be reflected throughout the CRM interface, making the system more user-friendly and visually aligned with your brand.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  GENERAL → Settings
              ════════════════════════════════════════════════════════════ */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Footer */}
                  {activeSubTab === "footer" && (
                    <div className={sectionHeaderCls}>
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Footer Configuration</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Toggle and customize CRM footer credit text.</p>
                      </div>
                      <div className="space-y-4 max-w-xl">
                        <ToggleSwitch
                          checked={isOn("general.settings.footer.show")}
                          onChange={(v) => handleToggle("general.settings.footer.show", v)}
                          label="Show Footer"
                          hint="Display the powered-by credit line at the bottom of the CRM."
                        />

                        {isOn("general.settings.footer.show") && (
                          <div className="space-y-1.5">
                            <label className={labelCls}>Powered By Text</label>
                            <textarea
                              rows={3}
                              value={formValues["general.settings.footer.label"] || ""}
                              onChange={(e) => handleInputChange("general.settings.footer.label", e.target.value)}
                              className={inputCls}
                              placeholder='Powered by <a href="...">Krayin</a>'
                            />
                            <p className="text-[10px] text-gray-400">HTML is supported.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Brand Color */}
                  {activeSubTab === "menu_color" && (
                    <div className={sectionHeaderCls}>
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Brand & Menu Color</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Customize global accent brand theme color.</p>
                      </div>
                      <div className="flex items-center space-x-3 max-w-sm">
                        <input
                          type="color"
                          value={formValues["general.settings.menu_color.brand_color"] || "#0E90D9"}
                          onChange={(e) => handleInputChange("general.settings.menu_color.brand_color", e.target.value)}
                          className="h-9 w-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formValues["general.settings.menu_color.brand_color"] || "#0E90D9"}
                          onChange={(e) => handleInputChange("general.settings.menu_color.brand_color", e.target.value)}
                          className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          placeholder="#0E90D9"
                        />
                      </div>
                    </div>
                  )}

                  {/* Dashboard Settings */}
                  {activeSubTab === "dashboard" && (
                    <div className={sectionHeaderCls}>
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Dashboard Preferences</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Set default metrics date range for dashboard reporting.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                        <div className="space-y-1.5">
                          <label className={labelCls}>Default Date Range</label>
                          <select
                            value={formValues["general.settings.dashboard.date_range"] || "1_month"}
                            onChange={(e) => handleInputChange("general.settings.dashboard.date_range", e.target.value)}
                            className={inputCls}
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
                            <label className={labelCls}>Custom Days</label>
                            <input
                              type="number"
                              min={1}
                              value={formValues["general.settings.dashboard.custom_days"] || "30"}
                              onChange={(e) => handleInputChange("general.settings.dashboard.custom_days", e.target.value)}
                              className={inputCls}
                            />
                            <p className="text-[10px] text-gray-400">Number of days to look back on the dashboard.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Menu Labels */}
                  {activeSubTab === "menu_labels" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Menu Labels</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Customize the sidebar menu item labels shown to users. Leave blank to use the system default name.
                          Maximum 20 characters each.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {MENU_LABEL_FIELDS.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <label className={labelCls}>{field.label}</label>
                            <input
                              type="text"
                              maxLength={20}
                              value={formValues[`general.settings.menu.${field.key}`] || ""}
                              onChange={(e) =>
                                handleInputChange(`general.settings.menu.${field.key}`, e.target.value)
                              }
                              placeholder={field.placeholder}
                              className={inputCls}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400">
                        ⚠ Menu label changes are stored and take effect after the next app reload.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  GENERAL → Magic AI
              ════════════════════════════════════════════════════════════ */}
              {activeTab === "magic_ai" && (
                <div className="space-y-6">
                  {/* Magic AI Settings */}
                  {activeSubTab === "magic_ai_settings" && (
                    <div className={sectionHeaderCls}>
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <i className="mgc_magic_2_line text-[#0088cc]"></i>
                          Magic AI Settings
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Configure LLM engine, API key and models for automated CRM insights.
                        </p>
                      </div>

                      <div className="space-y-5 max-w-xl">
                        <ToggleSwitch
                          checked={isOn("general.magic_ai.settings.enable")}
                          onChange={(v) => handleToggle("general.magic_ai.settings.enable", v)}
                          label="Enable Magic AI"
                          hint="Activate AI-powered features including lead suggestions and document generation."
                        />

                        {isOn("general.magic_ai.settings.enable") && (
                          <>
                            <div className="space-y-1.5">
                              <label className={labelCls}>API Key</label>
                              <input
                                type="password"
                                value={formValues["general.magic_ai.settings.api_key"] || ""}
                                onChange={(e) =>
                                  handleInputChange("general.magic_ai.settings.api_key", e.target.value)
                                }
                                placeholder="sk-..."
                                className={inputCls}
                              />
                              <p className="text-[10px] text-gray-400">
                                Your OpenRouter / OpenAI API key. Required when Magic AI is enabled.
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <label className={labelCls}>LLM Model</label>
                              <select
                                value={formValues["general.magic_ai.settings.model"] || "openai/gpt-4o-mini"}
                                onChange={(e) =>
                                  handleInputChange("general.magic_ai.settings.model", e.target.value)
                                }
                                className={inputCls}
                              >
                                <option value="openai/chatgpt-4o-latest">OpenAI ChatGPT-4o (Latest)</option>
                                <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                                <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash</option>
                                <option value="deepseek/deepseek-r1-distill-llama-8b">DeepSeek R1 (Llama 8B)</option>
                                <option value="meta-llama/llama-3.2-3b-instruct">Meta Llama 3.2 3B</option>
                                <option value="x-ai/grok-2-1212">xAI Grok 2</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className={labelCls}>Other Model Identifier <span className="font-normal text-gray-400">(optional)</span></label>
                              <input
                                type="text"
                                value={formValues["general.magic_ai.settings.other_model"] || ""}
                                onChange={(e) =>
                                  handleInputChange("general.magic_ai.settings.other_model", e.target.value)
                                }
                                placeholder="e.g. provider/custom-model-id"
                                className={inputCls}
                              />
                              <p className="text-[10px] text-gray-400">
                                Use any OpenRouter-compatible model slug not listed above.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Doc Generation */}
                  {activeSubTab === "doc_generation" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Document Generation AI</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Enable AI-powered lead creation from uploaded documents (PDF, DOC, images).
                          Requires Magic AI to be enabled.
                        </p>
                      </div>

                      {!isOn("general.magic_ai.settings.enable") && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                          <i className="mgc_warning_line text-sm"></i>
                          Magic AI must be enabled first (in Magic AI Settings) before Doc Generation can be used.
                        </div>
                      )}

                      <div className="max-w-md">
                        <ToggleSwitch
                          checked={isOn("general.magic_ai.doc_generation.enabled")}
                          onChange={(v) => handleToggle("general.magic_ai.doc_generation.enabled", v)}
                          label="Enable Doc Generation"
                          hint='Shows the "Upload File" button on the Leads page to create leads from documents via AI.'
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  EMAIL → SMTP
              ════════════════════════════════════════════════════════════ */}
              {activeTab === "smtp" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <i className="mgc_send_line text-[#0088cc]"></i>
                      SMTP Email Server Settings
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure dynamic SMTP credentials for outgoing emails (Gmail, SendGrid, custom mail server).
                    </p>
                  </div>

                  <div className="space-y-6 max-w-2xl">
                    <ToggleSwitch
                      checked={isOn("email.smtp.account.enable")}
                      onChange={(v) => handleToggle("email.smtp.account.enable", v)}
                      label="Enable Outgoing Email Delivery"
                      hint="When enabled, composed emails are dispatched to real recipient inboxes via SMTP."
                    />

                    {isOn("email.smtp.account.enable") && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className={labelCls}>SMTP Host</label>
                            <input
                              type="text"
                              value={formValues["email.smtp.account.host"] || ""}
                              onChange={(e) => handleInputChange("email.smtp.account.host", e.target.value)}
                              placeholder="smtp.gmail.com"
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelCls}>SMTP Port</label>
                            <input
                              type="text"
                              value={formValues["email.smtp.account.port"] || "587"}
                              onChange={(e) => handleInputChange("email.smtp.account.port", e.target.value)}
                              placeholder="587"
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label className={labelCls}>Encryption</label>
                            <select
                              value={formValues["email.smtp.account.encryption"] || "tls"}
                              onChange={(e) => handleInputChange("email.smtp.account.encryption", e.target.value)}
                              className={inputCls}
                            >
                              <option value="tls">TLS / STARTTLS (Port 587)</option>
                              <option value="ssl">SSL (Port 465)</option>
                              <option value="none">None (Port 25)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelCls}>From Sender Name</label>
                            <input
                              type="text"
                              value={formValues["email.smtp.account.from_name"] || ""}
                              onChange={(e) => handleInputChange("email.smtp.account.from_name", e.target.value)}
                              placeholder="CRM Admin"
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className={labelCls}>From Sender Email Address</label>
                            <input
                              type="text"
                              value={formValues["email.smtp.account.from_email"] || ""}
                              onChange={(e) => handleInputChange("email.smtp.account.from_email", e.target.value)}
                              placeholder="admin@yourdomain.com"
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label className={labelCls}>SMTP Username / Email</label>
                            <input
                              type="text"
                              value={formValues["email.smtp.account.username"] || ""}
                              onChange={(e) => handleInputChange("email.smtp.account.username", e.target.value)}
                              placeholder="user@gmail.com"
                              className={inputCls}
                            />
                          </div>

                          <div className="space-y-1.5 sm:col-span-2">
                            <label className={labelCls}>SMTP Password / App Password</label>
                            <div className="relative">
                              <input
                                type={showSmtpPass ? "text" : "password"}
                                value={formValues["email.smtp.account.password"] || ""}
                                onChange={(e) => handleInputChange("email.smtp.account.password", e.target.value)}
                                placeholder="••••••••••••"
                                className={`${inputCls} pr-10`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowSmtpPass(!showSmtpPass)}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                              >
                                <i className={showSmtpPass ? "mgc_eye_close_line" : "mgc_eye_line"}></i>
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400">
                              For Gmail, use a 16-character App Password (generated from Google Account Security).
                            </p>
                          </div>
                        </div>

                        {/* Test Connection Button & Result */}
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={handleTestSmtp}
                            disabled={testingSmtp}
                            className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {testingSmtp ? (
                              <><i className="mgc_loading_2_line animate-spin mr-2"></i>Testing Connection...</>
                            ) : (
                              <><i className="mgc_wifi_line mr-1.5"></i>Test SMTP Connection</>
                            )}
                          </button>

                          {smtpTestResult && (
                            <span className={`text-xs px-3 py-1.5 rounded-md font-medium ${
                              smtpTestResult.success
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            }`}>
                              {smtpTestResult.message}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════════
                  EMAIL → IMAP
              ════════════════════════════════════════════════════════════ */}
              {activeTab === "imap" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <i className="mgc_mail_line text-[#0088cc]"></i>
                      IMAP Email Account Settings
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure IMAP credentials for email synchronization and inbox integration.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    <div className="space-y-1.5">
                      <label className={labelCls}>IMAP Host</label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.host"] || ""}
                        onChange={(e) => handleInputChange("email.imap.account.host", e.target.value)}
                        placeholder="imap.gmail.com"
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelCls}>IMAP Port</label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.port"] || "993"}
                        onChange={(e) => handleInputChange("email.imap.account.port", e.target.value)}
                        placeholder="993"
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelCls}>Encryption</label>
                      <select
                        value={formValues["email.imap.account.encryption"] || "ssl"}
                        onChange={(e) => handleInputChange("email.imap.account.encryption", e.target.value)}
                        className={inputCls}
                      >
                        <option value="ssl">SSL</option>
                        <option value="tls">TLS / STARTTLS</option>
                        <option value="none">None</option>
                      </select>
                    </div>

                    <div className="space-y-2 flex flex-col justify-end pb-1">
                      <ToggleSwitch
                        checked={isOn("email.imap.account.validate_cert")}
                        onChange={(v) => handleToggle("email.imap.account.validate_cert", v)}
                        label="Validate SSL Certificate"
                        hint="Disable only for self-signed certificates."
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className={labelCls}>Username / Email</label>
                      <input
                        type="text"
                        value={formValues["email.imap.account.username"] || ""}
                        onChange={(e) => handleInputChange("email.imap.account.username", e.target.value)}
                        placeholder="user@example.com"
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className={labelCls}>Password / App Password</label>
                      <input
                        type="password"
                        value={formValues["email.imap.account.password"] || ""}
                        onChange={(e) => handleInputChange("email.imap.account.password", e.target.value)}
                        placeholder="••••••••••••"
                        className={inputCls}
                      />
                      <p className="text-[10px] text-gray-400">
                        For Gmail, use an App Password instead of your regular password.
                      </p>
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
