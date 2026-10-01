import React, { useState, useEffect } from "react";
import API from "@/config";
import { IAttribute } from "@/interface";

const BUILT_IN_FIELD_CODES = new Set([
  "title",
  "name",
  "description",
  "sku",
  "price",
  "quantity",
  "subject",
  "lead_value",
  "email",
  "emails",
  "phone",
  "contact_numbers",
  "contact_name",
  "contact_email",
  "contact_number",
  "organization_id",
  "person_id",
  "user_id",
  "lead_source_id",
  "lead_type_id",
  "lead_pipeline_id",
  "expected_close_date",
  "expired_at",
  "job_title",
  "address",
  "country",
  "state",
  "city",
  "postcode",
]);

const DEFAULT_EXCLUDE_CODES: string[] = [];

const matchOptionValue = (valToMatch: any, options: any[]): string => {
  if (valToMatch === undefined || valToMatch === null || valToMatch === "") return "";
  const str = String(valToMatch).trim();
  const strLower = str.toLowerCase();

  if (!Array.isArray(options) || options.length === 0) return str;

  // 1. Direct match by option name
  for (const opt of options) {
    const optName = typeof opt === "object" ? opt.name : String(opt);
    if (optName === str || optName.toLowerCase() === strLower) {
      return optName;
    }
  }

  // 2. Match by option id
  for (const opt of options) {
    if (typeof opt === "object" && opt.id !== undefined && opt.id !== null) {
      if (String(opt.id) === str) {
        return opt.name;
      }
    }
  }

  // 3. Match by "Option X" (e.g. Option 1 -> options[0], Option 2 -> options[1])
  const optMatch = strLower.match(/option\s*(\d+)/);
  if (optMatch) {
    const idx = parseInt(optMatch[1], 10) - 1;
    if (idx >= 0 && idx < options.length) {
      const opt = options[idx];
      return typeof opt === "object" ? opt.name : String(opt);
    }
  }

  // 4. Fallback numeric index (1-based index)
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    const opt = options[num - 1];
    return typeof opt === "object" ? opt.name : String(opt);
  }

  return str;
};

const matchMultiselectValues = (valToMatch: any, options: any[]): string[] => {
  if (valToMatch === undefined || valToMatch === null || valToMatch === "") return [];
  let rawList: string[] = [];

  if (Array.isArray(valToMatch)) {
    rawList = valToMatch.map(String);
  } else if (typeof valToMatch === "string") {
    const trimmed = valToMatch.trim();
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) rawList = parsed.map(String);
        else rawList = [String(parsed)];
      } catch {
        rawList = trimmed.split(",").map((s) => s.trim());
      }
    } else if (trimmed.includes(",")) {
      rawList = trimmed.split(",").map((s) => s.trim());
    } else {
      rawList = [trimmed];
    }
  } else {
    rawList = [String(valToMatch)];
  }

  const selectedNames: string[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const matched = matchOptionValue(item, options);
    if (matched) {
      selectedNames.push(matched);
    } else {
      selectedNames.push(item);
    }
  }
  return selectedNames;
};

const isBooleanTrue = (v: any): boolean => {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "y" || s === "t";
  }
  return false;
};

export interface DynamicAttributeFieldsProps {
  entityType: "leads" | "persons" | "organizations" | "products" | "quotes" | "warehouses";
  quickAddOnly?: boolean;
  values: Record<string, any>;
  onChange: (code: string, value: any) => void;
  errors?: Record<string, string>;
  title?: string;
  excludeCodes?: string[];
}

