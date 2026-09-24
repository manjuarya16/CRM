import React from "react";
import { IWebFormAttribute } from "@/interface";

interface WebFormFieldInputProps {
  attr: IWebFormAttribute;
  value: any;
  onChange: (val: any) => void;
  labelColor?: string;
  disabled?: boolean;
}

export const WebFormFieldInput: React.FC<WebFormFieldInputProps> = ({
  attr,
  value,
  onChange,
  labelColor = "#475569",
  disabled = false,
}) => {
  if (attr.is_hidden) return null;

  const rawType = (attr.attribute_type || "text").toLowerCase();

  // Normalize options array
  const formattedOptions: { label: string; value: string }[] = React.useMemo(() => {
    if (!attr.options || !Array.isArray(attr.options) || attr.options.length === 0) {
      return [];
    }
    return attr.options.map((opt: any) => {
      if (typeof opt === "string") {
        return { label: opt, value: opt };
      }
      if (typeof opt === "object" && opt !== null) {
        const val = opt.value ?? opt.name ?? opt.id ?? String(opt);
        const lbl = opt.label ?? opt.name ?? opt.value ?? String(opt);
        return { label: String(lbl), value: String(val) };
      }
      return { label: String(opt), value: String(opt) };
    });
  }, [attr.options]);

  const labelText = attr.name || attr.attribute_name || "Field";

  const renderControl = () => {
    switch (rawType) {
      case "select":
      case "dropdown":
      case "lookup": {
        return (
          <select
            required={attr.is_required}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            <option value="">{attr.placeholder || `-- Select ${labelText} --`}</option>
            {formattedOptions.map((opt, i) => (
              <option key={i} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      case "multiselect": {
        if (formattedOptions.length > 0) {
          return (
            <div className="space-y-1.5 p-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
              {formattedOptions.map((opt, i) => {
                const isChecked = Array.isArray(value) ? value.includes(opt.value) : false;
                return (
                  <label key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={(e) => {
                        const current = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) {
                          onChange([...current, opt.value]);
                        } else {
                          onChange(current.filter((v: any) => v !== opt.value));
                        }
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          );
        }
        return (
          <input
            type="text"
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter comma separated ${labelText}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "textarea": {
        return (
          <textarea
            rows={3}
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter ${labelText}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 resize-y"
          ></textarea>
        );
      }

      case "date": {
        return (
          <input
            type="date"
            required={attr.is_required}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "datetime": {
        return (
          <input
            type="datetime-local"
            required={attr.is_required}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "checkbox":
      case "boolean": {
        if (formattedOptions.length > 0) {
          return (
            <div className="space-y-1.5 p-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
              {formattedOptions.map((opt, i) => {
                const isChecked = Array.isArray(value) ? value.includes(opt.value) : false;
                return (
                  <label key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={(e) => {
                        const current = Array.isArray(value) ? [...value] : [];
                        if (e.target.checked) {
                          onChange([...current, opt.value]);
                        } else {
                          onChange(current.filter((v: any) => v !== opt.value));
                        }
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          );
        }
        return (
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <span>{attr.placeholder || "Yes"}</span>
          </label>
        );
      }

      case "number":
      case "price": {
        return (
          <input
            type="number"
            step="any"
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter ${labelText}`}
            value={value !== undefined && value !== null ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "email": {
        return (
          <input
            type="email"
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter ${labelText}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "phone": {
        return (
          <input
            type="tel"
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter ${labelText}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "url": {
        return (
          <input
            type="url"
            required={attr.is_required}
            placeholder={attr.placeholder || `https://...`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }

      case "image":
      case "file": {
        return (
          <input
            type="file"
            accept={rawType === "image" ? "image/*" : undefined}
            required={attr.is_required && !value}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange(file.name);
              }
            }}
            disabled={disabled}
            className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        );
      }

      default: {
        return (
          <input
            type="text"
            required={attr.is_required}
            placeholder={attr.placeholder || `Enter ${labelText}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          />
        );
      }
    }
  };

  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1"
        style={{ color: labelColor }}
      >
        {labelText}
        {attr.is_required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {renderControl()}
    </div>
  );
};
