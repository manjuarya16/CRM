import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { IAttribute } from "@/interface";
import API from "@/config";
import Swal from "sweetalert2";
import { usePermission } from "@/hooks/usePermission";

const ENTITY_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  leads: { label: "Leads", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  persons: { label: "Persons", badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800" },
  organizations: { label: "Organizations", badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
  products: { label: "Products", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  quotes: { label: "Quotes", badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800" },
  warehouses: { label: "Warehouses", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800" },
};

const AttributesPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.attributes.create");
  const canEdit = hasPermission("settings.attributes.edit");
  const canDelete = hasPermission("settings.attributes.delete");
  const canView = hasPermission("settings.attributes.view");

  const [attributes, setAttributes] = useState<IAttribute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedAttribute, setSelectedAttribute] = useState<IAttribute | null>(null);
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");

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

  const getInitials = (name?: string, fallback = "AT") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
    fetchAttributes();
  }, [entityFilter, typeFilter]);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const res = await API.get("/attributes", {
        params: {
          search: search || undefined,
          entity_type: entityFilter !== "all" ? entityFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        },
      });
      if (res.data?.data) {
        setAttributes(res.data.data);
      }
    } catch {
      Swal.fire("Error", "Failed to fetch attributes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedIds([]);
    fetchAttributes();
  };

  const handleDelete = async (attr: IAttribute) => {
    const result = await Swal.fire({
      title: "Delete Attribute?",
      text: `Are you sure you want to delete attribute "${attr.name}" (${attr.code})? Associated dynamic data may be lost.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/attributes/${attr.id}`);
        Swal.fire("Deleted!", "Attribute deleted successfully.", "success");
        setSelectedIds((prev) => prev.filter((id) => id !== Number(attr.id)));
        fetchAttributes();
      } catch (err: any) {
        const msg = err.response?.data?.message || "Failed to delete attribute";
        Swal.fire("Error", msg, "error");
      }
    }
  };

  const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedAttributes.map((a) => Number(a.id)).filter(Boolean);
      const combined = Array.from(new Set([...selectedIds, ...pageIds]));
      setSelectedIds(combined);
    } else {
      const pageIds = new Set(paginatedAttributes.map((a) => Number(a.id)));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Delete ${selectedIds.length} Attributes?`,
      text: `Are you sure you want to delete ${selectedIds.length} selected attribute(s)? Associated custom field values will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Yes, Delete (${selectedIds.length})`,
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const res = await API.post("/attributes/bulk-delete", { ids: selectedIds });
        if (res.data?.success) {
          Swal.fire(
            "Deleted!",
            res.data.message || `${selectedIds.length} attributes deleted successfully.`,
            "success"
          );
          setSelectedIds([]);
          fetchAttributes();
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || "Failed to bulk delete attributes";
        Swal.fire("Error", msg, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAll = async () => {
    if (attributes.length === 0) return;

    const filterDesc = entityFilter !== "all" ? ` for "${entityFilter}"` : "";
    const searchDesc = search ? ` matching "${search}"` : "";
    const targetDesc =
      filterDesc || searchDesc
        ? `filtered attributes (${attributes.length} items)`
        : `ALL ${attributes.length} custom attributes`;

    const result = await Swal.fire({
      title: "Delete ALL Attributes?",
      text: `CRITICAL WARNING: Are you sure you want to delete ${targetDesc}? This will permanently remove all attribute definitions and associated dynamic field values!`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete All!",
      input: "text",
      inputPlaceholder: 'Type "DELETE" to confirm',
      inputValidator: (value) => {
        if (value !== "DELETE") {
          return 'You must type "DELETE" in capital letters to confirm!';
        }
      },
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        const res = await API.post("/attributes/delete-all", {
          entity_type: entityFilter !== "all" ? entityFilter : undefined,
          search: search || undefined,
        });
        if (res.data?.success) {
          Swal.fire(
            "Deleted!",
            res.data.message || "All custom attributes deleted successfully.",
            "success"
          );
          setSelectedIds([]);
          fetchAttributes();
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || "Failed to delete all attributes";
        Swal.fire("Error", msg, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleExport = () => {
    if (attributes.length === 0) {
      Swal.fire("Export", "No attributes to export", "info");
      return;
    }

    const headers = ["ID", "Code", "Name", "Entity Type", "Field Type", "Required", "Unique", "Validation", "Options Count"];
    const rows = attributes.map((a) => [
      a.id,
      `"${(a.code || "").replace(/"/g, '""')}"`,
      `"${(a.name || "").replace(/"/g, '""')}"`,
      `"${(a.entity_type || "").replace(/"/g, '""')}"`,
      `"${(a.type || "").replace(/"/g, '""')}"`,
      a.is_required ? "Yes" : "No",
      a.is_unique ? "Yes" : "No",
      `"${(a.validation || "").replace(/"/g, '""')}"`,
      Array.isArray(a.options) ? a.options.length : 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attributes_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const total = attributes.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const paginatedAttributes = useMemo(() => {
    const start = (page - 1) * perPage;
    return attributes.slice(start, start + perPage);
  }, [attributes, page, perPage]);

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllPageSelected =
    paginatedAttributes.length > 0 &&
    paginatedAttributes.every((a) => selectedIds.includes(Number(a.id)));

  // Responsive Full-Detail Attribute Card (Person-like card design)
  const renderAttributeCard = (attr: IAttribute, idx: number) => {
    const isSelected = selectedIds.includes(Number(attr.id));
    const avatarColor = AVATAR_COLORS[(Number(attr.id) || idx) % AVATAR_COLORS.length];
    const entityInfo = ENTITY_TYPE_LABELS[attr.entity_type] || {
      label: attr.entity_type,
      badge: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
    };
    const optionsCount = Array.isArray(attr.options) ? attr.options.length : 0;

    return (
      <div
        key={attr.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + ID Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            {canDelete && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectRow(Number(attr.id))}
                className="rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] mt-1 shrink-0"
              />
            )}
            <div
              onClick={() => setSelectedAttribute(attr)}
              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer group"
            >
              <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${avatarColor}`}>
                {getInitials(attr.name, "AT")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {attr.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    {attr.code}
                  </code>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #ATTR-{attr.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Entity, Type, Validation & Options */}
        <div className="space-y-2 py-2 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <i className="mgc_layers_line text-sm text-[#0088cc]"></i>
              <span className="text-gray-500">Entity:</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${entityInfo.badge}`}>
                {entityInfo.label}
              </span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {attr.type}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
            {attr.is_required && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <i className="mgc_asterisk_line text-[10px]"></i> Required
              </span>
            )}
            {attr.is_unique && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <i className="mgc_fingerprint_line text-[10px]"></i> Unique
              </span>
            )}
            {optionsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <i className="mgc_list_check_3_line text-[10px]"></i> {optionsCount} Options
              </span>
            )}
            {attr.validation && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Rule: {attr.validation}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-[11px] font-mono text-gray-400">
            ID: {attr.id}
          </span>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <button
                type="button"
                onClick={() => setSelectedAttribute(attr)}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="View Attribute Details"
              >
                <i className="mgc_eye_line text-sm"></i>
              </button>
            )}
            {canEdit && (
              <Link
                to={`/settings/attributes/edit/${attr.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition inline-flex items-center"
                title="Edit Attribute"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(attr)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Attribute"
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
        <span className="text-gray-700 dark:text-gray-300 font-medium">Attributes</span>
      </div>

      {/* 🏷️ Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Attributes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Create and manage custom data fields for Leads, Persons, Organizations, Products, Quotes, and Warehouses
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
          {selectedIds.length > 0 && canDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0 whitespace-nowrap"
            >
              <i className="mgc_delete_line text-sm"></i>
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
          {canDelete && attributes.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
              title="Delete all attributes"
            >
              <i className="mgc_delete_2_line text-sm text-red-600"></i>
              <span>Delete All</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 bg-white dark:bg-gray-800 hover:bg-[#e0f2fe] dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
          >
            <i className="mgc_download_line text-sm text-gray-500 dark:text-gray-400"></i>
            <span>Export</span>
          </button>
          {canCreate && (
            <Link
              to="/settings/attributes/create"
              className="h-8 px-3 sm:px-3.5 inline-flex items-center justify-center gap-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors active:scale-98 shrink-0 whitespace-nowrap"
            >
              <i className="mgc_add_line text-sm"></i>
              <span>Create Attribute</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, Filters, View Mode, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                placeholder="Search by code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-48 sm:w-56 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="pl-3 pr-8 min-w-[140px] py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
            >
              <option value="all">All Entity Types</option>
              <option value="leads">Leads</option>
              <option value="persons">Persons / Contacts</option>
              <option value="organizations">Organizations</option>
              <option value="products">Products</option>
              <option value="quotes">Quotes</option>
              <option value="warehouses">Warehouses</option>
            </select>

            {/* Field Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-3 pr-8 min-w-[140px] py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
            >
              <option value="all">All Field Types</option>
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="price">Price</option>
              <option value="boolean">Boolean</option>
              <option value="select">Select</option>
              <option value="multiselect">Multiselect</option>
              <option value="checkbox">Checkbox</option>
              <option value="email">Email</option>
              <option value="address">Address</option>
              <option value="phone">Phone</option>
              <option value="lookup">Lookup</option>
              <option value="date">Date</option>
              <option value="datetime">Date Time</option>
              <option value="image">Image</option>
              <option value="file">File</option>
            </select>

            <button
              type="submit"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition"
            >
              Filter
            </button>
          </form>

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
                className="per-page-select pl-2.5 pr-8 min-w-[5.25rem] py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-200 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Quick pagination arrows in toolbar */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous Page"
              >
                <i className="mgc_left_line text-xs"></i>
              </button>
              <span className="px-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {page}/{totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next Page"
              >
                <i className="mgc_right_line text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Summary Sub-Header */}
        <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-2">
          <div>
            Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{paginatedAttributes.length}</span> of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">{total}</span> custom attributes
            {total > 0 && ` (${startIndex} - ${endIndex} of ${total})`}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-[#0088cc] font-medium">
              {selectedIds.length} attribute(s) selected
            </div>
          )}
        </div>

        {/* 📦 View Modes Content */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#0088cc] border-t-transparent"></div>
            <p className="mt-2 text-xs text-gray-500">Loading attributes...</p>
          </div>
        ) : paginatedAttributes.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <i className="mgc_list_check_3_line text-4xl mb-2 block opacity-40"></i>
            <p className="text-sm font-medium">No custom attributes found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards View Grid */
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedAttributes.map((attr, idx) => renderAttributeCard(attr, idx))}
          </div>
        ) : (
          /* Table View with Mobile Card Fallback */
          <div>
            {/* Mobile Fallback: Cards */}
            <div className="block md:hidden p-4 space-y-3">
              {paginatedAttributes.map((attr, idx) => renderAttributeCard(attr, idx))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-xs">
                    {canDelete && (
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleSelectAllOnPage}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300 w-16">ID</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Code</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Entity Type</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Field Type</th>
                    <th className="py-3.5 px-4 font-semibold text-center text-gray-600 dark:text-gray-300">Required</th>
                    <th className="py-3.5 px-4 font-semibold text-center text-gray-600 dark:text-gray-300">Unique</th>
                    <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {paginatedAttributes.map((attr) => {
                    const entityInfo = ENTITY_TYPE_LABELS[attr.entity_type] || {
                      label: attr.entity_type,
                      badge: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300",
                    };
                    const isSelected = selectedIds.includes(Number(attr.id));

                    return (
                      <tr
                        key={attr.id}
                        className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                          isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        {canDelete && (
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(Number(attr.id))}
                              className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-medium text-gray-600 dark:text-gray-400">
                          #{attr.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                            {attr.code}
                          </code>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">
                          <button
                            type="button"
                            onClick={() => setSelectedAttribute(attr)}
                            className="hover:text-[#0088cc] transition-colors font-semibold text-left"
                          >
                            {attr.name}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${entityInfo.badge}`}
                          >
                            {entityInfo.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase">
                            {attr.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {attr.is_required ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {attr.is_unique ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => setSelectedAttribute(attr)}
                              className="inline-flex items-center text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 p-1.5 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </button>
                          )}
                          {canEdit && (
                            <Link
                              to={`/settings/attributes/edit/${attr.id}`}
                              className="inline-flex items-center text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-1.5 rounded-lg transition-colors"
                              title="Edit Attribute"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(attr)}
                              className="inline-flex items-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-1.5 rounded-lg transition-colors"
                              title="Delete Attribute"
                            >
                              <i className="mgc_delete_2_line text-base"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        {total > perPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Showing {startIndex} to {endIndex} of {total} custom attributes
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
        )}
      </div>

      {/* Attribute Details View Modal */}
      {selectedAttribute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0088cc]">
                  <i className="mgc_list_check_3_line text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {selectedAttribute.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Custom Attribute Details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttribute(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Name</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                    {selectedAttribute.name}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Code</span>
                  <p className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-1 rounded inline-block mt-0.5">
                    {selectedAttribute.code}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Entity Type</span>
                  <p className="font-medium capitalize text-gray-800 dark:text-gray-200 mt-0.5">
                    {selectedAttribute.entity_type}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Field Type</span>
                  <p className="font-semibold uppercase text-xs text-[#0088cc] mt-0.5">
                    {selectedAttribute.type}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Is Required</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                    {selectedAttribute.is_required ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Is Unique</span>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                    {selectedAttribute.is_unique ? "Yes" : "No"}
                  </p>
                </div>
                {selectedAttribute.validation && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Validation Rule</span>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                      {selectedAttribute.validation}
                    </p>
                  </div>
                )}
              </div>

              {/* Options List */}
              {Array.isArray(selectedAttribute.options) && selectedAttribute.options.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400 uppercase font-semibold block mb-2">
                    Predefined Options ({selectedAttribute.options.length})
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {selectedAttribute.options.map((opt: any, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {typeof opt === "object" ? opt.name : opt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
              {canEdit && (
                <Link
                  to={`/settings/attributes/edit/${selectedAttribute.id}`}
                  className="px-4 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Edit Attribute
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedAttribute(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
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

export default AttributesPage;
