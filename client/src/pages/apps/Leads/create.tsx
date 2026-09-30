import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  if (!person || !person.emails) return "";
  try {
    const emails = typeof person.emails === "string" ? JSON.parse(person.emails) : person.emails;
    if (Array.isArray(emails) && emails[0]?.value) {
      return emails[0].value;
    }
    if (typeof emails === "string") return emails;
  } catch (e) { }
  return "";
};

interface ContactItem {
  label: string;
  value: string;
}

const CreateLeadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramStageId = searchParams.get("lead_pipeline_stage_id") || searchParams.get("stage_id");
  const paramPipelineId = searchParams.get("lead_pipeline_id") || searchParams.get("pipeline_id");

  const {
    addLead,
    sources, types, pipelines, stages,
    fetchSources, fetchTypes, fetchPipelines, fetchStages,
  } = useLeadStore();

  const [activeTab, setActiveTab] = useState("lead-details");
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
    lead_source_id: "",
    lead_type_id: "",
    lead_pipeline_id: paramPipelineId || "",
    lead_pipeline_stage_id: paramStageId || "",
    expected_close_date: "",
  });

  // Tab 2 – Contact Person
  const [personMode, setPersonMode] = useState<"existing" | "new">("existing");
  const [persons, setPersons] = useState<any[]>([]);
  const [personSearch, setPersonSearch] = useState("");
  const [personId, setPersonId] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [newPerson, setNewPerson] = useState({
    name: "",
    emails: [{ label: "work", value: "" }] as ContactItem[],
    contact_numbers: [{ label: "work", value: "" }] as ContactItem[],
    organization_id: "",
  });

  // Tab 3 – Products
  const [products, setProducts] = useState<any[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { product_id: "", product_name: "", quantity: "1", price: "0" },
  ]);

  // Tab 4 – Custom Attributes
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSources();
    fetchTypes();
    fetchPipelines().then(() => {
      const pId = paramPipelineId;
      if (pId) {
        setDetails((d) => ({ ...d, lead_pipeline_id: pId }));
        fetchStages(Number(pId)).then(() => {
          if (paramStageId) {
            setDetails((d) => ({ ...d, lead_pipeline_stage_id: paramStageId }));
          }
        });
      } else if (paramStageId) {
        fetchStages().then(() => {
          setDetails((d) => ({ ...d, lead_pipeline_stage_id: paramStageId }));
        });
      }
    });

    API.get("/users?limit=100").then((r) => {
      if (r.data?.data) setUsers(r.data.data);
    }).catch(() => { });
    API.get("/persons?limit=100").then((r) => {
      if (r.data?.data) setPersons(r.data.data);
    }).catch(() => { });
    API.get("/organizations?limit=100").then((r) => {
      if (r.data?.data) setOrganizations(r.data.data);
    }).catch(() => { });
    API.get("/products?limit=200").then((r) => {
      if (r.data?.data) setProducts(r.data.data);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (details.lead_pipeline_id && details.lead_pipeline_id !== paramPipelineId) {
      fetchStages(Number(details.lead_pipeline_id));
      setDetails((d) => ({ ...d, lead_pipeline_stage_id: "" }));
    }
  }, [details.lead_pipeline_id]);

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Multiple Emails & Phones handlers for New Contact
  const handleAddEmailRow = () => {
    setNewPerson((prev) => ({
      ...prev,
      emails: [...prev.emails, { label: "work", value: "" }],
    }));
  };

  const handleEmailChange = (index: number, field: "label" | "value", val: string) => {
    const updated = [...newPerson.emails];
    updated[index][field] = val;
    setNewPerson((prev) => ({ ...prev, emails: updated }));
  };

  const handleRemoveEmailRow = (index: number) => {
    if (newPerson.emails.length <= 1) {
      setNewPerson((prev) => ({ ...prev, emails: [{ label: "work", value: "" }] }));
    } else {
      setNewPerson((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }));
    }
  };

  const handleAddPhoneRow = () => {
    setNewPerson((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, { label: "mobile", value: "" }],
    }));
  };

  const handlePhoneChange = (index: number, field: "label" | "value", val: string) => {
    const updated = [...newPerson.contact_numbers];
    updated[index][field] = val;
    setNewPerson((prev) => ({ ...prev, contact_numbers: updated }));
  };

  const handleRemovePhoneRow = (index: number) => {
    if (newPerson.contact_numbers.length <= 1) {
      setNewPerson((prev) => ({ ...prev, contact_numbers: [{ label: "mobile", value: "" }] }));
    } else {
      setNewPerson((prev) => ({
        ...prev,
        contact_numbers: prev.contact_numbers.filter((_, i) => i !== index),
      }));
    }
  };

  // Product row handlers
  const handleAddProductRow = () => {
    setProductRows((rows) => [
      ...rows,
      { product_id: "", product_name: "", quantity: "1", price: "0" },
    ]);
  };

  const handleRemoveProductRow = (idx: number) => {
    setProductRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleProductRowChange = (idx: number, field: keyof ProductRow, val: string) => {
    setProductRows((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: val };
      if (field === "product_id") {
        const prod = products.find((p) => String(p.id) === val);
        if (prod) {
          next[idx].product_name = prod.name || "";
          next[idx].price = String(prod.price ?? 0);
        }
      }
      return next;
    });
  };

  const totalLeadValue = productRows.reduce((sum, r) => {
    const q = parseFloat(r.quantity) || 0;
    const p = parseFloat(r.price) || 0;
    return sum + q * p;
  }, 0);

  const filteredPersons = persons.filter((p) => {
    if (!personSearch) return true;
    const q = personSearch.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const email = getPersonEmail(p).toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = leadSchema.safeParse({
      title: details.title.trim(),
      description: details.description || undefined,
      lead_value: details.lead_value ? Number(details.lead_value) : undefined,
      lead_source_id: details.lead_source_id ? Number(details.lead_source_id) : undefined,
      lead_type_id: details.lead_type_id ? Number(details.lead_type_id) : undefined,
      lead_pipeline_id: details.lead_pipeline_id ? Number(details.lead_pipeline_id) : undefined,
      lead_pipeline_stage_id: details.lead_pipeline_stage_id ? Number(details.lead_pipeline_stage_id) : undefined,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) {
          fieldErrors[String(field)] = issue.message;
        }
      });
      setErrors(fieldErrors);
      scrollToSection("lead-details");
      return;
    }

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
        user_id: details.user_id ? Number(details.user_id) : undefined,
        lead_source_id: details.lead_source_id ? Number(details.lead_source_id) : undefined,
        lead_type_id: details.lead_type_id ? Number(details.lead_type_id) : undefined,
        lead_pipeline_id: details.lead_pipeline_id ? Number(details.lead_pipeline_id) : undefined,
        lead_pipeline_stage_id: details.lead_pipeline_stage_id ? Number(details.lead_pipeline_stage_id) : undefined,
        expected_close_date: details.expected_close_date || undefined,
        products: validProducts.length > 0 ? validProducts : undefined,
        custom_attributes: customAttributes,
      };

      if (personMode === "existing" && personId) {
        payload.person_id = Number(personId);
      } else if (personMode === "new" && newPerson.name.trim()) {
        const validEmails = newPerson.emails.filter((e) => e.value.trim());
        const validPhones = newPerson.contact_numbers.filter((p) => p.value.trim());
        payload.person = {
          name: newPerson.name.trim(),
          emails: validEmails.length > 0 ? validEmails : undefined,
          contact_numbers: validPhones.length > 0 ? validPhones : undefined,
          organization_id: newPerson.organization_id ? Number(newPerson.organization_id) : undefined,
        };
      }

      const savedLead: any = await addLead(payload);
      if (savedLead?.id && selectedTagIds.length > 0) {
        await API.post("/tags/entity", {
          entity_type: "lead",
          entity_id: savedLead.id,
          tag_ids: selectedTagIds,
        }).catch(() => { });
      }
      navigate("/leads");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create lead", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="p-6 space-y-4">
      {/* Header + Tabs unified sticky card */}
      <div className="sticky top-[60px] z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              <Link to="/leads" className="text-[#0088cc] hover:underline">Leads</Link> / Create
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Create Lead</h1>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the basic information and sales ownership.</p>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  value={details.title}
                  onChange={(e) => setDetails({ ...details, title: e.target.value })}
                  placeholder="e.g. Enterprise Solution Deal"
                  className={`${inputCls} ${errors.title ? "border-red-500 focus:border-red-500" : ""
                    }`}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.title}</p>
                )}
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
                  placeholder="0.00"
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
                  placeholder="Opportunity details..."
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search for an existing contact or create a new contact with multiple emails/numbers.
              </p>
            </div>

            {/* Toggle: existing / new */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={personMode === "existing"}
                  onChange={() => setPersonMode("existing")}
                  className="accent-[#0088cc]"
                />
                <span className="text-gray-700 dark:text-gray-300">Select Existing Contact</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  checked={personMode === "new"}
                  onChange={() => setPersonMode("new")}
                  className="accent-[#0088cc]"
                />
                <span className="text-gray-700 dark:text-gray-300">Create New Contact</span>
              </label>
            </div>

            <div className="w-full md:w-2/3">
              {personMode === "existing" ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelCls}>Search Contact</label>
                    <input
                      type="text"
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Select Person *</label>
                    <select
                      value={personId}
                      onChange={(e) => setPersonId(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">-- Select Person --</option>
                      {filteredPersons.map((p) => {
                        const email = getPersonEmail(p);
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name}{email ? ` (${email})` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {personId && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <span>✓</span>
                      <span>{persons.find((p) => String(p.id) === personId)?.name} selected</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50/50 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input
                      type="text"
                      value={newPerson.name}
                      onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>

                  {/* Multiple Email Rows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Addresses</label>
                      <button
                        type="button"
                        onClick={handleAddEmailRow}
                        className="text-xs text-[#0088cc] hover:underline font-semibold flex items-center gap-1"
                      >
                        + Add Email
                      </button>
                    </div>
                    {newPerson.emails.map((em, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={em.label}
                          onChange={(e) => handleEmailChange(idx, "label", e.target.value)}
                          className="w-28 px-2.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs"
                        >
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="email"
                          value={em.value}
                          onChange={(e) => handleEmailChange(idx, "value", e.target.value)}
                          placeholder="email@example.com"
                          className={inputCls}
                        />
                        {newPerson.emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmailRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1 text-sm font-bold"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Multiple Phone Rows */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Contact Numbers</label>
                      <button
                        type="button"
                        onClick={handleAddPhoneRow}
                        className="text-xs text-[#0088cc] hover:underline font-semibold flex items-center gap-1"
                      >
                        + Add Phone
                      </button>
                    </div>
                    {newPerson.contact_numbers.map((pn, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={pn.label}
                          onChange={(e) => handlePhoneChange(idx, "label", e.target.value)}
                          className="w-28 px-2.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs"
                        >
                          <option value="mobile">Mobile</option>
                          <option value="work">Work</option>
                          <option value="home">Home</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="tel"
                          value={pn.value}
                          onChange={(e) => handlePhoneChange(idx, "value", e.target.value)}
                          placeholder="+1 234 567 890"
                          className={inputCls}
                        />
                        {newPerson.contact_numbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoneRow(idx)}
                            className="text-red-500 hover:text-red-700 p-1 text-sm font-bold"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className={labelCls}>Organization</label>
                    <select
                      value={newPerson.organization_id}
                      onChange={(e) => setNewPerson({ ...newPerson, organization_id: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">-- None / Select Organization --</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
                    <th className="py-2.5 px-3">Product *</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-36">Price ($)</th>
                    <th className="py-2.5 px-3 w-36">Amount</th>
                    <th className="py-2.5 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row, idx) => {
                    const rowAmount = (parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0);
                    return (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3">
                          <select
                            value={row.product_id}
                            onChange={(e) => handleProductRowChange(idx, "product_id", e.target.value)}
                            className={inputCls}
                          >
                            <option value="">Select a product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleProductRowChange(idx, "quantity", e.target.value)}
                            className={inputCls}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => handleProductRowChange(idx, "price", e.target.value)}
                            className={inputCls}
                          />
                        </td>
                        <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-200">
                          {fmtCurrency(rowAmount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {productRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProductRow(idx)}
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
                onClick={handleAddProductRow}
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

export default CreateLeadPage;
