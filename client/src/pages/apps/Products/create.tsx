import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useProductStore } from "@/store";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { productSchema } from "@/schemas";

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { addProduct } = useProductStore();
  const [saving, setSaving] = useState<boolean>(false);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    quantity: "0",
    price: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = productSchema.safeParse({
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      description: formData.description || undefined,
      quantity: Number(formData.quantity) || 0,
      price: formData.price ? Number(formData.price) : undefined,
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
    setErrors({});
    setSaving(true);
    try {
      await addProduct({
        sku: formData.sku,
        name: formData.name || undefined,
        description: formData.description || undefined,
        quantity: Number(formData.quantity) || 0,
        price: formData.price ? Number(formData.price) : undefined,
        custom_attributes: customAttributes,
      } as any);
      navigate("/products");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create product", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/products" className="text-sm text-[#0088cc] hover:underline flex items-center gap-1 mb-1">
            &larr; Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Create Product</h1>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => {
                setFormData({ ...formData, sku: e.target.value });
                if (errors.sku) setErrors((prev) => ({ ...prev, sku: "" }));
              }}
              placeholder="e.g. PROD-001"
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${
                errors.sku ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
              } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200`}
            />
            {errors.sku && <p className="mt-1 text-xs text-red-500 font-medium">{errors.sku}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Enterprise License"
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${
                errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
              } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => {
                setFormData({ ...formData, quantity: e.target.value });
                if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));
              }}
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${
                errors.quantity ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
              } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200`}
            />
            {errors.quantity && <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => {
                setFormData({ ...formData, price: e.target.value });
                if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
              }}
              placeholder="0.00"
              className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border ${
                errors.price ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0088cc]"
              } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200`}
            />
            {errors.price && <p className="mt-1 text-xs text-red-500 font-medium">{errors.price}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product details..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>
        </div>

        {/* Dynamic Custom Attributes for Products */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <DynamicAttributeFields
            entityType="products"
            values={customAttributes}
            onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Link
            to="/products"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
