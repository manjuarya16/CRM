import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { attributeSchema, AttributeFormData } from "@/schemas/attribute.schema";
import { AttributeType, EntityType, ValidationType } from "@/interface/attributeInterface";
import API from "@/config";
import Swal from "sweetalert2";

interface AttributeFormProps {
  isEdit?: boolean;
}

const ATTRIBUTE_TYPES: { label: string; value: AttributeType; icon: string; desc: string }[] = [
  { label: "Text", value: "text", icon: "mgc_text_line", desc: "Single-line short text input" },
  { label: "Textarea", value: "textarea", icon: "mgc_file_text_line", desc: "Multi-line text for descriptions/notes" },
  { label: "Price", value: "price", icon: "mgc_currency_dollar_line", desc: "Monetary amount with currency formatting" },
  { label: "Boolean", value: "boolean", icon: "mgc_toggle_right_line", desc: "Yes/No boolean toggle switch" },
  { label: "Select", value: "select", icon: "mgc_list_check_3_line", desc: "Single selection dropdown menu" },
  { label: "Multiselect", value: "multiselect", icon: "mgc_checkbox_line", desc: "Multiple selection dropdown list" },
  { label: "Checkbox", value: "checkbox", icon: "mgc_check_circle_line", desc: "Multiple choice checkbox options" },
  { label: "Email", value: "email", icon: "mgc_mail_line", desc: "Email address input with format validation" },
  { label: "Address", value: "address", icon: "mgc_map_pin_line", desc: "Structured address with street, city, state" },
  { label: "Phone", value: "phone", icon: "mgc_phone_line", desc: "Phone number with country code validation" },
  { label: "Lookup", value: "lookup", icon: "mgc_search_2_line", desc: "Searchable database entity relation" },
  { label: "Date", value: "date", icon: "mgc_calendar_line", desc: "Calendar date picker" },
  { label: "Date Time", value: "datetime", icon: "mgc_time_line", desc: "Date and time selection picker" },
  { label: "Image", value: "image", icon: "mgc_pic_line", desc: "Image file upload and preview" },
  { label: "File", value: "file", icon: "mgc_attachment_line", desc: "Generic file/document upload field" },
];

