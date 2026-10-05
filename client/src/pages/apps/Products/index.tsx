import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import API from "@/config";
import { useProductStore } from "@/store";
import { IProduct } from "@/interface";
import { usePermission } from "@/hooks/usePermission";

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
      const [fullProduct, tagsRes] = await Promise.all([
        fetchProductById(product.id),
        API.get(`/tags/entity/product/${product.id}`).catch(() => ({ data: { data: [] } })),
      ]);

      if (fullProduct) {
        setViewingProduct(fullProduct);
      }
      if (tagsRes.data?.data) {
        setViewingTags(tagsRes.data.data);
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
        fetchProducts(page, perPage, search);
      } catch (e: any) {
        Swal.fire("Error", e.message || "Failed to delete product", "error");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Products</h1>
        {canCreate && (
          <Link
            to="/products/create"
            className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Create Product
          </Link>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-56 dark:text-gray-200"
            />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
            >
              <option value="all">📦 All Products</option>
              <option value="sellable">✅ Ready to Sell (In Stock)</option>
              <option value="out_of_stock">⚠️ Out of Stock</option>
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd]"
            >
              Filter
            </button>
          </form>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Quantity / Status</th>
                <th className="py-3 px-4 font-semibold">Price</th>
                <th className="py-3 px-4 font-semibold">Created At</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : (() => {
                const displayedProducts = products.filter((p) => {
                  const q = Number(p.quantity) || 0;
                  if (stockFilter === "sellable") return q > 0;
                  if (stockFilter === "out_of_stock") return q <= 0;
                  return true;
                });

                if (displayedProducts.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm font-medium">
                        No Records Available.
                      </td>
                    </tr>
                  );
                }

                return displayedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono text-xs text-gray-700 dark:text-gray-300 font-semibold">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#0088cc]">
                      <button
                        onClick={() => openViewModal(p)}
                        className="hover:underline text-left font-semibold"
                      >
                        {p.name || "-"}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {Number(p.quantity) > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold rounded-full text-xs border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {p.quantity} In Stock (Sellable)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 font-bold rounded-full text-xs border border-red-200 dark:border-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                      ${Number(p.price || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {canView && (
                        <button
                          onClick={() => openViewModal(p)}
                          className="text-gray-500 hover:text-[#0088cc] p-1 inline-block"
                          title="View Product Details"
                        >
                          <i className="mgc_eye_line text-base"></i>
                        </button>
                      )}
                      {canEdit && (
                        <Link
                          to={`/products/edit/${p.id}`}
                          className="text-gray-500 hover:text-[#0088cc] p-1 inline-block"
                          title="Edit Product"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(p)}
                          className="text-gray-500 hover:text-red-600 p-1 inline-block"
                          title="Delete Product"
                        >
                          <i className="mgc_delete_line text-base"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>
              {products.length > 0
                ? `${(page - 1) * perPage + 1} – ${Math.min(page * perPage, total)} of ${total}`
                : `0 of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="px-2 font-semibold text-gray-800 dark:text-gray-200">
                {page} / {Math.ceil(total / perPage)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(total / perPage), p + 1))}
                disabled={page >= Math.ceil(total / perPage)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW PRODUCT DETAILS MODAL */}
      {isViewModalOpen && viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc]">
                  <i className="mgc_box_3_line text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {viewingProduct.name || "Product Details"}
                  </h2>
                  <p className="text-xs font-mono text-gray-500">
                    SKU: {viewingProduct.sku || "-"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
              >
                <i className="mgc_close_line text-2xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {viewModalLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mb-2"></div>
                  <p className="text-xs">Loading product stock details...</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">SKU</div>
                      <div className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 mt-1">
                        {viewingProduct.sku || "-"}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Price</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        ${Number(viewingProduct.price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] text-gray-500 uppercase font-semibold">Total Stock</div>
                      <div className="text-xs font-bold text-[#0088cc] mt-1">
                        {viewingProduct.quantity ?? 0} units
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
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full text-white font-semibold shadow-xs"
                            style={{ backgroundColor: tag.color || "#0088cc" }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Warehouse Stock Breakdown */}
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
                      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
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

                  {/* Custom Attributes */}
                  {viewingProduct.custom_attributes && typeof viewingProduct.custom_attributes === "object" && Object.keys(viewingProduct.custom_attributes).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Custom Attributes
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(viewingProduct.custom_attributes).map(([key, val]) => (
                          <div key={key} className="p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="text-[10px] text-gray-400 uppercase font-semibold">{key}</div>
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">
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
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/50">
              {canEdit && (
                <Link
                  to={`/products/edit/${viewingProduct.id}`}
                  className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <i className="mgc_edit_line text-sm"></i>
                  Edit This Product
                </Link>
              )}
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg transition-colors"
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
