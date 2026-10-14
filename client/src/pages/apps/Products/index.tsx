import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useProductStore, useTagStore } from "@/store";
import { IProduct } from "@/interface";
import { usePermission } from "@/hooks/usePermission";

const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-purple-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-teal-600 text-white",
  "bg-rose-500 text-white",
  "bg-indigo-600 text-white",
  "bg-cyan-600 text-white",
];

const getInitials = (name?: string, fallback = "PR") => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ProductsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("products.create");
  const canEdit = hasPermission("products.edit");
  const canDelete = hasPermission("products.delete");
  const canView = hasPermission("products.view");

  const { products, total, loading, fetchProducts, deleteProduct, fetchProductById } = useProductStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [stockFilter, setStockFilter] = useState<"all" | "sellable" | "out_of_stock">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table"
  );

  // View Modal State
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [viewingTags, setViewingTags] = useState<any[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [viewModalLoading, setViewModalLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts(page, perPage, search);
  }, [page, perPage]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts(1, perPage, search);
  };

  const openViewModal = async (product: IProduct) => {
    setIsViewModalOpen(true);
    setViewModalLoading(true);
    setViewingProduct(product);
    setViewingTags([]);

    try {
      const [fullProduct, tags] = await Promise.all([
        fetchProductById(product.id),
        useTagStore.getState().fetchEntityTags("product", product.id),
      ]);

      if (fullProduct) {
        setViewingProduct(fullProduct);
      }
      if (tags) {
        setViewingTags(tags);
      }
    } catch {
      // Keep basic product info
    } finally {
      setViewModalLoading(false);
    }
  };

  const handleDelete = async (product: IProduct) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete product "${product.name || product.sku}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0088cc",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteProduct(product.id);
        setSelectedIds((prev) => prev.filter((id) => id !== product.id));
        fetchProducts(page, perPage, search);
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to delete product", "error");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected product(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => deleteProduct(id)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${selectedIds.length} product(s) deleted successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchProducts(page, perPage, search);
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.message || err.message || "Failed to delete products", "error");
      }
    }
  };

  const handleExport = () => {
    if (products.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }
    const headers = ["ID", "SKU", "Name", "Type", "Quantity", "Price", "Created At"];
    const rows = products.map((p) => [
      p.id,
      `"${(p.sku || "").replace(/"/g, '""')}"`,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.type || "").replace(/"/g, '""')}"`,
      p.quantity ?? 0,
      Number(p.price || 0).toFixed(2),
      `"${p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter products by stock filter
  const displayedProducts = products.filter((p) => {
    const q = Number(p.quantity) || 0;
    if (stockFilter === "sellable") return q > 0;
    if (stockFilter === "out_of_stock") return q <= 0;
    return true;
  });

  const isAllSelected = displayedProducts.length > 0 && displayedProducts.every((p) => selectedIds.includes(p.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedProducts.map((p) => p.id));
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;

  // Responsive Full-Detail Product Card
  const renderProductCard = (p: IProduct, idx: number) => {
    const isSelected = selectedIds.includes(p.id);
    const avatarColor = AVATAR_COLORS[(p.id || idx) % AVATAR_COLORS.length];
    const isService = p.type?.toLowerCase() === "service";
    const qty = Number(p.quantity) || 0;

    return (
      <div
        key={p.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + SKU Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectRow(p.id)}
              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
            />
            <div
              onClick={() => openViewModal(p)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {isService ? (
                  <i className="mgc_tool_line text-lg"></i>
                ) : (
                  getInitials(p.name, "PR")
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {p.name || "Untitled Product"}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/50">
                    #{p.sku || p.id}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.2 rounded-full text-[11px] font-semibold ${
                      isService
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {p.type || "Product"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              ₹{Number(p.price || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Middle Body: Stock Status, Description & Date */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* Stock / Quantity Status */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Inventory:</span>
            {isService ? (
              <span className="text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full text-xs border border-purple-200 dark:border-purple-800">
                Service (No inventory)
              </span>
            ) : qty > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-full text-xs border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {qty} In Stock (Sellable)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold rounded-full text-xs border border-red-200 dark:border-red-800">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Out of Stock
              </span>
            )}
          </div>

          {/* Description (if available) */}
          {p.description && (
            <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed">
              {p.description}
            </p>
          )}

          {/* Created Date */}
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500 text-[11px] pt-0.5">
            <span className="flex items-center gap-1">
              <i className="mgc_calendar_line text-xs"></i>
              <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</span>
            </span>
            <span className="text-gray-500 font-medium font-mono text-[11px]">
              ID: {p.id}
            </span>
          </div>
        </div>

        {/* Bottom Row: Type / Stock Pill + Quick Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
              <i className="mgc_box_3_line text-xs shrink-0"></i>
              <span>{isService ? "Service" : `${qty} units`}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <button
                type="button"
                onClick={() => openViewModal(p)}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="View Product"
              >
                <i className="mgc_eye_line text-sm"></i>
              </button>
            )}
            {canEdit && (
              <Link
                to={`/products/edit/${p.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Product"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(p)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Product"
              >
                <i className="mgc_delete_line text-sm"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🏷️ Header Card with Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-300 shadow-2xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to="/dashboard" className="text-[#0e90d9] hover:underline">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">Products</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Products
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition"
            >
              <i className="mgc_delete_line text-base mr-1.5"></i>
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 transition shadow-2xs"
          >
            <i className="mgc_download_line text-base mr-1.5 text-gray-500"></i>
            Export
          </button>
          {canCreate && (
            <Link
              to="/products/create"
              className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Create Product
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, Filters, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-44 sm:w-56 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 transition"
            >
              <option value="all">📦 All Products</option>
              <option value="sellable">✅ In Stock</option>
              <option value="out_of_stock">⚠️ Out of Stock</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-xs sm:text-sm rounded-xl border border-[#bae6fd] transition shadow-2xs"
            >
              Filter
            </button>
          </form>

          {/* Right side: View Mode, Per Page & Pagination controls */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700/60 p-0.5 rounded-xl border border-gray-200/80 dark:border-gray-600">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Cards View"
              >
                <i className="mgc_grid_2_line text-sm"></i>
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                title="Table View"
              >
                <i className="mgc_table_line text-sm"></i>
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Previous Page"
              >
                <i className="mgc_left_line text-base"></i>
              </button>
              <button
                type="button"
                disabled={products.length < perPage || page * perPage >= total}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Next Page"
              >
                <i className="mgc_right_line text-base"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{displayedProducts.length}</strong> {displayedProducts.length === 1 ? "product" : "products"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading products...</p>
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW (Full details matching desktop info in clean responsive cards) */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {displayedProducts.map((product, idx) => renderProductCard(product, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW (With Full-Detail Mobile Cards Fallback) */
          <>
            {/* Mobile Fallback Cards for Table View */}
            <div className="block md:hidden p-3 space-y-3">
              {displayedProducts.map((product, idx) => renderProductCard(product, idx))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Type</th>
                    <th className="py-3 px-4 font-semibold">Quantity / Status</th>
                    <th className="py-3 px-4 font-semibold">Price</th>
                    <th className="py-3 px-4 font-semibold">Created At</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {displayedProducts.map((p, idx) => {
                    const isSelected = selectedIds.includes(p.id);
                    const avatarColor = AVATAR_COLORS[(p.id || idx) % AVATAR_COLORS.length];
                    const isService = p.type?.toLowerCase() === "service";
                    const qty = Number(p.quantity) || 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(p.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0088cc] dark:text-[#38bdf8] font-bold">
                          {p.sku || `#${p.id}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {isService ? (
                                <i className="mgc_tool_line text-sm"></i>
                              ) : (
                                getInitials(p.name, "PR")
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => openViewModal(p)}
                              className="font-semibold text-[#0088cc] dark:text-[#38bdf8] hover:underline text-left"
                            >
                              {p.name || "-"}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isService
                                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            {p.type || "Product"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {isService ? (
                            <span className="text-gray-400 font-semibold px-2">-</span>
                          ) : qty > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-full text-xs border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {qty} In Stock (Sellable)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold rounded-full text-xs border border-red-200 dark:border-red-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                          ₹{Number(p.price || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => openViewModal(p)}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="View Product Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/products/edit/${p.id}`}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="Edit Product"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="text-gray-500 hover:text-red-600 p-1 inline-block transition-colors"
                              title="Delete Product"
                            >
                              <i className="mgc_delete_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <span>
              {displayedProducts.length > 0
                ? `${startIndex} – ${endIndex} of ${total}`
                : `0 of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                {page} / {Math.ceil(total / perPage)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                disabled={page >= Math.ceil(total / perPage)}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 VIEW PRODUCT DETAILS MODAL (Fully Mobile Responsive) */}
      {isViewModalOpen && viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] shrink-0">
                  <i className="mgc_box_3_line text-xl sm:text-2xl"></i>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {viewingProduct.name || "Product Details"}
                  </h2>
                  <p className="text-xs font-mono text-gray-500">
                    SKU: {viewingProduct.sku || `#${viewingProduct.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm">
              {viewModalLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mb-2"></div>
                  <p className="text-xs">Loading product details...</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">SKU</div>
                      <div className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {viewingProduct.sku || "-"}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Price</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        ₹{Number(viewingProduct.price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Total Stock</div>
                      <div className="text-xs font-bold text-[#0088cc] mt-1">
                        {viewingProduct.type?.toLowerCase() === "service" ? "-" : `${viewingProduct.quantity ?? 0} units`}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Created Date</div>
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">
                        {viewingProduct.created_at ? new Date(viewingProduct.created_at).toLocaleDateString() : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {viewingProduct.description && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Description
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                        {viewingProduct.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {viewingTags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {viewingTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full text-white font-semibold shadow-2xs"
                            style={{ backgroundColor: tag.color || "#0088cc" }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Warehouse Stock Breakdown */}
                  {viewingProduct.type?.toLowerCase() !== "service" && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                        <span>Warehouse Stock Breakdown</span>
                        {Array.isArray(viewingProduct.inventories) && (
                          <span className="text-[11px] text-[#0088cc] font-medium lowercase">
                            {viewingProduct.inventories.length} location(s)
                          </span>
                        )}
                      </h3>

                      {!Array.isArray(viewingProduct.inventories) || viewingProduct.inventories.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                          No warehouse inventory assigned yet.
                        </div>
                      ) : (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse min-w-[340px]">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                <th className="py-2.5 px-4 font-semibold">Warehouse</th>
                                <th className="py-2.5 px-4 font-semibold">Location</th>
                                <th className="py-2.5 px-4 font-semibold text-center">In Stock</th>
                                <th className="py-2.5 px-4 font-semibold text-center">Allocated</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                              {viewingProduct.inventories.map((inv: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-750">
                                  <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                                    {inv.warehouse_name || `Warehouse #${inv.warehouse_id}`}
                                  </td>
                                  <td className="py-2.5 px-4 text-gray-500 font-mono">
                                    {inv.warehouse_location_name || "Default Location"}
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                    {inv.in_stock || 0}
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                                    {inv.allocated || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Attributes */}
                  {viewingProduct.custom_attributes && typeof viewingProduct.custom_attributes === "object" && Object.keys(viewingProduct.custom_attributes).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Custom Attributes
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(viewingProduct.custom_attributes).map(([key, val]) => (
                          <div key={key} className="p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">{key}</div>
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5 break-words">
                              {typeof val === "object" ? JSON.stringify(val) : String(val)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/50">
              {canEdit && (
                <Link
                  to={`/products/edit/${viewingProduct.id}`}
                  className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <i className="mgc_edit_line text-sm"></i>
                  Edit This Product
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
