import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/config";
import { cleanEmailAddress, stripHtmlToText } from "@/utils/formatters";

export type MegaSearchTab =
  | "leads"
  | "quotes"
  | "products"
  | "persons"
  | "settings"
  | "configurations";

export interface SearchResultItem {
  id: number | string;
  tab: MegaSearchTab;
  title: string;
  subtitle?: string;
  meta?: string;
  url: string;
}

const TABS: {
  id: MegaSearchTab;
  label: string;
  exploreLabel: string;
  exploreUrl: string;
  icon: string;
}[] = [
  {
    id: "leads",
    label: "Leads",
    exploreLabel: "Explore all Leads",
    exploreUrl: "/leads",
    icon: "mgc_target_line",
  },
  {
    id: "quotes",
    label: "Quotes",
    exploreLabel: "Explore all Quotes",
    exploreUrl: "/quotes",
    icon: "mgc_file_check_line",
  },
  {
    id: "products",
    label: "Products",
    exploreLabel: "Explore all Products",
    exploreUrl: "/products",
    icon: "mgc_box_3_line",
  },
  {
    id: "persons",
    label: "Persons",
    exploreLabel: "Explore all Persons",
    exploreUrl: "/contacts/persons",
    icon: "mgc_user_3_line",
  },
  {
    id: "settings",
    label: "Settings",
    exploreLabel: "Explore all Settings",
    exploreUrl: "/settings",
    icon: "mgc_settings_3_line",
  },
  {
    id: "configurations",
    label: "Configurations",
    exploreLabel: "Explore all Configurations",
    exploreUrl: "/configuration",
    icon: "mgc_tune_line",
  },
];

// Built-in searchable Settings items
const SETTINGS_CATALOG: SearchResultItem[] = [
  {
    id: "groups",
    tab: "settings",
    title: "Groups",
    subtitle: "Settings → User Groups & Team Assignments",
    url: "/settings/groups",
  },
  {
    id: "roles",
    tab: "settings",
    title: "Roles",
    subtitle: "Settings → Role Permissions & Access Control",
    url: "/settings/roles",
  },
  {
    id: "users",
    tab: "settings",
    title: "Users",
    subtitle: "Settings → Manage CRM Users",
    url: "/settings/users",
  },
  {
    id: "access-management",
    tab: "settings",
    title: "Access Management",
    subtitle: "Settings → Module Permissions Matrix",
    url: "/settings/access-management",
  },
  {
    id: "pipelines",
    tab: "settings",
    title: "Pipelines",
    subtitle: "Settings → Lead Pipelines & Stages",
    url: "/settings/pipelines",
  },
  {
    id: "sources",
    tab: "settings",
    title: "Sources",
    subtitle: "Settings → Lead Sources",
    url: "/settings/sources",
  },
  {
    id: "types",
    tab: "settings",
    title: "Types",
    subtitle: "Settings → Lead Types",
    url: "/settings/types",
  },
  {
    id: "email-templates",
    tab: "settings",
    title: "Email Templates",
    subtitle: "Settings → Reusable Email Templates",
    url: "/settings/email-templates",
  },
  {
    id: "events",
    tab: "settings",
    title: "Events",
    subtitle: "Settings → Marketing & CRM Events",
    url: "/settings/events",
  },
  {
    id: "campaigns",
    tab: "settings",
    title: "Campaigns",
    subtitle: "Settings → Marketing Campaigns",
    url: "/settings/campaigns",
  },
  {
    id: "webhooks",
    tab: "settings",
    title: "Webhooks",
    subtitle: "Settings → Automated HTTP Webhooks",
    url: "/settings/webhooks",
  },
  {
    id: "workflows",
    tab: "settings",
    title: "Workflows",
    subtitle: "Settings → Automation Rules & Triggers",
    url: "/settings/workflows",
  },
  {
    id: "web-forms",
    tab: "settings",
    title: "Web Forms",
    subtitle: "Settings → Embeddable Lead Capture Forms",
    url: "/settings/web-forms",
  },
  {
    id: "tags",
    tab: "settings",
    title: "Tags",
    subtitle: "Settings → Color-Coded Record Tags",
    url: "/settings/tags",
  },
  {
    id: "data-transfer",
    tab: "settings",
    title: "Data Transfer",
    subtitle: "Settings → Import & Export CRM Records",
    url: "/settings/data-transfer",
  },
  {
    id: "warehouses",
    tab: "settings",
    title: "Warehouses",
    subtitle: "Settings → Inventory Warehouses",
    url: "/settings/warehouses",
  },
  {
    id: "attributes",
    tab: "settings",
    title: "Attributes",
    subtitle: "Settings → Custom Fields & Attributes",
    url: "/settings/attributes",
  },
  {
    id: "organizations",
    tab: "settings",
    title: "Organizations",
    subtitle: "Contacts → Manage Organizations",
    url: "/contacts/organizations",
  },
  {
    id: "activities",
    tab: "settings",
    title: "Activities",
    subtitle: "CRM → Calls, Meetings & Tasks",
    url: "/activities",
  },
];

