import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useProductStore, useWarehouseStore, useTagStore } from "@/store";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { productSchema } from "@/schemas";
import { TagPicker } from "@/components/TagPicker";
import { IWarehouse, WarehouseInventoryRow } from "@/interface";

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
    type: "Product",
    description: "",
    quantity: "0",
    price: "",
  });

  // Warehouses & Multi-Warehouse Inventories
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [inventoryRows, setInventoryRows] = useState<WarehouseInventoryRow[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState<boolean>(false);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>("all");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const list = await useWarehouseStore.getState().fetchWarehouses();
      setWarehouses(list || []);

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
    const isService = formData.type === "Service";
    const validation = productSchema.safeParse({
      sku: formData.sku.trim(),
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description || undefined,
      quantity: isService ? "0" : formData.quantity,
      price: formData.price,
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
        sku: validation.data.sku,
        name: validation.data.name,
        type: validation.data.type,
        description: validation.data.description || undefined,
        quantity: isService ? "0" : validation.data.quantity,
        price: validation.data.price,
        custom_attributes: customAttributes,
        inventories: isService ? undefined : payloadInventories.length > 0 ? payloadInventories : undefined,
      } as any);

      if (res?.id && selectedTagIds.length > 0) {
        await useTagStore.getState().saveEntityTags("product", res.id, selectedTagIds);
      }

      navigate("/products");
    } catch (error: any) {
      Swal.fire("Error", error.message || "Failed to create product", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/products" className="text-[#0e90d9] hover:underline">
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Create Product</span>
      </div>

      {/* 🏷️ Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Create Product
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Add a new product or service with custom pricing and multi-warehouse stock
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/products"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-2xs"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            <span>Save Product</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Main: General & Custom Attributes & Tags) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 sm:p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-3 border-b border-gray-100 dark:border-gray-700">
              General Information
            </h2>

            {/* Product Type Switch on Top */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                Product Type <span className="text-red-500">*</span>
              </label>
              <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "Product" })}
                  className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                    formData.type === "Product"
                      ? "bg-[#0e90d9] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  📦 Physical Product
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "Service" })}
                  className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                    formData.type === "Service"
                      ? "bg-[#0e90d9] text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  ⚡ Service
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Breach Watch Annual License"
                className={`w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                } rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 dark:text-gray-200 transition`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
            </div>

            {/* SKU Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                SKU / Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value });
                  if (errors.sku) setErrors((prev) => ({ ...prev, sku: "" }));
                }}
                placeholder="e.g. PRD-1092"
                className={`w-full px-3.5 py-2.5 font-mono bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border ${
                  errors.sku ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                } rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 dark:text-gray-200 transition`}
              />
              {errors.sku && <p className="mt-1 text-xs text-red-500 font-medium">{errors.sku}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed product specifications and features..."
                className="w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0e90d9] dark:text-gray-200 transition"
              />
            </div>
          </div>

          {/* Dynamic Custom Attributes for Products - zero empty box when none */}
          <DynamicAttributeFields
            entityType="products"
            containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 sm:p-6"
            values={customAttributes}
            onChange={(code, val) => {
              setCustomAttributes((prev) => ({ ...prev, [code]: val }));
              if (errors[code]) setErrors((prev) => ({ ...prev, [code]: "" }));
            }}
            errors={errors}
          />

          {/* Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700">
              Tags
            </h2>
            <TagPicker selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
          </div>
        </div>

        {/* Right Column (Sidebar: Price & Warehouse Inventories) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Price Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
            <div
              onClick={() => setIsPriceOpen(!isPriceOpen)}
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gray-50/70 dark:bg-gray-800/80 hover:bg-gray-100/60 dark:hover:bg-gray-700/50 transition border-b border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <i className="mgc_currency_rupee_line text-base text-[#0e90d9]"></i>
                Pricing
              </h2>
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
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({ ...formData, price: e.target.value });
                        if (errors.price) setErrors((prev) => ({ ...prev, price: "" }));
                      }}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 border ${
                        errors.price ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-[#0e90d9]"
                      } rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 dark:text-gray-200 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                  </div>
                  {errors.price && <p className="mt-1 text-xs text-red-500 font-medium">{errors.price}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Warehouse Inventories Section (Physical Products only) */}
          {formData.type !== "Service" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
              <div
                onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none bg-gray-50/70 dark:bg-gray-800/80 hover:bg-gray-100/60 dark:hover:bg-gray-700/50 transition border-b border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <i className="mgc_store_2_line text-base text-[#0e90d9]"></i>
                    Warehouse Stock
                  </span>
                  {inventoryRows.length > 0 && (
                    <span className="text-[11px] bg-blue-100 dark:bg-blue-900/50 text-[#0e90d9] px-2 py-0.5 rounded-full font-medium">
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
                    <div className="space-y-3">
                      {/* Warehouse Selector Dropdown Filter (Single-line inline alignment) */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-200 dark:border-gray-700">
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 shrink-0">
                          <i className="mgc_filter_line text-sm text-[#0e90d9]"></i>
                          <span>Filter Warehouse:</span>
                        </label>
                        <select
                          value={selectedWarehouseFilter}
                          onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0e90d9] transition shrink-0 max-w-[170px]"
                        >
                          <option value="all">All Warehouses</option>
                          {warehouses.map((w) => (
                            <option key={w.id} value={String(w.id)}>
                              {w.name} ({Array.isArray(w.locations) ? w.locations.length : 1} loc)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-0.5">
                        {(() => {
                          const groupedMap = inventoryRows.reduce((acc, row, idx) => {
                            const wKey = row.warehouse_id;
                            if (!acc[wKey]) {
                              acc[wKey] = {
                                warehouse_id: row.warehouse_id,
                                warehouse_name: row.warehouse_name,
                                items: [],
                              };
                            }
                            acc[wKey].items.push({ row, index: idx });
                            return acc;
                          }, {} as Record<number, { warehouse_id: number; warehouse_name: string; items: { row: WarehouseInventoryRow; index: number }[] }>);

                          const allGroups = Object.values(groupedMap);
                          const filteredGroups = selectedWarehouseFilter === "all"
                            ? allGroups
                            : allGroups.filter((g) => String(g.warehouse_id) === selectedWarehouseFilter);

                          if (filteredGroups.length === 0) {
                            return (
                              <div className="py-4 text-center text-xs text-gray-400">
                                No locations found for selected warehouse.
                              </div>
                            );
                          }

                          return filteredGroups.map((group) => {
                            const warehouseStockTotal = group.items.reduce(
                              (sum, item) => sum + (Number(item.row.in_stock) || 0),
                              0
                            );
                            return (
                              <div
                                key={group.warehouse_id}
                                className="bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-2xs"
                              >
                                <div className="px-3.5 py-2.5 bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-1.5 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-gray-800 dark:text-gray-100 truncate">
                                      {group.warehouse_name}
                                    </span>
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-[#0e90d9] dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full shrink-0">
                                      {group.items.length} {group.items.length === 1 ? "location" : "locations"}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-gray-500 font-medium shrink-0">
                                    Total: <strong className="text-gray-800 dark:text-gray-200">{warehouseStockTotal}</strong>
                                  </span>
                                </div>

                                <div className="p-2.5">
                                  <table className="w-full table-fixed text-xs border-collapse">
                                    <colgroup>
                                      <col className="w-[42%]" />
                                      <col className="w-[29%]" />
                                      <col className="w-[29%]" />
                                    </colgroup>
                                    <thead>
                                      <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200/80 dark:border-gray-700/80 text-[11px]">
                                        <th className="pb-2 px-2 font-semibold text-left">Location</th>
                                        <th className="pb-2 px-1 font-semibold text-center">In Stock</th>
                                        <th className="pb-2 px-1 font-semibold text-center">Allocated</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/40 dark:divide-gray-700/40">
                                      {group.items.map(({ row, index }) => (
                                        <tr key={index} className="hover:bg-gray-100/40 dark:hover:bg-gray-800/40">
                                          <td className="py-2.5 px-2 font-medium text-[11px] text-gray-700 dark:text-gray-300 truncate" title={row.warehouse_location_name}>
                                            {row.warehouse_location_name}
                                          </td>
                                          <td className="py-2.5 px-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={row.in_stock}
                                              onChange={(e) =>
                                                handleInventoryChange(index, "in_stock", Number(e.target.value))
                                              }
                                              className="w-full max-w-[76px] mx-auto px-2 py-1.5 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0e90d9] dark:text-gray-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                          </td>
                                          <td className="py-2.5 px-1 text-center">
                                            <input
                                              type="number"
                                              min="0"
                                              value={row.allocated}
                                              onChange={(e) =>
                                                handleInventoryChange(index, "allocated", Number(e.target.value))
                                              }
                                              className="w-full max-w-[76px] mx-auto px-2 py-1.5 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0e90d9] dark:text-gray-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          });
                        })()}
                        <div className="pt-2 text-right">
                          <Link
                            to="/settings/warehouses"
                            className="text-xs text-[#0e90d9] hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>Manage Warehouses</span>
                            <i className="mgc_arrow_right_line text-xs"></i>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
