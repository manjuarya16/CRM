import React, { useState, useEffect, useRef } from "react";

export interface LeadOption {
  id: number;
  title: string;
  product_name?: string;
  person_name?: string;
  [key: string]: any;
}

interface SearchableLeadSelectProps {
  value: number | string;
  onChange: (value: string) => void;
  leads: LeadOption[];
  placeholder?: string;
  label?: string;
  error?: string;
}

export const SearchableLeadSelect: React.FC<SearchableLeadSelectProps> = ({
  value,
  onChange,
  leads,
  placeholder = "Click to add",
  label = "Link to lead",
  error,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLead = leads.find((l) => String(l.id) === String(value));

  const formatLeadLabel = (l: LeadOption) => {
    let text = l.title || `Lead #${l.id}`;
    if (l.product_name) {
      text += ` -> ${l.product_name}`;
    } else if (l.person_name) {
      text += ` (${l.person_name})`;
    }
    return text;
  };

  const filteredLeads = leads.filter((l) => {
    const display = formatLeadLabel(l).toLowerCase();
    return display.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</label>}

      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        } rounded-lg text-xs text-left flex items-center justify-between shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 min-h-[38px] cursor-pointer`}
      >
        <span className={selectedLead ? "font-medium text-gray-900 dark:text-gray-100" : "text-gray-400"}>
          {selectedLead ? formatLeadLabel(selectedLead) : placeholder}
        </span>
        <i className={`mgc_down_line text-sm text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}></i>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          {/* List Options */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors font-medium"
            >
              -- None / Clear selection --
            </button>

            {filteredLeads.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">No leads found</div>
            ) : (
              filteredLeads.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    onChange(String(l.id));
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors rounded-md ${
                    String(value) === String(l.id)
                      ? "bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] font-semibold"
                      : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {formatLeadLabel(l)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
};
