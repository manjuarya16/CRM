import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageBreadcrumb from "@/components/PageBreadcrumb";
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

  // ───────────────────────────────────────────────────────────────────────────
  // BULK & DELETE ALL HANDLERS
  // ───────────────────────────────────────────────────────────────────────────

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

  const totalPages = Math.ceil(attributes.length / perPage) || 1;
  const paginatedAttributes = attributes.slice((page - 1) * perPage, page * perPage);
  const isAllPageSelected =
    paginatedAttributes.length > 0 &&
    paginatedAttributes.every((a) => selectedIds.includes(Number(a.id)));

  return (
    <>
      <PageBreadcrumb
        title="Attributes"
        name="Attributes"
        breadCrumbItems={["Settings", "Attributes"]}
      />

      <div className="space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Attributes Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Create and manage custom data fields for Leads, Contacts, Organizations, Products, Quotes, and Warehouses.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {canDelete && attributes.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
                title="Delete all attributes"
              >
                <i className="mgc_delete_2_line text-base"></i>
                <span>Delete All</span>
              </button>
            )}

            {canCreate && (
              <Link
                to="/settings/attributes/create"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                <i className="mgc_add_line text-base"></i>
                <span>Create Attribute</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <i className="mgc_search_line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code or name..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Entity Filter */}
            <div>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900 dark:text-white"
              >
                <option value="all">All Entity Types</option>
                <option value="leads">Leads</option>
                <option value="persons">Persons / Contacts</option>
                <option value="organizations">Organizations</option>
                <option value="products">Products</option>
                <option value="quotes">Quotes</option>
                <option value="warehouses">Warehouses</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900 dark:text-white"
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
            </div>

            {/* Per Page Selector */}
            <div className="flex gap-2 items-center">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-900 dark:text-white"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Bulk Actions Banner */}
        {canDelete && selectedIds.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3.5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
              <i className="mgc_check_circle_fill text-lg"></i>
              <span>Selected {selectedIds.length} attribute(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <i className="mgc_delete_2_line"></i>
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Grid / Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary"></div>
            </div>
          ) : attributes.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="mgc_list_check_3_line text-3xl"></i>
              </div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                No Attributes Found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                No custom attributes match your search criteria. Create a new custom attribute to get started.
              </p>
              {canCreate && (
                <Link
                  to="/settings/attributes/create"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold"
                >
                  <i className="mgc_add_line"></i> Create Attribute
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {canDelete && (
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleSelectAllOnPage}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>
                    )}
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Entity Type</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-center">Required</th>
                    <th className="px-5 py-3.5 text-center">Unique</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {paginatedAttributes.map((attr) => {
                    const entityInfo = ENTITY_TYPE_LABELS[attr.entity_type] || {
                      label: attr.entity_type,
                      badge: "bg-gray-100 text-gray-800 border-gray-200",
                    };
                    const isSelected = selectedIds.includes(Number(attr.id));

                    return (
                      <tr
                        key={attr.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50/70"
                            : "hover:bg-gray-50/80 dark:hover:bg-gray-750"
                        }`}
                      >
                        {canDelete && (
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(Number(attr.id))}
                              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-5 py-3.5 font-medium text-gray-500">
                          #{attr.id}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                            {attr.code}
                          </code>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                          {attr.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${entityInfo.badge}`}
                          >
                            {entityInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase">
                            {attr.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {attr.is_required ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {attr.is_unique ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Modal Trigger */}
                            {canView && (
                              <button
                                type="button"
                                onClick={() => setSelectedAttribute(attr)}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <i className="mgc_eye_line text-base"></i>
                              </button>
                            )}

                            {/* Edit */}
                            {canEdit && (
                              <Link
                                to={`/settings/attributes/edit/${attr.id}`}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Edit Attribute"
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </Link>
                            )}

                            {/* Delete */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(attr)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete Attribute"
                              >
                                <i className="mgc_delete_2_line text-base"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  Showing {attributes.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
                  {Math.min(page * perPage, attributes.length)} of {attributes.length} attributes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attribute Details View Modal */}
      {selectedAttribute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <i className="mgc_list_check_3_line text-primary text-xl"></i>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Attribute Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttribute(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
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
                  <p className="font-semibold uppercase text-xs text-primary mt-0.5">
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
              <Link
                to={`/settings/attributes/edit/${selectedAttribute.id}`}
                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90"
              >
                Edit Attribute
              </Link>
              <button
                type="button"
                onClick={() => setSelectedAttribute(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttributesPage;