// Built-in searchable Configurations items
const CONFIGURATIONS_CATALOG: SearchResultItem[] = [
  {
    id: "admin_logo",
    tab: "configurations",
    title: "Admin Logo & Favicon",
    subtitle: "Configuration → General → Admin Logo",
    url: "/configuration",
  },
  {
    id: "footer",
    tab: "configurations",
    title: "Footer Settings",
    subtitle: "Configuration → Settings → Footer",
    url: "/configuration",
  },
  {
    id: "menu_color",
    tab: "configurations",
    title: "Brand & Menu Color",
    subtitle: "Configuration → Settings → Brand & Menu Color",
    url: "/configuration",
  },
  {
    id: "dashboard_settings",
    tab: "configurations",
    title: "Dashboard Settings",
    subtitle: "Configuration → Settings → Dashboard Settings",
    url: "/configuration",
  },
  {
    id: "menu_labels",
    tab: "configurations",
    title: "Menu Labels",
    subtitle: "Configuration → Settings → Customize Sidebar Labels",
    url: "/configuration",
  },
  {
    id: "magic_ai",
    tab: "configurations",
    title: "Magic AI & Doc Generation",
    subtitle: "Configuration → General → Magic AI Settings",
    url: "/configuration",
  },
  {
    id: "whatsapp",
    tab: "configurations",
    title: "WhatsApp Cloud API Settings",
    subtitle: "Configuration → General → WhatsApp Settings",
    url: "/configuration",
  },
  {
    id: "smtp",
    tab: "configurations",
    title: "SMTP Email Settings",
    subtitle: "Configuration → Email Settings → Outgoing SMTP",
    url: "/configuration",
  },
  {
    id: "imap",
    tab: "configurations",
    title: "IMAP Email Settings",
    subtitle: "Configuration → Email Settings → Incoming IMAP",
    url: "/configuration",
  },
];

const RECENT_STORAGE_KEY = "crm_mega_search_recent_v2";
const MAX_RECENT_ITEMS = 6;

const formatCurrency = (val: any): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (!Number.isFinite(num)) return "";
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const extractPersonEmail = (emails: any): string => {
  if (!emails) return "";
  try {
    const parsed = typeof emails === "string" ? JSON.parse(emails) : emails;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      const raw = typeof first === "string" ? first : first?.value || "";
      return cleanEmailAddress(raw);
    }
  } catch {
    if (typeof emails === "string") return cleanEmailAddress(emails);
  }
  return "";
};

const extractPersonPhone = (phones: any): string => {
  if (!phones) return "";
  try {
    const parsed = typeof phones === "string" ? JSON.parse(phones) : phones;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      return (typeof first === "string" ? first : first?.value || "").trim();
    }
  } catch {
    if (typeof phones === "string") return phones.trim();
  }
  return "";
};

