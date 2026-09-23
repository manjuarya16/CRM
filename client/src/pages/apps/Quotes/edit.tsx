import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useQuoteStore } from "@/store";
import API from "@/config";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { quoteSchema } from "@/schemas";

const EditQuotePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchQuoteById, updateQuote, quoteItems, fetchQuoteItems, addQuoteItem, deleteQuoteItem } = useQuoteStore();
  const [persons, setPersons] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    person_id: "",
    expired_at: "",
    discount_percent: "0",
    tax_amount: "0",
    adjustment_amount: "0",
  });
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  const [newItem, setNewItem] = useState({
    product_id: "",
    quantity: "1",
    price: "0",
    discount_percent: "0",
    tax_percent: "0",
  });

  useEffect(() => {
    API.get("/persons?limit=100").then((res) => {
      if (res.data?.data) setPersons(res.data.data);
    }).catch(() => {});

    API.get("/products?limit=100").then((res) => {
      if (res.data?.data) setProducts(res.data.data);
    }).catch(() => {});

    if (id) {
      const qId = Number(id);
      fetchQuoteItems(qId);
      fetchQuoteById(qId).then((q) => {
        if (q) {
          setFormData({
            subject: q.subject || "",
            description: q.description || "",
            person_id: q.person_id ? String(q.person_id) : "",
            expired_at: q.expired_at ? q.expired_at.substring(0, 10) : "",
            discount_percent: q.discount_percent ? String(q.discount_percent) : "0",
            tax_amount: q.tax_amount ? String(q.tax_amount) : "0",
            adjustment_amount: q.adjustment_amount ? String(q.adjustment_amount) : "0",
          });
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
        setLoading(false);
      });
    }
  }, [id]);

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleAddItem = async (e: React.FormEvent) => {
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

    await addQuoteItem(Number(id), {
      product_id: Number(newItem.product_id),
      sku: prod?.sku || "",
      name: prod?.name || "Product",
      quantity: qty,
      price: price,
      discount_percent: disc,
      tax_percent: tax,
    });

    setNewItem({ product_id: "", quantity: "1", price: "0", discount_percent: "0", tax_percent: "0" });
  };

  const handleRemoveItem = async (itemId: number) => {
    await deleteQuoteItem(itemId, Number(id));
  };

  const rawSubTotal = quoteItems.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.price || 0)), 0);
  const totalItemDiscounts = quoteItems.reduce((acc, i) => {
    const sub = Number(i.quantity || 0) * Number(i.price || 0);
    return acc + (sub * (Number(i.discount_percent || 0) / 100));
  }, 0);

  const globalDiscountPercent = Number(formData.discount_percent) || 0;
  const globalDiscountAmt = (rawSubTotal - totalItemDiscounts) * (globalDiscountPercent / 100);
  const totalDiscount = totalItemDiscounts + globalDiscountAmt;

  const taxAmount = Number(formData.tax_amount) || 0;
  const adjustmentAmount = Number(formData.adjustment_amount) || 0;
  const grandTotal = (rawSubTotal - totalDiscount) + taxAmount + adjustmentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = quoteSchema.safeParse({
      subject: formData.subject.trim(),
      description: formData.description || undefined,
      person_id: formData.person_id ? Number(formData.person_id) : undefined,
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
      setErrors((prev) => ({ ...prev, ...errMap }));
      return;
    }

    setSaving(true);
    try {
      await updateQuote(Number(id), {
        subject: formData.subject,
        description: formData.description || undefined,
        person_id: formData.person_id ? Number(formData.person_id) : undefined,
        discount_percent: globalDiscountPercent,
        discount_amount: totalDiscount,
        tax_amount: taxAmount,
        adjustment_amount: adjustmentAmount,
        sub_total: rawSubTotal,
        grand_total: grandTotal,
        expired_at: formData.expired_at || undefined,
        custom_attributes: customAttributes,
      } as any);

      navigate("/quotes");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update quote", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/quotes" className="text-sm text-[#0088cc] hover:underline flex items-center gap-1 mb-1">
            &larr; Back to Quotes
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Edit Quote</h1>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b pb-2">Quote Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: e.target.value });
                  if (errors.subject) setErrors((prev) => ({ ...prev, subject: "" }));
                }}
                className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${
                  errors.subject ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
                } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200`}
              />
              {errors.subject && <p className="mt-1 text-xs text-red-500 font-medium">{errors.subject}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
              <select
                value={formData.person_id}
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
              >
                <option value="">Select Person</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Expired At</label>
              <input
                type="date"
                value={formData.expired_at}
                onChange={(e) => setFormData({ ...formData, expired_at: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b pb-2">Line Items</h2>

          {/* Add Item Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Product</label>
              <select
                value={newItem.product_id}
                onChange={(e) => handleProductSelect(e.target.value)}
                className={`w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border ${
                  errors.item_product ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600"
                } rounded-lg text-sm`}
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              {errors.item_product && <p className="mt-1 text-xs text-red-500 font-medium">{errors.item_product}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Disc (%)</label>
              <input
                type="number"
                step="0.1"
                value={newItem.discount_percent}
                onChange={(e) => setNewItem({ ...newItem, discount_percent: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-sm rounded-lg transition-colors"
              >
                + Add Item
              </button>
            </div>
          </div>

          {/* Table of items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Disc (%)</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400 text-sm">
                      No line items.
                    </td>
                  </tr>
                ) : (
                  quoteItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700/60">
                      <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                      <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{item.sku}</td>
                      <td className="py-2.5 px-3">{item.quantity}</td>
                      <td className="py-2.5 px-3">${Number(item.price || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3">{item.discount_percent}%</td>
                      <td className="py-2.5 px-3 font-semibold">${Number(item.total || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section 3: Summary Totals */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col items-end space-y-2 text-sm">
            <div className="flex justify-between w-64 text-gray-600 dark:text-gray-300">
              <span>Subtotal:</span>
              <span className="font-semibold">${rawSubTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 text-gray-600 dark:text-gray-300 items-center">
              <span>Discount (%):</span>
              <input
                type="number"
                step="0.1"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                className="w-20 px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right text-xs"
              />
            </div>
            <div className="flex justify-between w-64 text-gray-600 dark:text-gray-300 items-center">
              <span>Tax ($):</span>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                className="w-20 px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right text-xs"
              />
            </div>
            <div className="flex justify-between w-64 text-gray-600 dark:text-gray-300 items-center">
              <span>Adjustment ($):</span>
              <input
                type="number"
                step="0.01"
                value={formData.adjustment_amount}
                onChange={(e) => setFormData({ ...formData, adjustment_amount: e.target.value })}
                className="w-20 px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-right text-xs"
              />
            </div>
            <div className="flex justify-between w-64 text-base font-bold text-gray-800 dark:text-gray-100 pt-2 border-t">
              <span>Grand Total:</span>
              <span className="text-[#0088cc]">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Dynamic Custom Attributes for Quotes */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <DynamicAttributeFields
              entityType="quotes"
              values={customAttributes}
              onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/quotes"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Quote"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditQuotePage;
