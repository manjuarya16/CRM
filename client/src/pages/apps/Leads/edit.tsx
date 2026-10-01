import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import API from "@/config";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { leadSchema } from "@/schemas";
import { TagPicker } from "@/components/TagPicker";
import { ProductRow } from "@/interface";

const TABS = [
  { id: "lead-details", label: "Lead Details" },
  { id: "contact-person", label: "Contact Person" },
  { id: "products", label: "Products" },
  { id: "custom-attributes", label: "Custom Attributes" },
];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const getPersonEmail = (person: any): string => {
  if (!person) return "";
  if (person.email) return person.email;
  if (!person.emails) return "";
  try {
    const emails = typeof person.emails === "string" ? JSON.parse(person.emails) : person.emails;
    if (Array.isArray(emails) && emails.length > 0) {
      const first = emails[0];
      return typeof first === "object" ? (first.value || first.email || "") : String(first);
    }
    if (typeof emails === "string") return emails;
  } catch (e) { }
  return "";
};

interface ContactItem {
  label: string;
  value: string;
}

const parseContactItems = (data: any, defaultLabel: string = "Work"): ContactItem[] => {
  if (!data) return [{ label: defaultLabel, value: "" }];
  let parsed = data;
  if (typeof data === "string") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return [{ label: defaultLabel, value: data }];
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((item: any) => {
      if (typeof item === "string") return { label: defaultLabel, value: item };
      return {
        label: item.label || defaultLabel,
        value: item.value || item.email || item.number || item.phone || "",
      };
    });
  }
  return [{ label: defaultLabel, value: "" }];
};

const EditLeadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    fetchLeadById, updateLead,
    sources, types, pipelines, stages,
    fetchSources, fetchTypes, fetchPipelines, fetchStages,
  } = useLeadStore();

  const [activeTab, setActiveTab] = useState("lead-details");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Users for Sales Owner
  const [users, setUsers] = useState<any[]>([]);

  // Tab 1 – Lead Details
  const [details, setDetails] = useState({
    title: "",
    description: "",
    lead_value: "",
    user_id: "",
    status: "true",
    lost_reason: "",
    lead_source_id: "",
    lead_type_id: "",
    lead_pipeline_id: "",
    lead_pipeline_stage_id: "",
    expected_close_date: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tab 2 – Contact Person
  const [persons, setPersons] = useState<any[]>([]);
  const [personId, setPersonId] = useState("");
  const [personName, setPersonName] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
  const [contactEmails, setContactEmails] = useState<ContactItem[]>([{ label: "Work", value: "" }]);
  const [contactPhones, setContactPhones] = useState<ContactItem[]>([{ label: "Work", value: "" }]);
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const personDropdownRef = useRef<HTMLDivElement>(null);

  // Tab 3 – Products
  const [products, setProducts] = useState<any[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { product_id: "", product_name: "", quantity: "1", price: "0" },
  ]);

  useEffect(() => {
    fetchSources();
    fetchTypes();
    fetchPipelines();
    API.get("/users?limit=200&per_page=200").then((r) => { if (r.data?.data) setUsers(r.data.data); }).catch(() => { });
    API.get("/persons?limit=500&per_page=500").then((r) => {
      if (r.data?.data) {
        const sorted = (r.data.data || []).sort((a: any, b: any) =>
          (a.name || "").localeCompare(b.name || "")
        );
        setPersons(sorted);
      }
    }).catch(() => { });
    API.get("/organizations?limit=200&per_page=200").then((r) => { if (r.data?.data) setOrganizations(r.data.data); }).catch(() => { });
    API.get("/products?limit=500&per_page=500").then((r) => { if (r.data?.data) setProducts(r.data.data); }).catch(() => { });

    if (id) {
      API.get(`/tags/entity/lead/${id}`).then((r) => {
        if (r.data?.data) setSelectedTagIds(r.data.data.map((t: any) => t.id));
      }).catch(() => { });
      setLoading(true);
      fetchLeadById(Number(id)).then((lead) => {
        if (lead) {
          setDetails({
            title: lead.title || "",
            description: lead.description || "",
            lead_value: lead.lead_value ? String(lead.lead_value) : "",
            user_id: lead.user_id ? String(lead.user_id) : "",
            status: lead.status !== false ? "true" : "false",
            lost_reason: lead.lost_reason || "",
            lead_source_id: lead.lead_source_id ? String(lead.lead_source_id) : "",
            lead_type_id: lead.lead_type_id ? String(lead.lead_type_id) : "",
            lead_pipeline_id: lead.lead_pipeline_id ? String(lead.lead_pipeline_id) : "",
            lead_pipeline_stage_id: lead.lead_pipeline_stage_id ? String(lead.lead_pipeline_stage_id) : "",
            expected_close_date: lead.expected_close_date ? lead.expected_close_date.substring(0, 10) : "",
          });
          if (lead.organization_id) {
            setOrganizationId(String(lead.organization_id));
          }
          if (lead.person_id) {
            setPersonId(String(lead.person_id));
          }
          if (lead.custom_attributes) {
            if (typeof lead.custom_attributes === "object") {
              setCustomAttributes(lead.custom_attributes);
            } else if (typeof lead.custom_attributes === "string") {
              try {
                setCustomAttributes(JSON.parse(lead.custom_attributes));
              } catch {
                setCustomAttributes({});
              }
            }
          }
          fetchStages(lead.lead_pipeline_id || undefined);
        }
        setLoading(false);
      });

      API.get(`/leads/${id}/products`).then((res) => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setProductRows(
            res.data.data.map((lp: any) => ({
              id: lp.id,
              product_id: String(lp.product_id),
              product_name: lp.product_name || "",
              quantity: String(lp.quantity || 1),
              price: String(lp.price || 0),
            }))
          );
        } else {
          setProductRows([{ product_id: "", product_name: "", quantity: "1", price: "0" }]);
        }
      }).catch(() => {
        setProductRows([{ product_id: "", product_name: "", quantity: "1", price: "0" }]);
      });
    }
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personDropdownRef.current && !personDropdownRef.current.contains(e.target as Node)) {
        setIsPersonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (personId && persons.length > 0) {
      const p = persons.find((item) => String(item.id) === String(personId));
      if (p) {
        setPersonName(p.name || "");
        setPersonSearch(p.name || "");
        setContactEmails(parseContactItems(p.emails, "Work"));
        setContactPhones(parseContactItems(p.contact_numbers, "Work"));
        if (!organizationId && p.organization_id) {
          setOrganizationId(String(p.organization_id));
        }
      }
    }
  }, [personId, persons]);

  useEffect(() => {
    if (details.lead_pipeline_id) {
      fetchStages(Number(details.lead_pipeline_id));
    }
  }, [details.lead_pipeline_id]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
    const el = sectionRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clearError = (...fields: string[]) => {
    setErrors((prev) => {
      let hasChange = false;
      const updated = { ...prev };
      fields.forEach((f) => {
        if (updated[f]) {
          delete updated[f];
          hasChange = true;
        }
      });
      return hasChange ? updated : prev;
    });
  };

  const handleSelectPerson = (p: any) => {
    setPersonId(String(p.id));
    setPersonName(p.name || "");
    setPersonSearch(p.name || "");
    setContactEmails(parseContactItems(p.emails, "Work"));
    setContactPhones(parseContactItems(p.contact_numbers, "Work"));
    if (p.organization_id) {
      setOrganizationId(String(p.organization_id));
    } else {
      setOrganizationId("");
    }
    clearError("personName", "contactEmail");
    setIsPersonDropdownOpen(false);
  };

  const handleClearPerson = () => {
    setPersonId("");
    setPersonName("");
    setPersonSearch("");
    setContactEmails([{ label: "Work", value: "" }]);
    setContactPhones([{ label: "Work", value: "" }]);
    setOrganizationId("");
  };

  const handleAddEmailRow = () => {
    setContactEmails((prev) => [...prev, { label: "Work", value: "" }]);
  };

  const handleEmailChange = (index: number, field: "label" | "value", val: string) => {
    setContactEmails((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveEmailRow = (index: number) => {
    if (contactEmails.length <= 1) {
      setContactEmails([{ label: "Work", value: "" }]);
    } else {
      setContactEmails((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddPhoneRow = () => {
    setContactPhones((prev) => [...prev, { label: "Work", value: "" }]);
  };

  const handlePhoneChange = (index: number, field: "label" | "value", val: string) => {
    const cleanVal = field === "value" ? val.replace(/[^0-9+\-\s()]/g, "") : val;
    setContactPhones((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: cleanVal };
      return updated;
    });
  };

  const handleRemovePhoneRow = (index: number) => {
    if (contactPhones.length <= 1) {
      setContactPhones([{ label: "Work", value: "" }]);
    } else {
      setContactPhones((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Products helpers
  const addProductRow = () =>
    setProductRows((rows) => [...rows, { product_id: "", product_name: "", quantity: "1", price: "0" }]);

  const removeProductRow = (index: number) => {
    setProductRows((rows) => rows.filter((_, i) => i !== index));
    clearError(`product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const updateProductRow = (index: number, field: keyof ProductRow, value: string) => {
    setProductRows((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    clearError(`product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.id) === productId);
    if (product) {
      setProductRows((rows) => {
        const updated = [...rows];
        updated[index] = {
          ...updated[index],
          product_id: productId,
          product_name: product.name || "",
          price: String(product.price ?? 0),
        };
        return updated;
      });
    }
    clearError(`product_${index}`, `quantity_${index}`, `price_${index}`);
  };

  const totalLeadValue = productRows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const p = parseFloat(r.price) || 0;
    return sum + q * p;
  }, 0);

  const filteredPersons = persons.filter((p) => {
    if (!personSearch) return true;
    if (personId && personSearch === (persons.find((x) => String(x.id) === String(personId))?.name || "")) return true;
    const q = personSearch.toLowerCase().trim();
    const name = (p.name || "").toLowerCase();
    const email = getPersonEmail(p).toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Record<string, string> = {};

    if (!details.title.trim()) {
      fieldErrors.title = "Title is required";
    }

    if (!personId && !personName.trim()) {
      fieldErrors.personName = "Contact Person Name is required";
    }

    const firstEmail = contactEmails[0]?.value?.trim();
    if (!firstEmail) {
      fieldErrors.contactEmail = "Contact Person Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstEmail)) {
      fieldErrors.contactEmail = "Please enter a valid email address";
    }

    // Product rows validation
    productRows.forEach((row, idx) => {
      const hasAnyInput = row.product_id || (row.quantity && row.quantity !== "1") || (row.price && row.price !== "0") || productRows.length > 1;
      if (hasAnyInput) {
        if (!row.product_id) {
          fieldErrors[`product_${idx}`] = "Please select a product";
        }
        const qty = Number(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          fieldErrors[`quantity_${idx}`] = "Quantity must be at least 1";
        }
        const price = Number(row.price);
        if (isNaN(price) || price < 0) {
          fieldErrors[`price_${idx}`] = "Price cannot be negative";
        }
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      if (fieldErrors.title) {
        scrollToSection("lead-details");
      } else if (fieldErrors.personName || fieldErrors.contactEmail) {
        scrollToSection("contact-person");
      } else {
        scrollToSection("products");
      }
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      const validProducts = productRows
        .filter((r) => r.product_id)
        .map((r) => ({
          product_id: Number(r.product_id),
          quantity: Number(r.quantity) || 1,
          price: parseFloat(r.price) || 0,
        }));

      const leadValue = validProducts.length > 0
        ? totalLeadValue
        : details.lead_value
          ? Number(details.lead_value)
          : undefined;

      const payload: any = {
        title: details.title.trim(),
        description: details.description || undefined,
        lead_value: leadValue,
        status: details.status === "true",
        lost_reason: details.lost_reason || undefined,
        user_id: details.user_id ? Number(details.user_id) : undefined,
        lead_source_id: details.lead_source_id ? Number(details.lead_source_id) : undefined,
        lead_type_id: details.lead_type_id ? Number(details.lead_type_id) : undefined,
        lead_pipeline_id: details.lead_pipeline_id ? Number(details.lead_pipeline_id) : undefined,
        lead_pipeline_stage_id: details.lead_pipeline_stage_id ? Number(details.lead_pipeline_stage_id) : undefined,
        expected_close_date: details.expected_close_date || undefined,
        organization_id: organizationId ? Number(organizationId) : undefined,
        products: validProducts,
        custom_attributes: customAttributes,
      };

      if (personId) {
        payload.person_id = Number(personId);
      } else if (personName.trim()) {
        const validEmails = contactEmails.filter((e) => e.value.trim());
        const validPhones = contactPhones.filter((p) => p.value.trim());
        payload.person = {
          name: personName.trim(),
          emails: validEmails.length > 0 ? validEmails : undefined,
          contact_numbers: validPhones.length > 0 ? validPhones : undefined,
          organization_id: organizationId ? Number(organizationId) : undefined,
        };
      }

      await updateLead(Number(id), payload);

      if (id) {
        await API.post("/tags/entity", {
          entity_type: "lead",
          entity_id: Number(id),
          tag_ids: selectedTagIds,
        }).catch(() => { });
      }

      navigate("/leads");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update lead", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1";

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
        <p className="mt-2 text-xs text-gray-400">Loading lead details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header + Tabs unified sticky card */}
      <div className="sticky top-[60px] z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              <Link to="/leads" className="text-[#0088cc] hover:underline">Leads</Link> / Edit
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Edit Lead #{id}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/leads"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Lead"}
            </button>
          </div>
        </div>
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-2 mt-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? "text-[#0088cc] border-[#0088cc]"
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-white"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="flex flex-col gap-8 px-6 py-6">
          {/* TAB 1: Lead Details */}
          <div
            id="lead-details"
            ref={(el) => { sectionRefs.current["lead-details"] = el; }}
            className="flex flex-col gap-4"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Lead Details</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update general information and sales ownership.</p>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className={labelCls}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={details.title}
                  onChange={(e) => {
                    setDetails({ ...details, title: e.target.value });
                    clearError("title");
                  }}
                  className={`${inputCls} ${errors.title ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                />
                {errors.title && <p className="mt-1 text-xs text-red-500 font-medium">{errors.title}</p>}
              </div>

              {/* Sales Owner Dropdown */}
              <div>
                <label className={labelCls}>Sales Owner</label>
                <select
                  value={details.user_id}
                  onChange={(e) => setDetails({ ...details, user_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">-- Select Sales Owner --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead Value */}
              <div>
                <label className={labelCls}>Lead Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={details.lead_value}
                  onChange={(e) => setDetails({ ...details, lead_value: e.target.value })}
                  className={inputCls}
                />
                {totalLeadValue > 0 && (
                  <p className="text-xs text-[#0088cc] mt-1">
                    Auto from products: {fmtCurrency(totalLeadValue)}
                  </p>
                )}
              </div>

              {/* Expected Close Date */}
              <div>
                <label className={labelCls}>Expected Close Date</label>
                <input
                  type="date"
                  value={details.expected_close_date}
                  onChange={(e) => setDetails({ ...details, expected_close_date: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Lead Source */}
              <div>
                <label className={labelCls}>Lead Source</label>
                <select
                  value={details.lead_source_id}
                  onChange={(e) => setDetails({ ...details, lead_source_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Source</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Lead Type */}
              <div>
                <label className={labelCls}>Lead Type</label>
                <select
                  value={details.lead_type_id}
                  onChange={(e) => setDetails({ ...details, lead_type_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Pipeline */}
              <div>
                <label className={labelCls}>Pipeline</label>
                <select
                  value={details.lead_pipeline_id}
                  onChange={(e) => setDetails({ ...details, lead_pipeline_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Stage */}
              <div>
                <label className={labelCls}>Stage</label>
                <select
                  value={details.lead_pipeline_stage_id}
                  onChange={(e) => setDetails({ ...details, lead_pipeline_stage_id: e.target.value })}
                  className={inputCls}
                  disabled={!details.lead_pipeline_id}
                >
                  <option value="">Select Stage</option>
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className={labelCls}>Description</label>
                <textarea
                  rows={4}
                  value={details.description}
                  onChange={(e) => setDetails({ ...details, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                <label className={labelCls}>Tags</label>
                <TagPicker
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
            </div>
          </div>

          {/* TAB 2: Contact Person */}
          <div
            id="contact-person"
            ref={(el) => { sectionRefs.current["contact-person"] = el; }}
            className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Contact Person</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Information About the Contact Person</p>
            </div>

            <div className="w-full md:w-2/3 flex flex-col gap-4">
              {/* Name * Searchable Dropdown */}
              <div className="relative" ref={personDropdownRef}>
                <label className={labelCls}>
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={personSearch}
                    onFocus={() => setIsPersonDropdownOpen(true)}
                    onChange={(e) => {
                      setPersonSearch(e.target.value);
                      setPersonName(e.target.value);
                      if (personId) setPersonId("");
                      clearError("personName");
                      setIsPersonDropdownOpen(true);
                    }}
                    placeholder="Click to Add"
                    className={`${inputCls} pr-8 ${errors.personName ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  />
                  {personSearch ? (
                    <button
                      type="button"
                      onClick={handleClearPerson}
                      className="absolute right-3 text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  ) : (
                    <span className="absolute right-3 text-gray-400 pointer-events-none text-xs">▼</span>
                  )}
                </div>
                {errors.personName && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.personName}</p>
                )}

                {/* Dropdown popup */}
                {isPersonDropdownOpen && (
                  <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {filteredPersons.length > 0 ? (
                      filteredPersons.map((p) => {
                        const email = getPersonEmail(p);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPerson(p)}
                            className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex flex-col border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                          >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                            {email && <span className="text-xs text-gray-500 dark:text-gray-400">{email}</span>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        No contacts found. Type a name to create a new contact.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email * */}
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>
                  Email <span className="text-red-500">*</span>
                </label>
                {contactEmails.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className={`flex-1 flex border rounded-lg overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-1 ${
                      errors.contactEmail ? "border-red-500 focus-within:ring-red-500" : "border-gray-300 dark:border-gray-600 focus-within:ring-[#0088cc]"
                    }`}>
                      <input
                        type="email"
                        value={em.value}
                        onChange={(e) => {
                          handleEmailChange(idx, "value", e.target.value);
                          clearError("contactEmail");
                        }}
                        placeholder=""
                        className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none dark:text-gray-200"
                      />
                      <select
                        value={em.label}
                        onChange={(e) => handleEmailChange(idx, "label", e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      >
                        <option value="Work">Work</option>
                        <option value="Home">Home</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {contactEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmailRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1 text-base font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {errors.contactEmail && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.contactEmail}</p>
                )}
                <button
                  type="button"
                  onClick={handleAddEmailRow}
                  className="self-start text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1 mt-0.5"
                >
                  + Add More
                </button>
              </div>

              {/* Contact Number */}
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Contact Number</label>
                {contactPhones.map((pn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-1 focus-within:ring-[#0088cc]">
                      <input
                        type="tel"
                        value={pn.value}
                        onChange={(e) => handlePhoneChange(idx, "value", e.target.value)}
                        placeholder=""
                        className="w-full px-3 py-2 bg-transparent text-sm focus:outline-none dark:text-gray-200"
                      />
                      <select
                        value={pn.label}
                        onChange={(e) => handlePhoneChange(idx, "label", e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
                      >
                        <option value="Work">Work</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Home">Home</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {contactPhones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoneRow(idx)}
                        className="text-red-500 hover:text-red-700 p-1 text-base font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddPhoneRow}
                  className="self-start text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1 mt-0.5"
                >
                  + Add More
                </button>
              </div>

              {/* Organization */}
              <div>
                <label className={labelCls}>Organization</label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Click to add</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TAB 3: Products */}
          <div
            id="products"
            ref={(el) => { sectionRefs.current["products"] = el; }}
            className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Products</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Attach products to this lead to automatically calculate the total deal value.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2.5 px-3">
                      Product <span className="text-red-500">*</span>
                    </th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-36">Price ($)</th>
                    <th className="py-2.5 px-3 w-36">Amount</th>
                    <th className="py-2.5 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, index) => {
                    const rowAmount = (parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0);
                    const prodErr = errors[`product_${index}`];
                    const qtyErr = errors[`quantity_${index}`];
                    const priceErr = errors[`price_${index}`];

                    return (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3 align-top">
                          <select
                            value={row.product_id}
                            onChange={(e) => selectProduct(index, e.target.value)}
                            className={`${inputCls} ${prodErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                          >
                            <option value="">Select a product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </option>
                            ))}
                          </select>
                          {prodErr && <p className="mt-1 text-xs text-red-500 font-medium">{prodErr}</p>}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateProductRow(index, "quantity", e.target.value)}
                            className={`${inputCls} ${qtyErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                          />
                          {qtyErr && <p className="mt-1 text-xs text-red-500 font-medium">{qtyErr}</p>}
                        </td>
                        <td className="py-2 px-3 align-top">
                          <input
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => updateProductRow(index, "price", e.target.value)}
                            className={`${inputCls} ${priceErr ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                          />
                          {priceErr && <p className="mt-1 text-xs text-red-500 font-medium">{priceErr}</p>}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-gray-200 align-top pt-3">
                          {fmtCurrency(rowAmount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {productRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeProductRow(index)}
                              className="text-gray-400 hover:text-red-500 font-bold"
                            >
                              &times;
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={addProductRow}
                className="px-3 py-1.5 border border-[#0088cc] text-[#0088cc] rounded-lg text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                + Add Product
              </button>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total: </span>
                <span className="text-base font-bold text-[#0088cc]">{fmtCurrency(totalLeadValue)}</span>
              </div>
            </div>
          </div>

          {/* TAB 4: Custom Attributes */}
          <div
            id="custom-attributes"
            ref={(el) => { sectionRefs.current["custom-attributes"] = el; }}
            className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Custom Attributes</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Additional customized fields for this lead.</p>
            </div>
            <DynamicAttributeFields
              entityType="leads"
              values={customAttributes}
              onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditLeadPage;