const ENTITY_TYPES: { label: string; value: EntityType; icon: string; badge: string }[] = [
  { label: "Leads", value: "leads", icon: "mgc_target_line", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  { label: "Persons / Contacts", value: "persons", icon: "mgc_user_3_line", badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { label: "Organizations", value: "organizations", icon: "mgc_building_2_line", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  { label: "Products", value: "products", icon: "mgc_box_3_line", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  { label: "Quotes", value: "quotes", icon: "mgc_file_check_line", badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  { label: "Warehouses", value: "warehouses", icon: "mgc_store_2_line", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
];

const VALIDATION_TYPES: { label: string; value: ValidationType }[] = [
  { label: "None", value: "" },
  { label: "Number / Numeric", value: "numeric" },
  { label: "Email Address", value: "email" },
  { label: "Decimal Number", value: "decimal" },
  { label: "Website URL", value: "url" },
];

const REQUIRES_OPTIONS = (type: string) => ["select", "multiselect", "checkbox", "lookup"].includes(type);

export const AttributeForm: React.FC<AttributeFormProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<AttributeType>("text");
  const [entityType, setEntityType] = useState<EntityType>("leads");
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [isUnique, setIsUnique] = useState<boolean>(false);
  const [validation, setValidation] = useState<ValidationType>("");
  const [options, setOptions] = useState<{ id?: number; name: string; sort_order?: number }[]>([
    { name: "" },
  ]);

  useEffect(() => {
    if (isEdit && id) {
      fetchAttribute();
    }
  }, [isEdit, id]);

  const fetchAttribute = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/attributes/${id}`);
      if (res.data?.data) {
        const d = res.data.data;
        setCode(d.code || "");
        setName(d.name || "");
        setType(d.type || "text");
        setEntityType(d.entity_type || "leads");
        setIsRequired(!!d.is_required);
        setIsUnique(!!d.is_unique);
        setValidation(d.validation || "");

        if (Array.isArray(d.options) && d.options.length > 0) {
          setOptions(
            d.options.map((o: any) => ({
              id: o.id,
              name: typeof o === "object" ? o.name : String(o),
              sort_order: o.sort_order || 0,
            }))
          );
        } else {
          setOptions([{ name: "" }]);
        }
      }
    } catch {
      Swal.fire("Error", "Failed to load attribute details", "error");
      navigate("/settings/attributes");
    } finally {
      setLoading(false);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && (!code || code === slugify(name))) {
      setCode(slugify(val));
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { name: "", sort_order: prev.length }]);
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formattedOptions = REQUIRES_OPTIONS(type)
      ? options
          .filter((o) => o.name.trim() !== "")
          .map((o, idx) => ({
            id: o.id,
            name: o.name.trim(),
            sort_order: idx + 1,
          }))
      : [];

    const payload: AttributeFormData = {
      code: code.trim(),
      name: name.trim(),
      type,
      entity_type: entityType,
      is_required: isRequired,
      is_unique: isUnique,
      validation: validation || "",
      options: formattedOptions,
      quick_add: false,
      is_user_defined: true,
      sort_order: 0,
    };

    const validationResult = attributeSchema.safeParse(payload);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please check the form for errors.",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit && id) {
        await API.put(`/attributes/${id}`, payload);
        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Attribute updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await API.post("/attributes", payload);
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Attribute created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate("/settings/attributes");
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to save attribute";
      Swal.fire("Error", message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <i className="mgc_information_line text-xl text-primary"></i>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            General Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
              placeholder="e.g. tax_number, custom_stage"
              disabled={isEdit}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
              } ${
                errors.code
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:border-primary"
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique slug identifier used in code/APIs (letters, numbers, and underscores).
            </p>
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Tax Number, Deal Priority"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                errors.name
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:border-primary"
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Display label that will be shown in CRM forms and data tables.
            </p>
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              disabled={isEdit}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
              } border-gray-300 dark:border-gray-600 focus:border-primary`}
            >
              {ENTITY_TYPES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select which CRM entity this custom attribute attaches to.
            </p>
            {errors.entity_type && <p className="text-xs text-red-500 mt-1">{errors.entity_type}</p>}
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AttributeType)}
              disabled={isEdit}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
              } border-gray-300 dark:border-gray-600 focus:border-primary`}
            >
              {ATTRIBUTE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.desc})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Controls the input field type and widget rendered in forms.
            </p>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>
        </div>
      </div>

      {/* Validation & Properties Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          <i className="mgc_shield_check_line text-xl text-primary"></i>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Validation & Constraints
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Is Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Is Required
            </label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isRequired"
                  checked={isRequired === true}
                  onChange={() => setIsRequired(true)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isRequired"
                  checked={isRequired === false}
                  onChange={() => setIsRequired(false)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Mandatory field when creating or saving this entity.
            </p>
          </div>

          {/* Is Unique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Is Unique
            </label>
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isUnique"
                  checked={isUnique === true}
                  onChange={() => setIsUnique(true)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isUnique"
                  checked={isUnique === false}
                  onChange={() => setIsUnique(false)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Prevents duplicate values across different records.
            </p>
          </div>

          {/* Input Validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Input Validation
            </label>
            <select
              value={validation}
              onChange={(e) => setValidation(e.target.value as ValidationType)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900"
            >
              {VALIDATION_TYPES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Applies format validation on user input (Number, Email, Decimal, URL).
            </p>
          </div>
        </div>
      </div>

      {/* Options Repeater (for select / multiselect / checkbox / lookup) */}
      {REQUIRES_OPTIONS(type) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <i className="mgc_list_ordered_line text-xl text-primary"></i>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Attribute Options
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <i className="mgc_add_line text-sm"></i>
              Add Option
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Provide the predefined selectable choices for this {type} field:
          </p>

          <div className="space-y-3">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 text-center text-xs font-bold text-gray-400">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={opt.name}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1} Name`}
                  className="flex-1 px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900"
                />
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove Option"
                  >
                    <i className="mgc_delete_2_line text-base"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          to="/settings/attributes"
          className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          <span>Save Attribute</span>
        </button>
      </div>
    </form>
  );
};
