import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { useWarehouseStore } from "@/store";
import { IWarehouse, IWarehouseProduct } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { useResponsiveViewMode } from "@/hooks/useResponsiveViewMode";
import { ViewModeSwitcher } from "@/components/ViewModeSwitcher";

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

const getInitials = (name?: string, fallback = "WH") => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const WarehousesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.warehouses.create");
  const canEdit = hasPermission("settings.warehouses.edit");
  const canDelete = hasPermission("settings.warehouses.delete");
  const canView = hasPermission("settings.warehouses.view");

  const [warehouses, setWarehouses] = useState<IWarehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { viewMode, setViewMode, setHasUserToggled } = useResponsiveViewMode();

  // View Modal
  const [viewingWarehouse, setViewingWarehouse] = useState<IWarehouse | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [viewingProducts, setViewingProducts] = useState<IWarehouseProduct[]>([]);
  const [viewingProductsLoading, setViewingProductsLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const list = await useWarehouseStore.getState().fetchWarehouses();
      setWarehouses(list || []);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (item: IWarehouse) => {
    setViewingWarehouse(item);
    setIsViewModalOpen(true);
    setViewingProducts([]);
    setViewingProductsLoading(true);
    try {
      const prods = await useWarehouseStore.getState().fetchWarehouseProducts(item.id);
      setViewingProducts(prods || []);
    } catch {
      setViewingProducts([]);
    } finally {
      setViewingProductsLoading(false);
    }
  };

  const handleDelete = async (item: IWarehouse) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete warehouse "${item.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await useWarehouseStore.getState().deleteWarehouse(item.id);
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected warehouse(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => useWarehouseStore.getState().deleteWarehouse(id)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${selectedIds.length} warehouse(s) deleted successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchWarehouses();
      } catch (err: any) {
        Swal.fire("Error", err?.response?.data?.message || "Failed to delete warehouses", "error");
      }
    }
  };

  const handleExport = () => {
    if (filteredWarehouses.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }
    const headers = ["ID", "Name", "Contact Name", "Contact Email", "Contact Phone", "Locations", "City/State"];
    const rows = filteredWarehouses.map((w) => [
      w.id,
      `"${(w.name || "").replace(/"/g, '""')}"`,
      `"${(w.contact_name || "").replace(/"/g, '""')}"`,
      `"${formatEmail(w.contact_emails).replace(/"/g, '""')}"`,
      `"${formatPhone(w.contact_numbers).replace(/"/g, '""')}"`,
      Array.isArray(w.locations) ? w.locations.length : 0,
      `"${formatCityState(w.contact_address || (w as any).address).replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warehouses_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const total = filteredWarehouses.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginatedWarehouses = filteredWarehouses.slice((page - 1) * perPage, page * perPage);
  const isAllSelected = paginatedWarehouses.length > 0 && paginatedWarehouses.every((w) => selectedIds.includes(w.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedWarehouses.map((w) => w.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;

  // Responsive Full-Detail Warehouse Card (Person-like card design)
  const renderWarehouseCard = (warehouse: IWarehouse, idx: number) => {
    const isSelected = selectedIds.includes(warehouse.id);
    const avatarColor = AVATAR_COLORS[(warehouse.id || idx) % AVATAR_COLORS.length];
    const locCount = Array.isArray(warehouse.locations) ? warehouse.locations.length : 0;
    const email = formatEmail(warehouse.contact_emails);
    const phone = formatPhone(warehouse.contact_numbers);
    const locationStr = formatCityState(warehouse.contact_address || (warehouse as any).address);

    return (
      <div
        key={warehouse.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(warehouse.id)}
              className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
            />
            <div
              onClick={() => openViewModal(warehouse)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(warehouse.name, "WH")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {warehouse.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Storage Facility
                </p>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #WH-{warehouse.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Contact Person, Phone, Email & Address */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* Contact Person */}
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <i className="mgc_user_3_line text-sm text-gray-400 shrink-0"></i>
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {warehouse.contact_name || <span className="text-gray-400 font-normal italic">No contact specified</span>}
            </span>
          </div>

          {/* Contact Numbers / Email */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-gray-600 dark:text-gray-300">
            {phone !== "-" && (
              <span className="flex items-center gap-1.5 font-bold text-[#0e90d9] dark:text-[#38bdf8]">
                <i className="mgc_phone_line text-xs shrink-0"></i>
                <span>{phone}</span>
              </span>
            )}
            {email !== "-" && (
              <span className="flex items-center gap-1.5 text-gray-500 truncate max-w-[180px]">
                <i className="mgc_mail_line text-xs shrink-0"></i>
                <span className="truncate">{email}</span>
              </span>
            )}
          </div>

          {/* Address */}
          {locationStr !== "-" && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <i className="mgc_location_line text-sm text-gray-400 shrink-0"></i>
              <span className="truncate">{locationStr}</span>
            </div>
          )}
        </div>

        {/* Bottom Row: Locations Pill + Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
            <i className="mgc_store_2_line text-xs shrink-0"></i>
            <span>{locCount} {locCount === 1 ? "Location" : "Locations"}</span>
          </span>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <button
                type="button"
                onClick={() => openViewModal(warehouse)}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="View Warehouse Details"
              >
                <i className="mgc_eye_line text-sm"></i>
              </button>
            )}
            {canEdit && (
              <Link
                to={`/settings/warehouses/edit/${warehouse.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Warehouse"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(warehouse)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Warehouse"
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
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0e90d9] hover:underline">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Warehouses</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Warehouses
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage distribution facilities, storage locations, and product inventories
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-base"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-base text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <Link
              to="/settings/warehouses/create"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Warehouse</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
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
              className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-48 sm:w-64 dark:text-gray-200 placeholder-gray-400 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            {/* View Mode Switcher */}
            <ViewModeSwitcher
              viewMode={viewMode}
              onViewModeChange={(m) => {
                setHasUserToggled(true);
                setViewMode(m);
              }}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 pl-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0088cc] cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors shadow-2xs"
                title="Previous Page"
              >
                <i className="mgc_left_line text-base"></i>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors shadow-2xs"
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
            Showing <strong className="text-gray-800 dark:text-gray-200">{paginatedWarehouses.length}</strong> {paginatedWarehouses.length === 1 ? "warehouse" : "warehouses"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading warehouses...</p>
          </div>
        ) : paginatedWarehouses.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedWarehouses.map((warehouse, idx) => renderWarehouseCard(warehouse, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW */
          <div className="overflow-x-auto">
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
                    <th className="py-3 px-4 font-semibold w-16">ID</th>
                    <th className="py-3 px-4 font-semibold">Warehouse Name</th>
                    <th className="py-3 px-4 font-semibold">Contact Person</th>
                    <th className="py-3 px-4 font-semibold">Phone / Email</th>
                    <th className="py-3 px-4 font-semibold">City / State</th>
                    <th className="py-3 px-4 font-semibold text-center">Locations</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginatedWarehouses.map((warehouse, idx) => {
                    const isSelected = selectedIds.includes(warehouse.id);
                    const avatarColor = AVATAR_COLORS[(warehouse.id || idx) % AVATAR_COLORS.length];
                    const locCount = Array.isArray(warehouse.locations) ? warehouse.locations.length : 0;
                    const email = formatEmail(warehouse.contact_emails);
                    const phone = formatPhone(warehouse.contact_numbers);
                    const locationStr = formatCityState(warehouse.contact_address || (warehouse as any).address);

                    return (
                      <tr
                        key={warehouse.id}
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(warehouse.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc]"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#0088cc] dark:text-[#38bdf8] font-bold">
                          #{warehouse.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarColor}`}>
                              {getInitials(warehouse.name, "WH")}
                            </span>
                            <button
                              type="button"
                              onClick={() => openViewModal(warehouse)}
                              className="font-semibold text-gray-900 dark:text-gray-100 hover:text-[#0088cc] dark:hover:text-[#38bdf8] hover:underline text-left"
                            >
                              {warehouse.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-medium">
                          {warehouse.contact_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="space-y-0.5">
                            {phone !== "-" && <div className="font-semibold text-[#0e90d9]">{phone}</div>}
                            {email !== "-" && <div className="text-gray-500">{email}</div>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                          {locationStr}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                            {locCount} locations
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => openViewModal(warehouse)}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="View Warehouse Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/settings/warehouses/edit/${warehouse.id}`}
                              className="text-gray-500 hover:text-[#0088cc] p-1 inline-block transition-colors"
                              title="Edit Warehouse"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(warehouse)}
                              className="text-gray-500 hover:text-red-600 p-1 inline-block transition-colors"
                              title="Delete Warehouse"
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
        )}

        {/* 📄 Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <span>
              {startIndex} – {endIndex} of {total}
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
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 VIEW WAREHOUSE MODAL (Fully Mobile Responsive) */}
      {isViewModalOpen && viewingWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] shrink-0">
                  <i className="mgc_store_2_line text-xl sm:text-2xl"></i>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                    {viewingWarehouse.name}
                  </h2>
                  <p className="text-xs font-mono text-gray-500">
                    ID: #{viewingWarehouse.id}
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Contact</div>
                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1 truncate">
                    {viewingWarehouse.contact_name || "-"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Phone</div>
                  <div className="text-xs font-bold text-[#0088cc] mt-1 truncate">
                    {formatPhone(viewingWarehouse.contact_numbers)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] text-gray-500 uppercase font-semibold">Locations</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {Array.isArray(viewingWarehouse.locations) ? viewingWarehouse.locations.length : 0} defined
                  </div>
                </div>
              </div>

              {/* Address & Email */}
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <i className="mgc_mail_line text-sm text-gray-400"></i>
                    <span>Email: <strong>{formatEmail(viewingWarehouse.contact_emails)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <i className="mgc_location_line text-sm text-gray-400"></i>
                    <span>Address: <strong>{formatCityState(viewingWarehouse.contact_address || (viewingWarehouse as any).address)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Stored Products Inventory Breakdown */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Current Inventory in Warehouse</span>
                  <span className="text-[11px] text-[#0088cc] font-medium lowercase">
                    {viewingProducts.length} item(s)
                  </span>
                </h3>

                {viewingProductsLoading ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-[#0088cc] border-t-transparent mb-1.5"></div>
                    <p>Loading inventory...</p>
                  </div>
                ) : viewingProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                    No products currently in stock at this warehouse.
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2.5 px-3.5 font-semibold">Product</th>
                          <th className="py-2.5 px-3.5 font-semibold">Location</th>
                          <th className="py-2.5 px-3.5 font-semibold text-center">In Stock</th>
                          <th className="py-2.5 px-3.5 font-semibold text-center">Allocated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {viewingProducts.map((p, pIdx) => (
                          <tr key={pIdx} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3.5 font-medium text-gray-800 dark:text-gray-200">
                              {p.name || (p as any).product_name || `Product #${p.id || (p as any).product_id}`}
                            </td>
                            <td className="py-2 px-3.5 font-mono text-gray-500 text-[11px]">
                              {p.warehouse_location_name || "Default"}
                            </td>
                            <td className="py-2 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {p.in_stock || 0}
                            </td>
                            <td className="py-2 px-3.5 text-center font-bold text-amber-600 dark:text-amber-400">
                              {p.allocated || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/50">
              {canEdit && (
                <Link
                  to={`/settings/warehouses/edit/${viewingWarehouse.id}`}
                  className="px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <i className="mgc_edit_line text-sm"></i>
                  Edit Warehouse
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

export default WarehousesPage;
