import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import API from "@/config";
import { useProductStore } from "@/store";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { productSchema } from "@/schemas";
import { TagPicker } from "@/components/TagPicker";
import { IWarehouse } from "@/interface";

interface WarehouseInventoryRow {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_location_id: number | null;
  warehouse_location_name: string;
  in_stock: number;
  allocated: number;
}

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { addProduct } = useProductStore();
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  
  // Accordions
  const [isPriceOpen, setIsPriceOpen] = useState<boolean>(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(true);

  // Form Fields
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    quantity: "0",
    price: "",
  });

  // Warehouses & Multi-Warehouse Inventories
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [inventoryRows, setInventoryRows] = useState<WarehouseInventoryRow[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const res = await API.get("/warehouse/").catch(() => ({ data: { data: [] } }));
      const list: IWarehouse[] = res.data?.data || [];
      setWarehouses(list);

      // Build initial inventory rows for all warehouses & their locations
      const initialRows: WarehouseInventoryRow[] = [];
      list.forEach((w) => {
        if (Array.isArray(w.locations) && w.locations.length > 0) {
          w.locations.forEach((loc: any) => {
            initialRows.push({
              warehouse_id: w.id,
              warehouse_name: w.name,
              warehouse_location_id: typeof loc === "object" ? loc.id : null,
              warehouse_location_name: typeof loc === "object" ? loc.name : String(loc),
              in_stock: 0,
              allocated: 0,
            });
          });
        } else {
          initialRows.push({
            warehouse_id: w.id,
            warehouse_name: w.name,
            warehouse_location_id: null,
            warehouse_location_name: "Default Location",
            in_stock: 0,
            allocated: 0,
          });
        }
      });
      setInventoryRows(initialRows);
    } catch {
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleInventoryChange = (index: number, field: "in_stock" | "allocated", value: number) => {
    const updated = [...inventoryRows];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value || 0),
    };
    setInventoryRows(updated);

    // Auto-calculate total quantity from in_stock
    const totalInStock = updated.reduce((sum, r) => sum + (Number(r.in_stock) || 0), 0);
    setFormData((prev) => ({ ...prev, quantity: String(totalInStock) }));
  };

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
      const payloadInventories = inventoryRows
        .filter((r) => r.in_stock > 0 || r.allocated > 0)
        .map((r) => ({
          warehouse_id: r.warehouse_id,
          warehouse_location_id: r.warehouse_location_id,
          in_stock: r.in_stock,
          allocated: r.allocated,
        }));

      const res: any = await addProduct({
        sku: formData.sku.trim(),
        name: formData.name.trim() || undefined,
        description: formData.description || undefined,
        quantity: Number(formData.quantity) || 0,
        price: formData.price ? Number(formData.price) : undefined,
        custom_attributes: customAttributes,
        inventories: payloadInventories.length > 0 ? payloadInventories : undefined,
      } as any);

      if (res?.id && selectedTagIds.length > 0) {
        await API.post("/tags/entity", {
          entity_type: "product",
          entity_id: res.id,
          tag_ids: selectedTagIds,
        }).catch(() => {});
      }

      navigate("/products");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create product", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
          Dashboard
        </Link>
        <span>/</span>
        <Link to="/products" className="text-[#0e90d9] hover:underline">
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Create Product</span>
      </div>

      {/* Header with Title & Action Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Create Product
        </h1>
        <div className="flex items-center gap-3">
          <Link
            to="/products"
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
            Save Products
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Main: General & Custom Attributes & Tags) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-3 border-b border-gray-100 dark:border-gray-700">
              General
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Breach Watch"
                className={`w-full px-3.5 py-2 bg-white dark:bg-gray-900 border ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200 transition`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product details and description..."
                className="w-full px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0e90d9] dark:text-gray-200 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value });
                  if (errors.sku) setErrors((prev) => ({ ...prev, sku: "" }));
                }}
                placeholder="e.g. 109"
                className={`w-full px-3.5 py-2 bg-white dark:bg-gray-900 border ${
                  errors.sku ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200 transition`}
              />
              {errors.sku && <p className="mt-1 text-xs text-red-500 font-medium">{errors.sku}</p>}
            </div>
          </div>

          {/* Dynamic Custom Attributes for Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <DynamicAttributeFields
              entityType="products"
              values={customAttributes}
              onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
            />
          </div>

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700">
              Tags
            </h2>
            <TagPicker selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
          </div>
        </div>

        {/* Right Column (Sidebar: Price & Warehouse Inventories) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Price Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsPriceOpen(!isPriceOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gray-50/70 dark:bg-gray-800/80 hover:bg-gray-100/60 dark:hover:bg-gray-700/50 transition border-b border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Price</h2>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isPriceOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {isPriceOpen && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.price}
                    onChange={(e) => {
                      setFormData({ ...formData, price: e.target.value });
                      if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
                    }}
                    placeholder="1200.5000"
                    className={`w-full px-3.5 py-2 bg-white dark:bg-gray-900 border ${
                      errors.price ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                    } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200 transition`}
                  />
                  {errors.price && <p className="mt-1 text-xs text-red-500 font-medium">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => {
                      setFormData({ ...formData, quantity: e.target.value });
                      if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: "" }));
                    }}
                    placeholder="1000"
                    className={`w-full px-3.5 py-2 bg-white dark:bg-gray-900 border ${
                      errors.quantity ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                    } rounded-lg text-sm focus:outline-none focus:ring-1 dark:text-gray-200 transition`}
                  />
                  {errors.quantity && <p className="mt-1 text-xs text-red-500 font-medium">{errors.quantity}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Warehouse Inventories Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsInventoryOpen(!isInventoryOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gray-50/70 dark:bg-gray-800/80 hover:bg-gray-100/60 dark:hover:bg-gray-700/50 transition border-b border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Warehouse Stock
                </span>
                {inventoryRows.length > 0 && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-[#0e90d9] px-2 py-0.5 rounded-full font-medium">
                    {inventoryRows.length} locations
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isInventoryOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {isInventoryOpen && (
              <div className="p-4 space-y-3">
                {loadingWarehouses ? (
                  <div className="py-4 text-center text-xs text-gray-400">Loading warehouses...</div>
                ) : inventoryRows.length === 0 ? (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No warehouses configured yet.
                    </p>
                    <Link
                      to="/settings/warehouses/create"
                      className="text-xs text-[#0e90d9] hover:underline font-medium block"
                    >
                      + Add Warehouse in Settings
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {inventoryRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {row.warehouse_name}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            {row.warehouse_location_name}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                              In Stock
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={row.in_stock}
                              onChange={(e) => handleInventoryChange(idx, "in_stock", Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0e90d9] dark:text-gray-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-1">
                              Allocated
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={row.allocated}
                              onChange={(e) => handleInventoryChange(idx, "allocated", Number(e.target.value))}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0e90d9] dark:text-gray-200"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 text-right">
                      <Link
                        to="/settings/warehouses"
                        className="text-xs text-[#0e90d9] hover:underline font-medium"
                      >
                        Manage Warehouses &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
