import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useProductStore } from "@/store";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { productSchema } from "@/schemas";

const EditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchProductById, updateProduct } = useProductStore();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    quantity: "0",
    price: "",
  });
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  useEffect(() => {
    if (id) {
      fetchProductById(Number(id)).then(product => {
        if (product) {
          setFormData({
            sku: product.sku || "",
            name: product.name || "",
            description: product.description || "",
            quantity: String(product.quantity ?? 0),
            price: product.price ? String(product.price) : "",
          });
          if (product.custom_attributes) {
            if (typeof product.custom_attributes === "object") {
              setCustomAttributes(product.custom_attributes);
            } else if (typeof product.custom_attributes === "string") {
              try {
                setCustomAttributes(JSON.parse(product.custom_attributes));
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
      const issue = validation.error.issues[0];
      Swal.fire("Validation Error", issue ? issue.message : "Invalid product data", "warning");
      return;
    }
    setSaving(true);
    try {
      await updateProduct(Number(id), {
        sku: formData.sku,
        name: formData.name || undefined,
        description: formData.description || undefined,
        quantity: Number(formData.quantity) || 0,
        price: formData.price ? Number(formData.price) : undefined,
        custom_attributes: customAttributes,
      } as any);
      navigate("/products");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to update product", "error");
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/products" className="text-sm text-[#0088cc] hover:underline flex items-center gap-1 mb-1">
            &larr; Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Edit Product</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] dark:text-gray-200"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            {saving ? "Saving..." : "Update Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProductPage;