export const MegaSearch: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MegaSearchTab>("leads");
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [results, setResults] = useState<Record<MegaSearchTab, SearchResultItem[]>>({
    leads: [],
    quotes: [],
    products: [],
    persons: [],
    settings: [],
    configurations: [],
  });
  const [recentItems, setRecentItems] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentItems(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecent = useCallback((item: SearchResultItem) => {
    setRecentItems((prev) => {
      const filtered = prev.filter(
        (r) => !(r.tab === item.tab && String(r.id) === String(item.id))
      );
      const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  // Global shortcut: Ctrl+K / Cmd+K to focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mapRawResults = useCallback(
    (
      raw: {
        leads?: any[];
        quotes?: any[];
        products?: any[];
        contacts?: any[];
        organizations?: any[];
        activities?: any[];
      },
      searchTerm: string
    ): Record<MegaSearchTab, SearchResultItem[]> => {
      const qLower = searchTerm.toLowerCase().trim();
      const matches = (...fields: any[]) => {
        if (!qLower) return true;
        return fields.some(
          (f) =>
            f !== null &&
            f !== undefined &&
            String(f).toLowerCase().includes(qLower)
        );
      };

      const leadMatches: SearchResultItem[] = (raw.leads || [])
        .filter((l: any) =>
          matches(
            l.id,
            l.title,
            l.description,
            l.person_name,
            l.person?.name,
            l.stage_name,
            l.lead_value
          )
        )
        .slice(0, 6)
        .map((l: any) => ({
          id: l.id,
          tab: "leads",
          title: l.title || `Lead #${l.id}`,
          subtitle: [
            l.person_name || l.person?.name,
            l.stage_name,
            stripHtmlToText(l.description || "").slice(0, 50),
          ]
            .filter(Boolean)
            .join(" • "),
          meta: formatCurrency(l.lead_value),
          url: `/leads/view/${l.id}`,
        }));

      const activityMatches: SearchResultItem[] = (raw.activities || [])
        .filter((act: any) =>
          matches(act.id, act.title, act.type, act.comment, act.location)
        )
        .slice(0, 4)
        .map((act: any) => ({
          id: `act-${act.id}`,
          tab: "leads",
          title:
            act.title ||
            (act.type
              ? `${String(act.type).toUpperCase()} Activity`
              : `Activity #${act.id}`),
          subtitle: [
            act.type ? `Activity (${act.type})` : "Activity",
            stripHtmlToText(act.comment || "").slice(0, 50),
          ]
            .filter(Boolean)
            .join(" • "),
          meta: act.is_done ? "Done" : "Pending",
          url: `/activities/edit/${act.id}`,
        }));

      const leads: SearchResultItem[] = [...leadMatches, ...activityMatches].slice(0, 8);

      const quotes: SearchResultItem[] = (raw.quotes || [])
        .filter((qt: any) =>
          matches(
            qt.id,
            qt.subject,
            qt.description,
            qt.person_name,
            qt.lead_title,
            qt.grand_total
          )
        )
        .slice(0, 8)
        .map((qt: any) => ({
          id: qt.id,
          tab: "quotes",
          title: qt.subject || `Quote #${qt.id}`,
          subtitle: [qt.person_name, qt.lead_title].filter(Boolean).join(" • "),
          meta: formatCurrency(qt.grand_total),
          url: `/quotes/edit/${qt.id}`,
        }));

      const products: SearchResultItem[] = (raw.products || [])
        .filter((pr: any) =>
          matches(pr.id, pr.name, pr.sku, pr.description, pr.price)
        )
        .slice(0, 8)
        .map((pr: any) => ({
          id: pr.id,
          tab: "products",
          title: pr.name || `Product #${pr.id}`,
          subtitle: pr.sku ? `SKU: ${pr.sku}` : undefined,
          meta: formatCurrency(pr.price),
          url: `/products/edit/${pr.id}`,
        }));

      const personMatches: SearchResultItem[] = (raw.contacts || [])
        .filter((p: any) => {
          const email = extractPersonEmail(p.emails);
          const phone = extractPersonPhone(p.contact_numbers);
          return matches(
            p.id,
            p.name,
            email,
            phone,
            p.organization_name,
            p.organization?.name
          );
        })
        .slice(0, 6)
        .map((p: any) => {
          const email = extractPersonEmail(p.emails);
          const phone = extractPersonPhone(p.contact_numbers);
          return {
            id: p.id,
            tab: "persons",
            title: p.name || `Person #${p.id}`,
            subtitle: [email, phone, p.organization_name || p.organization?.name]
              .filter(Boolean)
              .join(" • "),
            url: `/contacts/persons/view/${p.id}`,
          };
        });

      const orgMatches: SearchResultItem[] = (raw.organizations || [])
        .filter((o: any) => matches(o.id, o.name))
        .slice(0, 4)
        .map((o: any) => ({
          id: `org-${o.id}`,
          tab: "persons",
          title: o.name || `Organization #${o.id}`,
          subtitle: "Organization",
          url: `/contacts/organizations/edit/${o.id}`,
        }));

      const persons: SearchResultItem[] = [...personMatches, ...orgMatches].slice(0, 8);

      const settings = SETTINGS_CATALOG.filter((item) =>
        matches(item.title, item.subtitle)
      );

      const configurations = CONFIGURATIONS_CATALOG.filter((item) =>
        matches(item.title, item.subtitle)
      );

      return {
        leads,
        quotes,
        products,
        persons,
        settings,
        configurations,
      };
    },
    []
  );

  // Instant search while typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({
        leads: [],
        quotes: [],
        products: [],
        persons: [],
        settings: [],
        configurations: [],
      });
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        try {
          const res = await API.get("/search", {
            params: { q: trimmed, limit: 8 },
          });
          if (!cancelled && res.data?.success && res.data?.data) {
            const mapped = mapRawResults(res.data.data, trimmed);
            setResults(mapped);
            setActiveIndex(-1);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to parallel endpoints below
        }

        const [
          leadsRes,
          quotesRes,
          productsRes,
          personsRes,
          orgsRes,
          activitiesRes,
        ] = await Promise.allSettled([
          API.get("/leads", {
            params: { search: trimmed, page: 1, limit: 10 },
          }),
          API.get("/quotes", {
            params: { search: trimmed, page: 1, limit: 10 },
          }),
          API.get("/products", {
            params: { search: trimmed, page: 1, limit: 10 },
          }),
          API.get("/persons", {
            params: { search: trimmed, page: 1, per_page: 10 },
          }),
          API.get("/organizations", {
            params: { search: trimmed, page: 1, per_page: 10 },
          }),
          API.get("/activities", {
            params: { search: trimmed, page: 1, limit: 15 },
          }),
        ]);

        if (cancelled) return;

        const extractRows = (r: PromiseSettledResult<any>) => {
          if (r.status !== "fulfilled") return [];
          const d = r.value?.data;
          if (Array.isArray(d?.data)) return d.data;
          if (Array.isArray(d?.rows)) return d.rows;
          if (Array.isArray(d)) return d;
          return [];
        };

        const mapped = mapRawResults(
          {
            leads: extractRows(leadsRes),
            quotes: extractRows(quotesRes),
            products: extractRows(productsRes),
            contacts: extractRows(personsRes),
            organizations: extractRows(orgsRes),
            activities: extractRows(activitiesRes),
          },
          trimmed
        );

        setResults(mapped);
        setActiveIndex(-1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, mapRawResults]);

  const currentTabConfig = useMemo(
    () => TABS.find((t) => t.id === activeTab) || TABS[0],
    [activeTab]
  );

  const currentTabItems = useMemo(() => {
    if (query.trim()) {
      return results[activeTab] || [];
    }
    return recentItems.filter((r) => r.tab === activeTab);
  }, [query, results, activeTab, recentItems]);

  const handleSelectItem = (item: SearchResultItem) => {
    saveRecent(item);
    setIsOpen(false);
    navigate(item.url);
  };

  const handleExploreAll = () => {
    setIsOpen(false);
    navigate(currentTabConfig.exploreUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (currentTabItems.length > 0) {
        setActiveIndex((prev) =>
          prev < currentTabItems.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (currentTabItems.length > 0) {
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : currentTabItems.length - 1
        );
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && currentTabItems[activeIndex]) {
        handleSelectItem(currentTabItems[activeIndex]);
      } else if (currentTabItems.length > 0) {
        handleSelectItem(currentTabItems[0]);
      } else {
        handleExploreAll();
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {/* Search Bar Input */}
      <div className="relative flex items-center">
        <i className="mgc_search_line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-base sm:text-lg pointer-events-none"></i>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Mega Search"
          className="w-full pl-9 sm:pl-10 pr-8 sm:pr-10 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full text-xs sm:text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc] shadow-sm transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <i className="mgc_close_line text-sm"></i>
          </button>
        )}
      </div>

      {/* Krayin-Style Tabbed Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Horizontal Tabs: Leads | Quotes | Products | Persons | Settings | Configurations */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar bg-white dark:bg-gray-800">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = query.trim() ? results[tab.id]?.length || 0 : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setActiveIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className={`relative px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    isActive
                      ? "border-[#0088cc] text-gray-800 dark:text-white font-semibold"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  {query.trim() !== "" && count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-blue-50 dark:bg-blue-900/50 text-[#0088cc] dark:text-blue-300 font-semibold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Results Area */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
            {loading && query.trim() !== "" ? (
              <div className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin" />
                Searching {currentTabConfig.label}...
              </div>
            ) : currentTabItems.length > 0 ? (
              <div className="py-1">
                {!query.trim() && (
                  <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Recent {currentTabConfig.label}
                  </div>
                )}
                {currentTabItems.map((item, idx) => {
                  const isHighlighted = idx === activeIndex;
                  return (
                    <div
                      key={`${item.tab}-${item.id}`}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        isHighlighted
                          ? "bg-blue-50/80 dark:bg-gray-700/70"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      {item.meta && (
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
                          {item.meta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Bottom "Explore all <Tab>" Link (matches screenshot) */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={handleExploreAll}
                className="text-xs sm:text-sm font-semibold text-[#0088cc] hover:underline cursor-pointer"
              >
                {currentTabConfig.exploreLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MegaSearch;
