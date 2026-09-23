import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { attributeSchema, AttributeFormData } from "@/schemas/attribute.schema";
import { AttributeType, EntityType, ValidationType, AttributeFormProps } from "@/interface/attributeInterface";
import API from "@/config";
import Swal from "sweetalert2";

const ATTRIBUTE_TYPES: { label: string; value: AttributeType; desc: string }[] = [
  { label: "Text", value: "text", desc: "Single-line short text input" },
  { label: "Textarea", value: "textarea", desc: "Multi-line text for descriptions/notes" },
  { label: "Price", value: "price", desc: "Monetary amount with currency formatting" },
  { label: "Boolean", value: "boolean", desc: "Yes/No boolean toggle switch" },
  { label: "Select", value: "select", desc: "Single selection dropdown menu" },
  { label: "Multiselect", value: "multiselect", desc: "Multiple selection dropdown list" },
  { label: "Checkbox", value: "checkbox", desc: "Multiple choice checkbox options" },
  { label: "Email", value: "email", desc: "Email address input with format validation" },
  { label: "Address", value: "address", desc: "Structured address with street, city, state" },
  { label: "Phone", value: "phone", desc: "Phone number with country code validation" },
  { label: "Lookup", value: "lookup", desc: "Searchable database entity relation" },
  { label: "Date", value: "date", desc: "Calendar date picker" },
  { label: "Date Time", value: "datetime", desc: "Date and time selection picker" },
  { label: "Image", value: "image", desc: "Image file upload and preview" },
  { label: "File", value: "file", desc: "Generic file/document upload field" },
];

const ENTITY_TYPES: { label: string; value: EntityType }[] = [
  { label: "Leads", value: "leads" },
  { label: "Persons / Contacts", value: "persons" },
  { label: "Organizations", value: "organizations" },
  { label: "Products", value: "products" },
  { label: "Quotes", value: "quotes" },
  { label: "Warehouses", value: "warehouses" },
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

  // Accordion card states
  const [isGeneralOpen, setIsGeneralOpen] = useState<boolean>(true);
  const [isValidationsOpen, setIsValidationsOpen] = useState<boolean>(true);

  // Form states
  const [code, setCode] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<AttributeType>("text");
  const [entityType, setEntityType] = useState<EntityType>("leads");
  const [quickAdd, setQuickAdd] = useState<boolean>(false);
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
        setQuickAdd(!!d.quick_add);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      quick_add: quickAdd,
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
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Top Header Row with Action Button */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit Attribute" : "Create Attribute"}
        </h1>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/attributes"
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>Save Attribute</span>
          </button>
        </div>
      </div>

      {/* 2-Column Grid Layout matching Krayin CRM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Labels Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">
              Labels
            </h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Name"
                className={`w-full px-3.5 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                  errors.name
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-300 dark:border-gray-600 focus:border-primary"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Quick Add Toggle Switch */}
            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Quick Add
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuickAdd(!quickAdd)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    quickAdd ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  role="switch"
                  aria-checked={quickAdd}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      quickAdd ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {quickAdd ? "Yes" : "No"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                When enabled, this field appears in quick creation popups and lead forms.
              </p>
            </div>
          </div>

          {/* Options Repeater Card (for select / multiselect / checkbox / lookup) */}
          {REQUIRES_OPTIONS(type) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Options
                </h2>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <i className="mgc_add_line text-sm"></i>
                  <span>Add Option</span>
                </button>
              </div>

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
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3.5 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900"
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
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
        </div>

        {/* Right Sidebar Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div
              onClick={() => setIsGeneralOpen(!isGeneralOpen)}
              className="flex items-center justify-between p-4 cursor-pointer select-none bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700"
            >
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                General
              </h3>
              <i
                className={`mgc_chevron_${isGeneralOpen ? "up" : "down"}_line text-gray-500 text-lg transition-transform`}
              ></i>
            </div>

            {isGeneralOpen && (
              <div className="p-4 space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="Code"
                    disabled={isEdit}
                    className={`w-full px-3 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                      isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
                    } ${
                      errors.code
                        ? "border-red-500 focus:border-red-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-primary"
                    }`}
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AttributeType)}
                    disabled={isEdit}
                    className={`w-full px-3 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                      isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
                    } border-gray-300 dark:border-gray-600 focus:border-primary`}
                  >
                    {ATTRIBUTE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                </div>

                {/* Entity Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Entity Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as EntityType)}
                    disabled={isEdit}
                    className={`w-full px-3 py-2 rounded-md border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 ${
                      isEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800" : ""
                    } border-gray-300 dark:border-gray-600 focus:border-primary`}
                  >
                    {ENTITY_TYPES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  {errors.entity_type && <p className="text-xs text-red-500 mt-1">{errors.entity_type}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Validations Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div
              onClick={() => setIsValidationsOpen(!isValidationsOpen)}
              className="flex items-center justify-between p-4 cursor-pointer select-none bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700"
            >
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Validations
              </h3>
              <i
                className={`mgc_chevron_${isValidationsOpen ? "up" : "down"}_line text-gray-500 text-lg transition-transform`}
              ></i>
            </div>

            {isValidationsOpen && (
              <div className="p-4 space-y-4">
                {/* Is Required Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Is Required
                  </span>
                </label>

                {/* Is Unique Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isUnique}
                    onChange={(e) => setIsUnique(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Is Unique
                  </span>
                </label>

                {/* Input Validation Dropdown */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    Input Validation
                  </label>
                  <select
                    value={validation}
                    onChange={(e) => setValidation(e.target.value as ValidationType)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900"
                  >
                    {VALIDATION_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
