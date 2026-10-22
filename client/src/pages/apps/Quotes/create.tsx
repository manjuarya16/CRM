import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore, useLeadStore, usePersonStore, useUserStore, useProductStore } from "@/store";
import { ITempQuoteItem, IQuoteAddress } from "@/interface";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { SearchableLeadSelect } from "@/components/SearchableLeadSelect";
import { quoteSchema } from "@/schemas";

const fmtCurrency = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CreateQuotePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlLeadId = searchParams.get("lead_id");
  const { addQuote } = useQuoteStore();

  const [persons, setPersons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  // Quote Header state
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    person_id: "",
    user_id: "",
    lead_id: "",
    expired_at: "",
    discount_percent: "0",
    tax_amount: "0",
    adjustment_amount: "0",
  });

  // Addresses
  const [billingAddress, setBillingAddress] = useState<IQuoteAddress>({
    street_address: "",
    country: "",
    state: "",
    city: "",
    postcode: "",
  });

  const [sameAsBilling, setSameAsBilling] = useState<boolean>(true);
  const [shippingAddress, setShippingAddress] = useState<IQuoteAddress>({
    street_address: "",
    country: "",
    state: "",
    city: "",
    postcode: "",
  });

  // Line items state
  const [items, setItems] = useState<ITempQuoteItem[]>([]);
  const [newItem, setNewItem] = useState({
    product_id: "",
    quantity: "1",
    price: "0",
    discount_percent: "0",
    tax_percent: "0",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLeadChange = async (leadIdStr: string) => {
    setFormData((prev) => ({ ...prev, lead_id: leadIdStr }));
    if (!leadIdStr) return;

    try {
      // 1. Fetch Lead details
      const leadData = await useLeadStore.getState().fetchLeadById(Number(leadIdStr));
      if (leadData) {
        setLeads((prev) => {
          if (!prev.some((l) => String(l.id) === String(leadData.id))) {
            return [leadData, ...prev];
          }
          return prev;
        });

        setFormData((prev) => ({
          ...prev,
          lead_id: leadIdStr,
          person_id: leadData.person_id ? String(leadData.person_id) : prev.person_id,
          user_id: leadData.user_id ? String(leadData.user_id) : prev.user_id,
          subject: prev.subject.trim() ? prev.subject : `Quote for ${leadData.title || `Lead #${leadIdStr}`}`,
        }));

        if (errors.person_id) setErrors((prev) => ({ ...prev, person_id: "" }));

        // Auto-fetch person details for addresses if person is linked
        if (leadData.person_id) {
          try {
            const p = await usePersonStore.getState().getPersonById(leadData.person_id);
            if (p) {
              let addr: any = p.address || p.billing_address || {};
              if (typeof addr === "string") {
                try {
                  addr = JSON.parse(addr);
                } catch {}
              }
              if (typeof addr === "object" && addr) {
                const street = addr.street_address || addr.address || "";
                const city = addr.city || "";
                const state = addr.state || "";
                const country = addr.country || "";
                const postcode = addr.postcode || "";

                if (street || city || country) {
                  setBillingAddress((prev) => ({
                    street_address: street || prev.street_address,
                    city: city || prev.city,
                    state: state || prev.state,
                    country: country || prev.country,
                    postcode: postcode || prev.postcode,
                  }));
                  setShippingAddress((prev) => ({
                    street_address: street || prev.street_address,
                    city: city || prev.city,
                    state: state || prev.state,
                    country: country || prev.country,
                    postcode: postcode || prev.postcode,
                  }));
                }
              }
            }
          } catch {}
        }
      }

      // 2. Fetch Lead Products
      await useLeadStore.getState().fetchLeadProducts(Number(leadIdStr));
      const leadProds = useLeadStore.getState().leadProducts || [];
      if (Array.isArray(leadProds) && leadProds.length > 0) {
        const mappedItems: ITempQuoteItem[] = leadProds.map((lp: any) => {
          const qty = Number(lp.quantity) || 1;
          const price = Number(lp.price) || 0;
          return {
            product_id: Number(lp.product_id),
            sku: lp.sku || "",
            name: lp.product_name || lp.name || "Product",
            quantity: qty,
            price: price,
            discount_percent: 0,
            tax_percent: 0,
            total: qty * price,
          };
        });
        setItems(mappedItems);
        setErrors((prev) => ({ ...prev, items: "" }));
      }
    } catch (err) {
      console.error("Error auto-filling from lead:", err);
    }
  };

  useEffect(() => {
    usePersonStore
      .getState()
      .fetchPersons({ per_page: 500, limit: 500 })
      .then(() => {
        const pList = usePersonStore.getState().persons;
        if (pList) setPersons(pList);
      })
      .catch(() => {});

    useUserStore
      .getState()
      .fetchUsers(1, 100)
      .then((res: any) => {
        if (res?.rows || res) setUsers(res?.rows || res || []);
      })
      .catch(() => {});

    useLeadStore
      .getState()
      .fetchLeads(1, 100)
      .then(() => {
        const lList = useLeadStore.getState().leads;
        if (lList) setLeads(lList);
      })
      .catch(() => {});

    useProductStore
      .getState()
      .fetchProducts(1, 200)
      .then(() => {
        const prodList = useProductStore.getState().products;
        if (prodList) setProducts(prodList);
      })
      .catch(() => {});

    if (urlLeadId) {
      handleLeadChange(urlLeadId);
    }
  }, [urlLeadId]);

  // When selected product changes in item row, pre-fill price/sku/name
  const handleProductSelect = (productIdStr: string) => {
    if (errors.item_product) setErrors((prev) => ({ ...prev, item_product: "" }));
    const pId = Number(productIdStr);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setNewItem({
        ...newItem,
        product_id: productIdStr,
        price: String(prod.price || 0),
      });
    } else {
      setNewItem({ ...newItem, product_id: productIdStr });
    }
  };

  // Add line item to local array
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.product_id) {
      setErrors((prev) => ({ ...prev, item_product: "Please select a product" }));
      return;
    }
    setErrors((prev) => ({ ...prev, item_product: "" }));
    const prod = products.find((p) => p.id === Number(newItem.product_id));
    const qty = Number(newItem.quantity) || 1;
    const price = Number(newItem.price) || 0;
    const disc = Number(newItem.discount_percent) || 0;
    const tax = Number(newItem.tax_percent) || 0;

    const sub = qty * price;
    const discAmt = sub * (disc / 100);
    const taxAmt = (sub - discAmt) * (tax / 100);
    const tot = sub - discAmt + taxAmt;

    const added: ITempQuoteItem = {
      product_id: Number(newItem.product_id),
      sku: prod?.sku || "",
      name: prod?.name || "Product",
      quantity: qty,
      price: price,
      discount_percent: disc,
      tax_percent: tax,
      total: tot,
    };

    setItems([...items, added]);
    setNewItem({ product_id: "", quantity: "1", price: "0", discount_percent: "0", tax_percent: "0" });
    setErrors((prev) => ({ ...prev, items: "", item_product: "" }));
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const rawSubTotal = items.reduce((acc, i) => acc + i.quantity * i.price, 0);
  const totalItemDiscounts = items.reduce((acc, i) => {
    const sub = i.quantity * i.price;
    return acc + sub * (i.discount_percent / 100);
  }, 0);

  const globalDiscountPercent = Number(formData.discount_percent) || 0;
  const globalDiscountAmt = (rawSubTotal - totalItemDiscounts) * (globalDiscountPercent / 100);
  const totalDiscount = totalItemDiscounts + globalDiscountAmt;

  const taxAmount = Number(formData.tax_amount) || 0;
  const adjustmentAmount = Number(formData.adjustment_amount) || 0;
  const grandTotal = Math.max(0, rawSubTotal - totalDiscount + taxAmount + adjustmentAmount);

  const handleBillingChange = (field: keyof IQuoteAddress, val: string) => {
    const updated = { ...billingAddress, [field]: val };
    setBillingAddress(updated);
    if (sameAsBilling) {
      setShippingAddress(updated);
    }
  };

  const handleToggleSameAsBilling = (checked: boolean) => {
    setSameAsBilling(checked);
    if (checked) {
      setShippingAddress({ ...billingAddress });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = quoteSchema.safeParse({
      subject: formData.subject.trim(),
      description: formData.description || undefined,
      person_id: formData.person_id ? Number(formData.person_id) : undefined,
      user_id: formData.user_id ? Number(formData.user_id) : undefined,
      discount_percent: globalDiscountPercent,
      discount_amount: totalDiscount,
      tax_amount: taxAmount,
      adjustment_amount: adjustmentAmount,
      sub_total: rawSubTotal,
      grand_total: grandTotal,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errMap[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(errMap);
      return;
    }

    if (items.length === 0) {
      setErrors({ items: "Please add at least one line item to the quote" });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const finalShippingAddress = sameAsBilling ? billingAddress : shippingAddress;

      await addQuote({
        subject: formData.subject.trim(),
        description: formData.description || undefined,
        person_id: formData.person_id ? Number(formData.person_id) : undefined,
        user_id: formData.user_id ? Number(formData.user_id) : undefined,
        lead_id: formData.lead_id ? Number(formData.lead_id) : undefined,
        billing_address: billingAddress,
        shipping_address: finalShippingAddress,
        discount_percent: globalDiscountPercent,
        discount_amount: totalDiscount,
        tax_amount: taxAmount,
        adjustment_amount: adjustmentAmount,
        sub_total: rawSubTotal,
        grand_total: grandTotal,
        expired_at: formData.expired_at || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          sku: i.sku,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          discount_percent: i.discount_percent,
          discount_amount: i.quantity * i.price * (i.discount_percent / 100),
          tax_percent: i.tax_percent,
          tax_amount: i.quantity * i.price * (i.tax_percent / 100),
          total: i.total,
        })),
        custom_attributes: customAttributes,
      });

      navigate("/quotes");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create quote", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#0088cc] dark:focus:border-[#0088cc] rounded-xl text-xs sm:text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-100 placeholder-gray-400";
  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/quotes" className="text-[#0e90d9] hover:underline">
          Quotes
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Create Quote</span>
      </div>

      {/* 🏷️ Page Header with Actions & Live Total */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/quotes"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Quotes"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Create Quote
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 font-mono text-xs font-bold border border-blue-100 dark:border-blue-800/60 shrink-0">
                New
              </span>
            </div>
            {formData.subject ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.subject}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                Fill in customer details, line items, and terms
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <div className="hidden md:flex flex-col text-right pr-3 border-r border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Grand Total</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(grandTotal)}
            </span>
          </div>

          <Link
            to="/quotes"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="mgc_check_line text-base"></i>
            )}
            <span>Save Quote</span>
          </button>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* 📋 CARD 1: GENERAL INFORMATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0088cc] flex items-center justify-center font-bold">
              <i className="mgc_document_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Quote Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Basic details, customer relation, and validity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Subject */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelCls}>
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: "" }));
                }}
                placeholder="e.g. Enterprise Software License Quotation"
                className={`${inputCls} ${errors.subject ? "border-red-500 ring-1 ring-red-500/20" : ""}`}
              />
              {errors.subject && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.subject}</p>}
            </div>

            {/* Contact Person */}
            <div>
              <label className={labelCls}>
                Contact Person <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.person_id}
                onChange={(e) => {
                  setFormData({ ...formData, person_id: e.target.value });
                  if (errors.person_id) setErrors((prev) => ({ ...prev, person_id: "" }));
                }}
                className={`${inputCls} ${errors.person_id ? "border-red-500 ring-1 ring-red-500/20" : ""}`}
              >
                <option value="">-- Select Contact Person --</option>
                {persons
                  .slice()
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                  .map((p) => {
                    const email = Array.isArray(p.emails) && p.emails[0]?.value ? p.emails[0].value : "";
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {email ? ` (${email})` : ""}
                      </option>
                    );
                  })}
              </select>
              {errors.person_id && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.person_id}</p>}
            </div>

            {/* Sales Owner */}
            <div>
              <label className={labelCls}>Sales Owner</label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
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

            {/* Link to Lead */}
            <div>
              <SearchableLeadSelect
                value={formData.lead_id}
                onChange={(val) => handleLeadChange(val)}
                leads={leads}
                label="Link to Lead"
                placeholder="Search or select lead..."
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input
                type="date"
                value={formData.expired_at}
                onChange={(e) => setFormData({ ...formData, expired_at: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Description / Notes</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief notes, terms, or delivery conditions..."
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* 📍 CARD 2: ADDRESS INFORMATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
              <i className="mgc_location_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Address Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Billing and dispatch locations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Billing Address Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-gray-700/60">
                <span className="text-xs font-bold text-[#0088cc] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="mgc_building_line text-sm"></i> Billing Address
                </span>
              </div>
              <div>
                <label className={labelCls}>Street Address</label>
                <textarea
                  rows={2}
                  value={billingAddress.street_address}
                  onChange={(e) => handleBillingChange("street_address", e.target.value)}
                  placeholder="Street name, suite, unit..."
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text"
                    value={billingAddress.city}
                    onChange={(e) => handleBillingChange("city", e.target.value)}
                    placeholder="e.g. Mumbai"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State / Province</label>
                  <input
                    type="text"
                    value={billingAddress.state}
                    onChange={(e) => handleBillingChange("state", e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Postcode / ZIP</label>
                  <input
                    type="text"
                    value={billingAddress.postcode}
                    onChange={(e) => handleBillingChange("postcode", e.target.value)}
                    placeholder="e.g. 400001"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    type="text"
                    value={billingAddress.country}
                    onChange={(e) => handleBillingChange("country", e.target.value)}
                    placeholder="e.g. India"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-gray-700/60">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="mgc_truck_line text-sm"></i> Shipping Address
                </span>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300 select-none">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0088cc] focus:ring-[#0088cc] border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                  />
                  <span>Same as billing</span>
                </label>
              </div>

              {!sameAsBilling ? (
                <>
                  <div>
                    <label className={labelCls}>Street Address</label>
                    <textarea
                      rows={2}
                      value={shippingAddress.street_address}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street_address: e.target.value })}
                      placeholder="Shipping street address..."
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>City</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        placeholder="e.g. Mumbai"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>State / Province</label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        placeholder="e.g. Maharashtra"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Postcode / ZIP</label>
                      <input
                        type="text"
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                        placeholder="e.g. 400001"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        placeholder="e.g. India"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-dashed border-blue-200 dark:border-blue-800/50 text-xs text-gray-600 dark:text-gray-300 space-y-1.5 flex flex-col justify-center min-h-[170px]">
                  <div className="flex items-center gap-1.5 font-bold text-[#0088cc] dark:text-blue-400">
                    <i className="mgc_check_circle_line text-sm"></i>
                    <span>Synchronized with Billing Address</span>
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {billingAddress.street_address || "No street address specified"}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {[billingAddress.city, billingAddress.state, billingAddress.postcode, billingAddress.country]
                      .filter(Boolean)
                      .join(", ") || "No city/state set"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ⚙️ CUSTOM ATTRIBUTES (renders only when custom attributes exist) */}
        <DynamicAttributeFields
          entityType="quotes"
          values={customAttributes}
          onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6"
        />

        {/* 📦 CARD 3: LINE ITEMS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center font-bold">
                <i className="mgc_box_line text-lg"></i>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Line Items ({items.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Products and custom services included</p>
              </div>
            </div>
          </div>

          {/* ADD PRODUCT ROW */}
          <div className="bg-gray-50/80 dark:bg-gray-900/50 p-4 sm:p-5 border border-gray-200/70 dark:border-gray-700/70 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <i className="mgc_add_line text-sm text-[#0088cc]"></i> Add Product to Quote
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Product *</label>
                <select
                  value={newItem.product_id}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""} - ₹{p.price || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Price (₹) <span className="text-[10px] text-gray-400 font-normal">(Auto)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  disabled
                  className={`${inputCls} bg-gray-100 dark:bg-gray-800/80 cursor-not-allowed opacity-80`}
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Disc (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newItem.discount_percent}
                  onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tax (%)</label>
                <input
                  type="number"
                  min="0"
                  value={newItem.tax_percent}
                  onChange={(e) => setNewItem({ ...newItem, tax_percent: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="lg:col-span-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1 active:scale-95"
                >
                  <i className="mgc_add_line text-sm"></i>
                  <span>Add</span>
                </button>
              </div>
            </div>
            {errors.item_product && <p className="text-xs text-red-500 font-medium">{errors.item_product}</p>}
          </div>

          {/* TABLE FOR DESKTOP / CARD LIST FOR MOBILE */}
          {items.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
              <i className="mgc_box_line text-3xl text-gray-300 dark:text-gray-600"></i>
              <span className="font-semibold text-gray-600 dark:text-gray-300">No products added yet</span>
              <span className="text-[11px] text-gray-400">Select a product above and click Add to start building your quote.</span>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50/90 dark:bg-gray-900/60 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 px-4">Item & SKU</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-right">Disc (%)</th>
                      <th className="py-3 px-4 text-right">Tax (%)</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</p>
                          <span className="font-mono text-[11px] text-gray-400">{item.sku || "No SKU"}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{fmtCurrency(item.price)}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                          {item.discount_percent > 0 ? `${item.discount_percent}%` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                          {item.tax_percent > 0 ? `${item.tax_percent}%` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-gray-900 dark:text-white">
                          {fmtCurrency(item.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition mx-auto"
                            title="Remove item"
                          >
                            <i className="mgc_delete_line text-base"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS (Hidden on Desktop) */}
              <div className="md:hidden space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 space-y-2.5 relative"
                  >
                    <div className="flex items-start justify-between pr-8">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-white">{item.name}</h4>
                        <span className="font-mono text-[10px] text-gray-400">{item.sku || "No SKU"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                      >
                        <i className="mgc_delete_line text-sm"></i>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                      <div>
                        <span className="text-gray-400">Qty × Price:</span>{" "}
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {item.quantity} × {fmtCurrency(item.price)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400">Total:</span>{" "}
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {fmtCurrency(item.total)}
                        </span>
                      </div>
                      {item.discount_percent > 0 && (
                        <div>
                          <span className="text-gray-400">Discount:</span>{" "}
                          <span className="text-amber-600 font-semibold">{item.discount_percent}%</span>
                        </div>
                      )}
                      {item.tax_percent > 0 && (
                        <div className={item.discount_percent > 0 ? "text-right" : ""}>
                          <span className="text-gray-400">Tax:</span>{" "}
                          <span className="text-blue-600 font-semibold">{item.tax_percent}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {errors.items && <p className="text-xs text-red-500 font-medium">{errors.items}</p>}
        </div>

        {/* 💳 CARD 4: FINANCIAL SUMMARY & BREAKDOWN */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold">
              <i className="mgc_wallet_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Financial Summary
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Adjustments, taxes, discounts, and net total</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Overall Discount & Notes */}
            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 space-y-3">
                <label className={labelCls}>Global Quote Discount (%)</label>
                <div className="flex items-center gap-3">
                  <div className="relative w-40">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                      className={`${inputCls} pr-8`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Applies on post-item discounted amount
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Invoice Calculation Card */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-gray-900/60 dark:to-gray-900/30 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <span>Gross Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">{fmtCurrency(rawSubTotal)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-xs sm:text-sm text-red-500">
                  <span>Total Discounts (Items + Global)</span>
                  <span className="font-semibold">-{fmtCurrency(totalDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                <span className="flex items-center gap-1.5">
                  Tax Amount <span className="text-[10px] text-gray-400">(₹)</span>
                </span>
                <div className="w-32">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    className="w-full text-right px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1.5">
                  Adjustment <span className="text-[10px] text-gray-400">(₹ +/-)</span>
                </span>
                <div className="w-32">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.adjustment_amount}
                    onChange={(e) => setFormData({ ...formData, adjustment_amount: e.target.value })}
                    className="w-full text-right px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-[10px] text-gray-400">Net Payable Amount</span>
                </div>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {fmtCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateQuotePage;
