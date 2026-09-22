import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useLeadStore } from "@/store";
import API from "@/config";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ProductRow {
  product_id: string;
  product_name: string;
  quantity: string;
  price: string;
}

const TABS = [
  { id: "lead-details", label: "Lead Details" },
  { id: "contact-person", label: "Contact Person" },
  { id: "products", label: "Products" },
  { id: "custom-attributes", label: "Custom Attributes" },
];

// â”€â”€ Formatters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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


// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Tab 1 – Lead Details
  const [details, setDetails] = useState({
    title: "",
    description: "",
    lead_value: "",
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
    name: "", email: "", phone: "", organization_id: "",
  });

  // Tab 3 – Products
  const [products, setProducts] = useState<any[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([
    { product_id: "", product_name: "", quantity: "1", price: "0" },
  ]);

  // Tab 4 – Custom Attributes
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

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

  // â”€â”€ Tab navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // â”€â”€ Products helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addProductRow = () =>
    setProductRows((rows) => [
      ...rows,
      { product_id: "", product_name: "", quantity: "1", price: "0" },
    ]);

  const removeProductRow = (index: number) =>
    setProductRows((rows) => rows.filter((_, i) => i !== index));

  const updateProductRow = (index: number, field: keyof ProductRow, value: string) => {
    setProductRows((rows) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => String(p.id) === productId);
    if (product) {
      setProductRows((rows) => {
        const updated = [...rows];
        updated[index] = {
          product_id: String(product.id),
          product_name: product.name,
          quantity: "1",
          price: String(product.price || "0"),
        };
        return updated;
      });
    } else {
      updateProductRow(index, "product_id", productId);
    }
  };

  const totalLeadValue = productRows.reduce((sum, row) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    return sum + qty * price;
  }, 0);

  // Filtered persons for search
  const filteredPersons = personSearch
    ? persons.filter((p) =>
      p.name?.toLowerCase().includes(personSearch.toLowerCase()) ||
      (p.emails && JSON.stringify(p.emails).toLowerCase().includes(personSearch.toLowerCase()))
    )
    : persons;

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.title.trim()) {
      Swal.fire("Validation Error", "Lead Title is required", "warning");
      scrollToSection("lead-details");
      return;
    }

    setSaving(true);
    try {
      // Build products payload (only rows with a product selected)
      const validProducts = productRows
        .filter((r) => r.product_id)
        .map((r) => ({
          product_id: Number(r.product_id),
          quantity: Number(r.quantity) || 1,
          price: parseFloat(r.price) || 0,
        }));

      // Compute lead_value: prefer products total if any products selected
      const leadValue = validProducts.length > 0
        ? totalLeadValue
        : details.lead_value
          ? Number(details.lead_value)
          : undefined;

      const payload: any = {
        title: details.title.trim(),
        description: details.description || undefined,
        lead_value: leadValue,
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
        payload.person = {
          name: newPerson.name.trim(),
          email: newPerson.email.trim() || undefined,
          phone: newPerson.phone.trim() || undefined,
          organization_id: newPerson.organization_id ? Number(newPerson.organization_id) : undefined,
        };
      }

      await addLead(payload);
      navigate("/leads");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create lead", "error");
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Input classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inputCls =
    "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1";

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="sticky top-[60px] z-50 flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 shadow-sm">
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
            {saving ? "Savingâ€¦" : "Save Lead"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* â”€â”€ Tab Bar â”€â”€ */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? "text-[#0088cc] border-[#0088cc]"
                  : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-white hover:border-gray-300"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-8 px-6 py-6">
          {/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
              Section 1 â€” LEAD DETAILS
          â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
          <div
            id="lead-details"
            ref={(el) => { sectionRefs.current["lead-details"] = el; }}
            className="flex flex-col gap-4"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Lead Details</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the basic information about this lead.</p>
            </div>
            <div className="w-full md:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <label className={labelCls}>Title *</label>
                <input
                  type="text"
                  required
                  value={details.title}
                  onChange={(e) => setDetails({ ...details, title: e.target.value })}
                  placeholder="e.g. Enterprise Solution Deal"
                  className={inputCls}
                />
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
                  placeholder="Opportunity detailsâ€¦"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
              Section 2 â€” CONTACT PERSON
          â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
          <div
            id="contact-person"
            ref={(el) => { sectionRefs.current["contact-person"] = el; }}
            className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Contact Person</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search for an existing contact or add a new one.
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

            <div className="w-full md:w-1/2">
              {personMode === "existing" ? (
                <div className="flex flex-col gap-3">
                  {/* Search box */}
                  <div>
                    <label className={labelCls}>Search Contact</label>
                    <input
                      type="text"
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                      placeholder="Search by name or emailâ€¦"
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
                      <span>âœ“</span>
                      <span>{persons.find((p) => String(p.id) === personId)?.name} selected</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Name *</label>
                    <input
                      type="text"
                      value={newPerson.name}
                      onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email"
                      value={newPerson.email}
                      onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                      placeholder="work@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      type="tel"
                      value={newPerson.phone}
                      onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                      placeholder="+1 555-000-0000"
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Organization</label>
                    <select
                      value={newPerson.organization_id}
                      onChange={(e) => setNewPerson({ ...newPerson, organization_id: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Select Organization</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
              Section 3 â€” PRODUCTS
          â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â” */}
          <div
            id="products"
            ref={(el) => { sectionRefs.current["products"] = el; }}
            className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-gray-700"
          >
            <div>
              <p className="text-base font-semibold text-gray-800 dark:text-white">Products</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add products associated with this lead. The lead value will be auto-computed.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                    <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 rounded-tl-lg">Product Name</th>
                    <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center w-28">Quantity</th>
                    <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center w-32">Price</th>
                    <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center w-32">Amount</th>
                    <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-300 text-center w-16 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {productRows.map((row, idx) => {
                    const qty = parseFloat(row.quantity) || 0;
                    const price = parseFloat(row.price) || 0;
                    const amount = qty * price;

                    return (
                      <tr key={idx}>
                        {/* Product dropdown */}
                        <td className="px-3 py-2">
                          <select
                            value={row.product_id}
                            onChange={(e) => selectProduct(idx, e.target.value)}
                            className={inputCls}
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        {/* Quantity */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onChange={(e) => updateProductRow(idx, "quantity", e.target.value)}
                            className={`${inputCls} text-center`}
                          />
                        </td>
                        {/* Price */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price}
                            onChange={(e) => updateProductRow(idx, "price", e.target.value)}
                            className={`${inputCls} text-center`}
                          />
                        </td>
                        {/* Amount (read-only) */}
                        <td className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">
                          {fmtCurrency(amount)}
                        </td>
                        {/* Delete */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeProductRow(idx)}
                            disabled={productRows.length === 1}
                            title="Remove product"
                            className="text-red-500 hover:text-red-700 disabled:opacity-30 text-lg leading-none"
                          >
                            âœ•
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total row */}
                {totalLeadValue > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Total
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-[#0088cc]">
                        {fmtCurrency(totalLeadValue)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Add More */}
            <div>
              <button
                type="button"
                onClick={addProductRow}
                className="flex items-center gap-1.5 text-sm text-[#0088cc] hover:text-[#0077b5] font-medium"
              >
                <span className="text-lg leading-none">+</span>
                Add More
              </button>
            </div>
          </div>

          {/* Section 4 — CUSTOM ATTRIBUTES */}
          <div
            id="custom-attributes"
            ref={(el) => { sectionRefs.current["custom-attributes"] = el; }}
            className="pt-4 border-t border-gray-100 dark:border-gray-700"
          >
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

