import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore } from "@/store";
import API from "@/config";
import { ITempQuoteItem, IQuoteAddress } from "@/interface";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { SearchableLeadSelect } from "@/components/SearchableLeadSelect";
import { quoteSchema } from "@/schemas";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const EditQuotePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchQuoteById, updateQuote, fetchQuoteItems } = useQuoteStore();

  const [persons, setPersons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

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
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  // Addresses
  const [billingAddress, setBillingAddress] = useState<IQuoteAddress>({
    street_address: "",
    country: "",
    state: "",
    city: "",
    postcode: "",
  });

  const [sameAsBilling, setSameAsBilling] = useState<boolean>(false);
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

  useEffect(() => {
    API.get("/persons?per_page=500&limit=500").then((res) => {
      if (res.data?.data) setPersons(res.data.data);
    }).catch(() => {});

    API.get("/users?limit=100").then((res) => {
      if (res.data?.data) setUsers(res.data.data);
    }).catch(() => {});

    API.get("/leads?limit=100").then((res) => {
      if (res.data?.data) setLeads(res.data.data);
    }).catch(() => {});

    API.get("/products?limit=200").then((res) => {
      if (res.data?.data) setProducts(res.data.data);
    }).catch(() => {});

    if (id) {
      const qId = Number(id);
      Promise.all([
        fetchQuoteById(qId),
        fetchQuoteItems(qId),
      ]).then(([q]) => {
        if (q) {
          setFormData({
            subject: q.subject || "",
            description: q.description || "",
            person_id: q.person_id ? String(q.person_id) : "",
            user_id: q.user_id ? String(q.user_id) : "",
            lead_id: q.lead_id ? String(q.lead_id) : "",
            expired_at: q.expired_at ? q.expired_at.substring(0, 10) : "",
            discount_percent: q.discount_percent ? String(q.discount_percent) : "0",
            tax_amount: q.tax_amount ? String(q.tax_amount) : "0",
            adjustment_amount: q.adjustment_amount ? String(q.adjustment_amount) : "0",
          });

          // Parse billing address
          let bAddr: any = q.billing_address;
          if (typeof bAddr === "string") {
            try { bAddr = JSON.parse(bAddr); } catch { bAddr = {}; }
          }
          if (bAddr && typeof bAddr === "object") {
            setBillingAddress({
              street_address: bAddr.street_address || bAddr.address || "",
              country: bAddr.country || "",
              state: bAddr.state || "",
              city: bAddr.city || "",
              postcode: bAddr.postcode || "",
            });
          }

          // Parse shipping address
          let sAddr: any = q.shipping_address;
          if (typeof sAddr === "string") {
            try { sAddr = JSON.parse(sAddr); } catch { sAddr = {}; }
          }
          if (sAddr && typeof sAddr === "object") {
            setShippingAddress({
              street_address: sAddr.street_address || sAddr.address || "",
              country: sAddr.country || "",
              state: sAddr.state || "",
              city: sAddr.city || "",
              postcode: sAddr.postcode || "",
            });
          }

          if (q.lead_id) {
            API.get(`/leads/${q.lead_id}`).then((leadRes) => {
              if (leadRes.data?.data) {
                const leadData = leadRes.data.data;
                setLeads((prev) => {
                  if (!prev.some((l) => String(l.id) === String(leadData.id))) {
                    return [leadData, ...prev];
                  }
                  return prev;
                });
              }
            }).catch(() => {});
          }

          if (q.custom_attributes) {
            if (typeof q.custom_attributes === "object") {
              setCustomAttributes(q.custom_attributes);
            } else if (typeof q.custom_attributes === "string") {
              try {
                setCustomAttributes(JSON.parse(q.custom_attributes));
              } catch {
                setCustomAttributes({});
              }
            }
          }
        }

        const rawItems = q?.items || [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          setItems(
            rawItems.map((it: any) => ({
              id: it.id,
              product_id: it.product_id,
              sku: it.sku || "",
              name: it.name || "Product",
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              discount_percent: Number(it.discount_percent) || 0,
              tax_percent: Number(it.tax_percent) || 0,
              total: Number(it.total) || (Number(it.quantity) * Number(it.price)),
            }))
          );
        }

        setLoading(false);
      });
    }
  }, [id]);

  const handleLeadChange = async (leadIdStr: string) => {
    setFormData((prev) => ({ ...prev, lead_id: leadIdStr }));
    if (!leadIdStr) return;

    try {
      const leadRes = await API.get(`/leads/${leadIdStr}`);
      const leadData = leadRes.data?.data;
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
          person_id: prev.person_id || (leadData.person_id ? String(leadData.person_id) : ""),
          user_id: prev.user_id || (leadData.user_id ? String(leadData.user_id) : ""),
        }));
      }

      // If items is empty, automatically populate with lead products
      if (items.length === 0) {
        const prodRes = await API.get(`/leads/${leadIdStr}/products`);
        const leadProds = prodRes.data?.data || [];
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
        }
      }
    } catch (err) {
      console.error("Error linking lead to quote:", err);
    }
  };

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
    const tot = (sub - discAmt) + taxAmt;

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
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const rawSubTotal = items.reduce((acc, i) => acc + (i.quantity * i.price), 0);
  const totalItemDiscounts = items.reduce((acc, i) => {
    const sub = i.quantity * i.price;
    return acc + (sub * (i.discount_percent / 100));
  }, 0);

  const globalDiscountPercent = Number(formData.discount_percent) || 0;
  const globalDiscountAmt = (rawSubTotal - totalItemDiscounts) * (globalDiscountPercent / 100);
  const totalDiscount = totalItemDiscounts + globalDiscountAmt;

  const taxAmount = Number(formData.tax_amount) || 0;
  const adjustmentAmount = Number(formData.adjustment_amount) || 0;
  const grandTotal = Math.max(0, (rawSubTotal - totalDiscount) + taxAmount + adjustmentAmount);

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

      await updateQuote(Number(id), {
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
          discount_amount: (i.quantity * i.price) * (i.discount_percent / 100),
          tax_percent: i.tax_percent,
          tax_amount: (i.quantity * i.price) * (i.tax_percent / 100),
          total: i.total,
        })),
        custom_attributes: customAttributes,
      });

      navigate("/quotes");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update quote", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1";

  if (loading) {
    return (
      <div className="p-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0e90d9] border-t-transparent"></div>
        <p className="mt-2 text-xs text-gray-400">Loading quote details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline">Dashboard</Link>
        <span>/</span>
        <Link to="/quotes" className="text-[#0e90d9] hover:underline">Quotes</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Edit Quote #{id}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Edit Quote #{id}
        </h1>
        <div className="flex items-center gap-3">
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
            className="px-6 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            Save Quote
          </button>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: General Info & Ownership */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-3 border-b border-gray-100 dark:border-gray-700">
            Quote Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-3">
              <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: "" }));
                }}
                className={`${inputCls} ${errors.subject ? "border-red-500" : ""}`}
              />
              {errors.subject && <p className="mt-1 text-xs text-red-500 font-medium">{errors.subject}</p>}
            </div>

            <div>
              <label className={labelCls}>Contact Person <span className="text-red-500">*</span></label>
              <select
                value={formData.person_id}
                onChange={(e) => {
                  setFormData({ ...formData, person_id: e.target.value });
                  if (errors.person_id) setErrors((prev) => ({ ...prev, person_id: "" }));
                }}
                className={`${inputCls} ${errors.person_id ? "border-red-500" : ""}`}
              >
                <option value="">-- Select Contact Person --</option>
                {persons
                  .slice()
                  .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                  .map((p) => {
                    const email = Array.isArray(p.emails) && p.emails[0]?.value ? p.emails[0].value : "";
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}{email ? ` (${email})` : ""}
                      </option>
                    );
                  })}
              </select>
              {errors.person_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.person_id}</p>}
            </div>

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

            <div>
              <SearchableLeadSelect
                value={formData.lead_id}
                onChange={(val) => handleLeadChange(val)}
                leads={leads}
                label="Link to lead"
                placeholder="Click to add"
              />
            </div>

            <div>
              <label className={labelCls}>Expired At</label>
              <input
                type="date"
                value={formData.expired_at}
                onChange={(e) => setFormData({ ...formData, expired_at: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Address Information (Billing & Shipping) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-3 border-b border-gray-100 dark:border-gray-700">
            Address Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0088cc] uppercase tracking-wider">
                Billing Address
              </h3>
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
                  <label className={labelCls}>Country</label>
                  <input
                    type="text"
                    value={billingAddress.country}
                    onChange={(e) => handleBillingChange("country", e.target.value)}
                    placeholder="e.g. USA"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State / Province</label>
                  <input
                    type="text"
                    value={billingAddress.state}
                    onChange={(e) => handleBillingChange("state", e.target.value)}
                    placeholder="e.g. California"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <input
                    type="text"
                    value={billingAddress.city}
                    onChange={(e) => handleBillingChange("city", e.target.value)}
                    placeholder="e.g. San Francisco"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Postcode / Zip</label>
                  <input
                    type="text"
                    value={billingAddress.postcode}
                    onChange={(e) => handleBillingChange("postcode", e.target.value)}
                    placeholder="e.g. 94105"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0088cc] uppercase tracking-wider">
                  Shipping Address
                </h3>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 font-medium">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc]"
                  />
                  Same as billing address
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
                      placeholder="Shipping street..."
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>State / Province</label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>City</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Postcode / Zip</label>
                      <input
                        type="text"
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Shipping to same address as billing:
                  </p>
                  <p>{billingAddress.street_address || "No street address"}</p>
                  <p>{[billingAddress.city, billingAddress.state, billingAddress.postcode, billingAddress.country].filter(Boolean).join(", ") || "No city/state"}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Quote Items & Calculations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-3 border-b border-gray-100 dark:border-gray-700">
            Quote Items
          </h2>

          {/* Add item row */}
          <div className="bg-gray-50/70 dark:bg-gray-900/40 p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Add Line Item
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Product *</label>
                <select
                  value={newItem.product_id}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""} - ${p.price || 0}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
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

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.tax_percent}
                    onChange={(e) => setNewItem({ ...newItem, tax_percent: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-xs font-semibold shadow-sm transition h-[38px] mt-auto whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
            </div>
            {errors.item_product && <p className="text-xs text-red-500 font-medium">{errors.item_product}</p>}
          </div>

          {/* Table of added items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Disc (%)</th>
                  <th className="py-2.5 px-3 text-right">Tax (%)</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400 text-xs">
                      No items added yet. Select a product above and click "+ Add".
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{item.sku || "-"}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{fmtCurrency(item.price)}</td>
                      <td className="py-2.5 px-3 text-right">{item.discount_percent}%</td>
                      <td className="py-2.5 px-3 text-right">{item.tax_percent}%</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[#0088cc]">{fmtCurrency(item.total)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-gray-400 hover:text-red-500 font-bold"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {errors.items && <p className="text-xs text-red-500 font-medium">{errors.items}</p>}

          {/* Totals Summary */}
          <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="w-full md:w-1/2 space-y-3">
              <label className={labelCls}>Global Quote Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                className="w-48 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>

            <div className="w-full md:w-80 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Sub Total:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtCurrency(rawSubTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Discount:</span>
                <span className="text-red-500">-{fmtCurrency(totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax Amount ($):</span>
                <input
                  type="number"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                  className="w-28 text-right px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-xs"
                />
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Adjustment ($):</span>
                <input
                  type="number"
                  value={formData.adjustment_amount}
                  onChange={(e) => setFormData({ ...formData, adjustment_amount: e.target.value })}
                  className="w-28 text-right px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-xs"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Grand Total:</span>
                <span className="text-[#0088cc]">{fmtCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Attributes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <DynamicAttributeFields
            entityType="quotes"
            values={customAttributes}
            onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          />
        </div>
      </form>
    </div>
  );
};

export default EditQuotePage;