export const DynamicAttributeFields: React.FC<DynamicAttributeFieldsProps> = ({
  entityType,
  quickAddOnly = false,
  values,
  onChange,
  errors = {},
  title = "Custom Attributes",
  excludeCodes = DEFAULT_EXCLUDE_CODES,
}) => {
  const [attributes, setAttributes] = useState<IAttribute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const excludeKey = (excludeCodes || []).join(",");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    API.get("/attributes", {
      params: {
        entity_type: entityType,
        quick_add: quickAddOnly ? true : undefined,
      },
    })
      .then((res) => {
        if (isMounted && res.data?.data) {
          const excludeSet = new Set((excludeCodes || []).map((c) => c.toLowerCase()));
          const filtered = (res.data.data as IAttribute[]).filter(
            (attr, index, self) => {
              const codeLower = (attr.code || "").toLowerCase();
              // 1. Exclude standard built-in form field codes only if not user-defined
              if (!attr.is_user_defined && BUILT_IN_FIELD_CODES.has(codeLower)) return false;
              // 2. Exclude explicitly passed excludeCodes
              if (excludeSet.has(codeLower)) return false;
              // 3. Exclude non-user-defined system attributes if explicitly marked false
              if (attr.is_user_defined === false) return false;
              // 4. Deduplicate by code
              return self.findIndex((a) => a.code === attr.code) === index;
            }
          );
          setAttributes(filtered);
        }
      })
      .catch(() => {
        if (isMounted) setAttributes([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entityType, quickAddOnly, excludeKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span>Loading dynamic attributes for {entityType}...</span>
      </div>
    );
  }

  if (attributes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-2">
      {title && (
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
          <i className="mgc_list_check_3_line text-primary text-base"></i>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {title} ({attributes.length})
          </h4>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attributes.map((attr) => {
          const rawVal =
            values[attr.code] ??
            values[attr.code.toLowerCase()] ??
            values[attr.name] ??
            values[attr.name.toLowerCase()] ??
            "";
          const val = rawVal;
          const err = errors[attr.code];

          return (
            <div
              key={attr.id}
              className={attr.type === "textarea" ? "md:col-span-2" : "col-span-1"}
            >
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {attr.name} {attr.is_required && <span className="text-red-500">*</span>}
              </label>

              {/* Text / Price / Email / Phone / Address */}
              {["text", "price", "email", "phone", "address"].includes(attr.type) && (
                <input
                  type={
                    attr.type === "price"
                      ? "number"
                      : attr.type === "email"
                      ? "email"
                      : attr.type === "phone"
                      ? "tel"
                      : "text"
                  }
                  value={val}
                  onChange={(e) => onChange(attr.code, e.target.value)}
                  placeholder={`Enter ${attr.name.toLowerCase()}`}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-gray-200 ${
                    err
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:border-primary"
                  }`}
                />
              )}

              {/* Textarea */}
              {attr.type === "textarea" && (
                <textarea
                  rows={3}
                  value={val}
                  onChange={(e) => onChange(attr.code, e.target.value)}
                  placeholder={`Enter ${attr.name.toLowerCase()}`}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-gray-200 ${
                    err
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:border-primary"
                  }`}
                />
              )}

              {/* Select & Lookup */}
              {["select", "lookup"].includes(attr.type) && (() => {
                const currentOpt = matchOptionValue(rawVal, attr.options || []);
                return (
                  <select
                    value={currentOpt}
                    onChange={(e) => onChange(attr.code, e.target.value)}
                    className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-gray-200 ${
                      err
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-primary"
                    }`}
                  >
                    <option value="">Select {attr.name}</option>
                    {Array.isArray(attr.options) &&
                      attr.options.map((opt: any, idx: number) => {
                        const optVal = typeof opt === "object" ? opt.name : String(opt);
                        return (
                          <option key={idx} value={optVal}>
                            {optVal}
                          </option>
                        );
                      })}
                  </select>
                );
              })()}

              {/* Multiselect / Checkbox */}
              {["multiselect", "checkbox"].includes(attr.type) && (() => {
                const selectedList = matchMultiselectValues(rawVal, attr.options || []);
                return (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {Array.isArray(attr.options) &&
                      attr.options.map((opt: any, idx: number) => {
                        const optName = typeof opt === "object" ? opt.name : String(opt);
                        const isChecked = selectedList.includes(optName);

                        return (
                          <label
                            key={idx}
                            className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  onChange(attr.code, [...selectedList, optName]);
                                } else {
                                  onChange(
                                    attr.code,
                                    selectedList.filter((item) => item !== optName)
                                  );
                                }
                              }}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span>{optName}</span>
                          </label>
                        );
                      })}
                  </div>
                );
              })()}

              {/* Boolean */}
              {attr.type === "boolean" && (() => {
                const boolVal = isBooleanTrue(rawVal);
                return (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onChange(attr.code, !boolVal)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        boolVal ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          boolVal ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {boolVal ? "Yes" : "No"}
                    </span>
                  </div>
                );
              })()}

              {/* Date & DateTime */}
              {["date", "datetime"].includes(attr.type) && (
                <input
                  type={attr.type === "datetime" ? "datetime-local" : "date"}
                  value={val}
                  onChange={(e) => onChange(attr.code, e.target.value)}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-gray-200 ${
                    err
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:border-primary"
                  }`}
                />
              )}

              {/* Image Upload & Preview */}
              {attr.type === "image" && (
                <div className="space-y-2">
                  {val ? (
                    <div className="flex items-center gap-3 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <img
                        src={val}
                        alt={attr.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {typeof val === 'string' && val.startsWith('data:') ? 'Image uploaded' : String(val).split('/').pop()}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <label className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                            <span>Change Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (reader.result) {
                                      onChange(attr.code, reader.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => onChange(attr.code, "")}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (reader.result) {
                              onChange(attr.code, reader.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  )}
                </div>
              )}

              {/* File Upload & Preview */}
              {attr.type === "file" && (
                <div className="space-y-2">
                  {val ? (
                    <div className="flex items-center justify-between p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                        {typeof val === 'string' && val.startsWith('data:') ? 'File attached' : String(val).split('/').pop()}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                          <span>Change</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (reader.result) {
                                    onChange(attr.code, reader.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => onChange(attr.code, "")}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (reader.result) {
                              onChange(attr.code, reader.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    />
                  )}
                </div>
              )}

              {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
