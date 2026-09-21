import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { IWarehouse } from "@/interface";

const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // View Modal
  const [viewingWarehouse, setViewingWarehouse] = useState<IWarehouse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await API.get("/warehouse/").catch(() => ({ data: { data: [] } }));
      const list = res.data?.data || [];
      setWarehouses(list);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = (item: IWarehouse) => {
    setViewingWarehouse(item);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (item: IWarehouse) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: 'Do you really want to delete warehouse "' + item.name + '"?',
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await API.delete("/warehouse/" + item.id);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Warehouse deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchWarehouses();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete warehouse", "error");
      }
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredWarehouses.map((w) => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredWarehouses = warehouses.filter((w) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      w.name?.toLowerCase().includes(s) ||
      w.contact_name?.toLowerCase().includes(s) ||
      w.description?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil(filteredWarehouses.length / perPage) || 1;
  const paginatedWarehouses = filteredWarehouses.slice((page - 1) * perPage, page * perPage);
  const isAllSelected = paginatedWarehouses.length > 0 && paginatedWarehouses.every((w) => selectedIds.includes(w.id));

  const formatEmail = (val: any) => {
    if (!val) return "-";
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      return typeof first === "object" ? first.value || first.email || "-" : String(first);
    }
    return typeof val === "string" ? val : "-";
  };

  const formatPhone = (val: any) => {
    if (!val) return "-";
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0];
      return typeof first === "object" ? first.value || first.number || "-" : String(first);
    }
    return typeof val === "string" ? val : "-";
  };

  const formatCityState = (addr: any) => {
    if (!addr) return "-";
    let parsed = addr;
    if (typeof addr === "string") {
      try {
        parsed = JSON.parse(addr);
      } catch {
        return addr;
      }
    }
    const parts = [parsed.city, parsed.state, parsed.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "-";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs and Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Warehouses</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Warehouses
          </h1>
        </div>

        <div>
          <Link
            to="/settings/warehouses/create"
            className="inline-flex items-center px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <i className="mgc_add_line text-base mr-1.5"></i>
            Create Warehouse
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <i className="mgc_search_line text-base"></i>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search warehouses..."
              className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-64 dark:text-gray-200 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 w-16">ID</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Warehouse Name</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Contact Person</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Email & Phone</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Location</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Locations</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 text-right w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading warehouses...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                        <i className="mgc_box_3_line text-2xl"></i>
                      </div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">No warehouses found</span>
                      <p className="text-xs text-gray-400">Add a new warehouse to start managing inventory stock locations.</p>
                      <Link
                        to="/settings/warehouses/create"
                        className="mt-2 text-xs font-semibold text-[#0088cc] hover:underline"
                      >
                        + Create Warehouse
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedWarehouses.map((warehouse) => {
                  const isSelected = selectedIds.includes(warehouse.id);
                  return (
                    <tr
                      key={warehouse.id}
                      className={"border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors " + (isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : "")}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(warehouse.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {warehouse.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => openViewModal(warehouse)}
                          className="hover:text-[#0088cc] transition-colors font-semibold text-left flex items-center gap-1.5 text-gray-900 dark:text-gray-100"
                        >
                          <i className="mgc_box_3_line text-[#0088cc] text-base"></i>
                          {warehouse.name}
                        </button>
                        {warehouse.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs pl-5">
                            {warehouse.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {warehouse.contact_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                        <div>{formatEmail(warehouse.contact_emails)}</div>
                        <div className="text-gray-400">{formatPhone(warehouse.contact_numbers)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-300">
                        {formatCityState(warehouse.contact_address)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#0088cc] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {warehouse.location_count || 0} locations
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openViewModal(warehouse)}
                          className="inline-flex items-center text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 p-1.5 rounded-lg transition-colors"
                          title="View Warehouse Details"
                        >
                          <i className="mgc_eye_line text-base"></i>
                        </button>
                        <Link
                          to={"/settings/warehouses/edit/" + warehouse.id}
                          className="inline-flex items-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg transition-colors"
                          title="Edit Warehouse"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(warehouse)}
                          className="inline-flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"
                          title="Delete Warehouse"
                        >
                          <i className="mgc_delete_2_line text-base"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing {filteredWarehouses.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
            {Math.min(page * perPage, filteredWarehouses.length)} of {filteredWarehouses.length} warehouses
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* VIEW WAREHOUSE DETAILS MODAL */}
      {isViewModalOpen && viewingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc]">
                  <i className="mgc_box_3_line text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {viewingWarehouse.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    ID #{viewingWarehouse.id} • Managed by {viewingWarehouse.contact_name}
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

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Description */}
              {viewingWarehouse.description && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Description
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    {viewingWarehouse.description}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Contact Details</span>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {viewingWarehouse.contact_name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {formatEmail(viewingWarehouse.contact_emails)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {formatPhone(viewingWarehouse.contact_numbers)}
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">Physical Address</span>
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    {formatCityState(viewingWarehouse.contact_address)}
                  </div>
                </div>
              </div>

              {/* Locations List */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Storage Locations ({viewingWarehouse.locations?.length || viewingWarehouse.location_count || 0})
                </h3>
                {viewingWarehouse.locations && viewingWarehouse.locations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingWarehouse.locations.map((loc: any, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-[#0088cc] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        <i className="mgc_map_pin_line text-sm"></i>
                        {typeof loc === "object" ? loc.name : String(loc)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No specific storage locations recorded.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
              <Link
                to={"/settings/warehouses/edit/" + viewingWarehouse.id}
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Edit Warehouse
              </Link>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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

export default WarehousesPage;
