import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore, useLeadStore, usePersonStore, useUserStore, useProductStore } from "@/store";
import API from "@/config";
import { ITempQuoteItem, IQuoteAddress } from "@/interface";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { SearchableLeadSelect } from "@/components/SearchableLeadSelect";
import { quoteSchema } from "@/schemas";

const fmtCurrency = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    usePersonStore.getState().fetchPersons({ per_page: 500, limit: 500 }).then(() => {
      const pList = usePersonStore.getState().persons;
      if (pList) setPersons(pList);
    }).catch(() => {});

    useUserStore.getState().fetchUsers(1, 100).then((res: any) => {
      if (res?.rows || res) setUsers(res?.rows || res || []);
    }).catch(() => {});

    useLeadStore.getState().fetchLeads(1, 100).then(() => {
      const lList = useLeadStore.getState().leads;
      if (lList) setLeads(lList);
    }).catch(() => {});

    useProductStore.getState().fetchProducts(1, 200).then(() => {
      const prodList = useProductStore.getState().products;
      if (prodList) setProducts(prodList);
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
            useLeadStore.getState().fetchLeadById(Number(q.lead_id)).then((leadData) => {
              if (leadData) {
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
          person_id: prev.person_id || (leadData.person_id ? String(leadData.person_id) : ""),
          user_id: prev.user_id || (leadData.user_id ? String(leadData.user_id) : ""),
        }));
      }

      if (items.length === 0) {
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
        }
      }
    } catch (err) {
      console.error("Error linking lead to quote:", err);
    }
  };

  const validateQuoteSubject = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) return "Subject is required.";
    if (/^[0-9\W_]+$/.test(trimmed)) {
      return "Quote subject cannot consist of only special characters or numbers.";
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      return "Quote subject must contain at least one letter.";
    }
    return "";
  };

  useEffect(() => {
    if (items.length > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.items;
        delete next.item_product;
        return next;
      });
    }
  }, [items.length]);

  const handleProductSelect = (productIdStr: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next.item_product;
      return next;
    });
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
    setErrors((prev) => {
      const next = { ...prev };
      delete next.item_product;
      delete next.items;
      return next;
    });
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
    setErrors((prev) => {
      const next = { ...prev };
      delete next.items;
      delete next.item_product;
      return next;
    });
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

    const subjErr = validateQuoteSubject(formData.subject);
    if (subjErr) {
      setErrors((prev) => ({ ...prev, subject: subjErr }));
      Swal.fire("Validation Error", subjErr, "warning");
      return;
    }

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
      Swal.fire("Validation Error", "Please fill in all required fields highlighted in red.", "warning");
      return;
    }

    if (items.length === 0) {
      setErrors({ items: "Please add at least one line item to the quote" });
      Swal.fire("Warning", "Please add at least one line item to the quote.", "warning");
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
    "w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] dark:text-gray-100 placeholder:text-gray-400 transition-all";
  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider";

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading quote details...</p>
      </div>
    );
  }

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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Edit Quote #{id}</span>
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
                Edit Quote
              </h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                #QT-{id}
              </span>
            </div>
            {formData.subject && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.subject}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Subject */}
              <div className="md:col-span-3">
                <label className={labelCls}>
                  Subject / Deal Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quotation for Enterprise License Package"
                  value={formData.subject}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, subject: val });
                    if (val.trim()) {
                      const err = validateQuoteSubject(val);
                      setErrors((prev) => ({ ...prev, subject: err }));
                    } else {
                      setErrors((prev) => ({ ...prev, subject: "" }));
                    }
                  }}
                  onBlur={(e) => {
                    const err = validateQuoteSubject(e.target.value);
                    setErrors((prev) => ({ ...prev, subject: err }));
                  }}
                  className={`${inputCls} ${errors.subject ? "border-red-500 ring-1 ring-red-500/20" : ""}`}
                />
                {errors.subject && <p className="mt-1 text-xs text-red-500 font-medium">{errors.subject}</p>}
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
                          {p.name}{email ? ` (${email})` : ""}
                        </option>
                      );
                    })}
                </select>
                {errors.person_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.person_id}</p>}
              </div>

              {/* Sales Owner */}
              <div>
                <label className={labelCls}>Sales Owner / Representative</label>
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
                  label="Link to Lead (Optional)"
                  placeholder="Select lead..."
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className={labelCls}>Valid Until (Expiry Date)</label>
                <input
                  type="date"
                  value={formData.expired_at}
                  onChange={(e) => setFormData({ ...formData, expired_at: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className={labelCls}>Description / Customer Notes</label>
                <input
                  type="text"
                  placeholder="Additional delivery instructions or quote notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
        </div>

        {/* 📍 CARD 2: ADDRESS INFORMATION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
                <i className="mgc_location_line text-lg"></i>
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Billing & Shipping Addresses
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Invoicing destination and dispatch address</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => handleToggleSameAsBilling(e.target.checked)}
                className="w-4 h-4 rounded text-[#0088cc] border-gray-300 focus:ring-[#0088cc]"
              />
              <span>Shipping same as billing</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billing Address */}
            <div className="p-4 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700 space-y-3.5">
              <h3 className="text-xs font-bold text-[#0088cc] uppercase tracking-wider flex items-center gap-1.5">
                <i className="mgc_bank_card_line text-sm"></i>
                <span>Billing Address</span>
              </h3>

              <div>
                <label className={labelCls}>Street Address</label>
                <textarea
                  rows={2}
                  value={billingAddress.street_address}
                  onChange={(e) => handleBillingChange("street_address", e.target.value)}
                  placeholder="Street name, suite, office building..."
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
                    placeholder="City name"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>State / Province</label>
                  <input
                    type="text"
                    value={billingAddress.state}
                    onChange={(e) => handleBillingChange("state", e.target.value)}
                    placeholder="State"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Postal Code / ZIP</label>
                  <input
                    type="text"
                    value={billingAddress.postcode}
                    onChange={(e) => handleBillingChange("postcode", e.target.value)}
                    placeholder="ZIP Code"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input
                    type="text"
                    value={billingAddress.country}
                    onChange={(e) => handleBillingChange("country", e.target.value)}
                    placeholder="Country"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-4 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700 space-y-3.5">
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <i className="mgc_truck_line text-sm"></i>
                <span>Shipping Address</span>
              </h3>

              {!sameAsBilling ? (
                <>
                  <div>
                    <label className={labelCls}>Street Address</label>
                    <textarea
                      rows={2}
                      value={shippingAddress.street_address}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, street_address: e.target.value })}
                      placeholder="Destination street address..."
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
                        placeholder="City"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>State / Province</label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                        placeholder="State"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Postal Code / ZIP</label>
                      <input
                        type="text"
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                        placeholder="ZIP Code"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                        placeholder="Country"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl space-y-1">
                  <i className="mgc_check_circle_line text-xl text-emerald-500"></i>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    Shipping address is synced with Billing address
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Uncheck the box above if the shipping destination is different.
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
          containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        />

        {/* 📦 CARD 4: LINE ITEMS */}
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
            {/* Add New Line Item Box */}
            <div className="bg-gradient-to-r from-gray-50 to-sky-50/30 dark:from-gray-900/60 dark:to-sky-950/20 p-4 border border-gray-200/80 dark:border-gray-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="mgc_add_line text-[#0088cc]"></i>
                  <span>Add Product to Quote</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Product Select */}
                <div className="sm:col-span-5">
                  <label className={labelCls}>Product / Service *</label>
                  <select
                    value={newItem.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className={`${inputCls} bg-white dark:bg-gray-900`}
                  >
                    <option value="">Select product or service...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""} - ₹{Number(p.price || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className={`${inputCls} bg-white dark:bg-gray-900 text-center font-bold`}
                  />
                </div>

                {/* Price */}
                <div className="sm:col-span-2">
                  <label className={labelCls}>Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    disabled
                    className={`${inputCls} bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed`}
                  />
                </div>

                {/* Discount % */}
                <div className="sm:col-span-1">
                  <label className={labelCls}>Disc %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newItem.discount_percent}
                    onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                    className={`${inputCls} bg-white dark:bg-gray-900 text-center`}
                  />
                </div>

                {/* Tax % */}
                <div className="sm:col-span-1">
                  <label className={labelCls}>Tax %</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.tax_percent}
                    onChange={(e) => setNewItem({ ...newItem, tax_percent: e.target.value })}
                    className={`${inputCls} bg-white dark:bg-gray-900 text-center`}
                  />
                </div>

                {/* Add button */}
                <div className="sm:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full h-[42px] bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1 active:scale-95"
                    title="Add Item"
                  >
                    <i className="mgc_add_line text-base"></i>
                    <span>Add</span>
                  </button>
                </div>
              </div>
              {errors.item_product && <p className="text-xs text-red-500 font-medium">{errors.item_product}</p>}
            </div>

            {/* Desktop Table of Added Items */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200/80 dark:border-gray-700">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold border-b border-gray-200/80 dark:border-gray-700">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3 text-center">Qty</th>
                    <th className="py-3 px-3 text-right">Unit Price</th>
                    <th className="py-3 px-3 text-right">Discount</th>
                    <th className="py-3 px-3 text-right">Tax</th>
                    <th className="py-3 px-4 text-right font-black">Line Total</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400 text-xs italic">
                        No line items added yet. Select a product above and click "+ Add".
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                        <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">{index + 1}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">{item.name}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-gray-400">{item.sku || "—"}</td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700 dark:text-gray-300">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                          {fmtCurrency(item.price)}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                          {item.discount_percent ? `${item.discount_percent}%` : "—"}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                          {item.tax_percent ? `${item.tax_percent}%` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#0088cc]">
                          {fmtCurrency(item.total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Remove item"
                          >
                            <i className="mgc_delete_line text-base"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards of Added Items */}
            <div className="block md:hidden space-y-2.5">
              {items.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/60 dark:border-gray-700">
                  No line items added yet. Select a product above and click "+ Add".
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-200/70 dark:border-gray-700 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        {item.sku && <span className="text-[10px] font-mono text-gray-400">SKU: {item.sku}</span>}
                      </div>
                      <span className="font-black text-sm text-[#0088cc]">{fmtCurrency(item.total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                      <span>
                        {item.quantity}x @ {fmtCurrency(item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-rose-500 font-semibold hover:underline flex items-center gap-1"
                      >
                        <i className="mgc_delete_line text-xs"></i>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {errors.items && <p className="text-xs text-red-500 font-medium">{errors.items}</p>}
        </div>

        {/* 💳 CARD 5: FINANCIAL SUMMARY & TOTALS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center font-bold">
              <i className="mgc_wallet_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Financial Summary
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Taxes, discounts, and final calculated payable</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Controls: Global Discount, Tax & Adjustments */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Quote-Level Adjustments
              </h3>

              <div>
                <label className={labelCls}>Global Quote Discount (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    className={`${inputCls} pr-8`}
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Additional Tax (₹)</label>
                  <input
                    type="number"
                    value={formData.tax_amount}
                    onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Adjustment (₹)</label>
                  <input
                    type="number"
                    value={formData.adjustment_amount}
                    onChange={(e) => setFormData({ ...formData, adjustment_amount: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Right Card: High-Contrast Invoice Totals Breakdown */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-gray-900/60 dark:to-gray-900/30 border border-gray-200/80 dark:border-gray-700 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200/60 dark:border-gray-700/60">
                Invoice Breakdown
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{fmtCurrency(rawSubTotal)}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-500 font-semibold">
                    <span>Total Discount:</span>
                    <span>-{fmtCurrency(totalDiscount)}</span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Tax:</span>
                    <span>+{fmtCurrency(taxAmount)}</span>
                  </div>
                )}

                {adjustmentAmount !== 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Adjustment:</span>
                    <span>{adjustmentAmount > 0 ? `+${fmtCurrency(adjustmentAmount)}` : fmtCurrency(adjustmentAmount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total Box */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-[10px] text-gray-400">Net Payable Amount</span>
                </div>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 shrink-0 whitespace-nowrap">
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

export default EditQuotePage;
