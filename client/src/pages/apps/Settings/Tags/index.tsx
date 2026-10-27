import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Swal from "sweetalert2";
import { tagSchema } from "@/schemas";
import { usePermission } from "@/hooks/usePermission";
import { useTagStore } from "@/store";
import { ITag } from "@/interface";

const PRESET_COLORS = [
  "#0088cc",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#64748b",
];

const TagsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("settings.tags.create") || hasPermission("tags.create");
  const canEdit = hasPermission("settings.tags.edit") || hasPermission("tags.edit");
  const canDelete = hasPermission("settings.tags.delete") || hasPermission("tags.delete");

  const [tags, setTags] = useState<ITag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTag, setEditingTag] = useState<ITag | null>(null);
  const [tagName, setTagName] = useState<string>("");
  const [tagColor, setTagColor] = useState<string>("#0088cc");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const list = await useTagStore.getState().fetchTags(search || undefined);
      setTags(list || []);
    } catch {
      Swal.fire("Error", "Failed to load tags", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tag?: ITag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color || "#0088cc");
    } else {
      setEditingTag(null);
      setTagName("");
      setTagColor("#0088cc");
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validation = tagSchema.safeParse({ name: tagName.trim(), color: tagColor });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field) {
          fieldErrors[String(field)] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingTag) {
        await useTagStore.getState().saveTag({ name: tagName.trim(), color: tagColor }, editingTag.id);
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Tag updated successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await useTagStore.getState().saveTag({ name: tagName.trim(), color: tagColor });
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Tag created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      fetchTags();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save tag";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: ITag) => {
    const result = await Swal.fire({
      title: "Delete Tag?",
      text: `Are you sure you want to delete tag "${tag.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await useTagStore.getState().deleteTag(tag.id);
        Swal.fire("Deleted!", "Tag deleted successfully.", "success");
        fetchTags();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || "Failed to delete tag";
        Swal.fire("Error", msg, "error");
      }
    }
  };

  // Filtered tags based on search and selected color
  const filteredTags = useMemo(() => {
    let result = tags;
    if (selectedColor !== "all") {
      result = result.filter(
        (t) => (t.color || "").toLowerCase() === selectedColor.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.color && t.color.toLowerCase().includes(q)) ||
          String(t.id).includes(q)
      );
    }
    return result;
  }, [tags, selectedColor, search]);

  // Unique colors in current tag list
  const availableColors = useMemo(() => {
    const map = new Map<string, number>();
    tags.forEach((t) => {
      const c = (t.color || "#0088cc").toLowerCase();
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).map(([color, count]) => ({ color, count }));
  }, [tags]);

  const stats = useMemo(() => {
    const total = tags.length;
    const uniqueColors = new Set(tags.map((t) => (t.color || "").toLowerCase())).size;
    return { total, uniqueColors };
  }, [tags]);

  const totalRecords = filteredTags.length;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;
  const startIndex = totalRecords === 0 ? 0 : (page - 1) * perPage + 1;
  const endIndex = Math.min(page * perPage, totalRecords);
  const paginatedTags = filteredTags.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-3.5 sm:p-6 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      <PageBreadcrumb title="Tags" name="Tags" breadCrumbItems={["Settings", "Tags"]} />

      {/* Top Bar & Breadcrumb Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <nav className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5 flex-wrap">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-normal">Tags</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Tags Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Create and manage color-coded tags to label and categorize Leads, Contacts, Organizations, and Products.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={fetchTags}
            disabled={loading}
            title="Refresh tags list"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg shadow-xs transition-colors disabled:opacity-60"
          >
            <i className={`mgc_refresh_2_line text-base ${loading ? "animate-spin" : ""}`}></i>
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              <i className="mgc_add_line text-base"></i>
              <span>Create Tag</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] dark:text-blue-400 flex items-center justify-center shrink-0 text-xl font-bold">
            <i className="mgc_tag_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Tags
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-xl font-bold">
            <i className="mgc_palette_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Color Palettes
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.uniqueColors}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xl">
            <i className="mgc_check_circle_line"></i>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              Active in CRM
            </div>
            <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {stats.total}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="space-y-3">
        {/* Top Control Bar: Search & View Switcher like Leads */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
              Tags Directory
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300">
              {filteredTags.length}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <i className="mgc_search_line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search tags..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              />
            </div>

            {/* View Toggle Buttons matching Leads */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                title="Cards View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_layout_grid_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`p-1.5 rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 px-2.5 ${
                  viewMode === "table"
                    ? "bg-white dark:bg-gray-800 text-[#0088cc] shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                <i className="mgc_list_check_line text-base"></i>
                <span className="hidden sm:inline text-xs font-bold">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Color Filter Pills matching Leads Stage Pills */}
        <div
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedColor("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              selectedColor === "all"
                ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
            }`}
          >
            <span>All Colors</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                selectedColor === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {tags.length}
            </span>
          </button>

          {availableColors.map(({ color, count }) => {
            const isActive = selectedColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setSelectedColor(color);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#0088cc] text-white shadow-sm ring-2 ring-[#0088cc]/30"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 active:scale-95"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-black/10 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-[11px]">{color}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Summary Header matching Leads */}
        <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredTags.length}</strong>{" "}
            {filteredTags.length === 1 ? "tag" : "tags"}
          </span>
          {selectedColor !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedColor("all");
                setPage(1);
              }}
              className="text-xs text-[#0088cc] hover:underline font-semibold"
            >
              Show All Colors
            </button>
          )}
        </div>

        {/* CARDS VIEW (Matching Leads High-Density Compact Cards List) */}
        {viewMode === "cards" && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                <i className="mgc_loading_3_line animate-spin text-base text-[#0088cc]"></i>
                <span>Loading tags...</span>
              </div>
            ) : paginatedTags.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0088cc] flex items-center justify-center mx-auto text-xl">
                  <i className="mgc_tag_line"></i>
                </div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">No Tags Found</p>
                <p className="text-xs text-gray-400">
                  {selectedColor !== "all"
                    ? "No tags match the selected color filter."
                    : "Create tags to categorize and label CRM records."}
                </p>
                {canCreate && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal()}
                      className="text-xs font-bold text-[#0088cc] hover:underline"
                    >
                      Click here to create a tag
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                {paginatedTags.map((tag) => {
                  const color = tag.color || "#0088cc";

                  return (
                    <div
                      key={tag.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow transition-all active:scale-[0.99] flex flex-col gap-2 group"
                    >
                      {/* Top Row: Avatar + Title + Hex Subtitle + Live Tag Badge */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span
                            className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 text-white shadow-xs"
                            style={{ backgroundColor: color }}
                          >
                            <i className="mgc_tag_line text-base"></i>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] truncate leading-tight transition-colors">
                                {tag.name}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block border border-black/10 shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-mono text-[11px]">{color}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right: Live Tag Badge as rendered in CRM */}
                        <div className="text-right shrink-0">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-xs whitespace-nowrap"
                            style={{ backgroundColor: color }}
                          >
                            <i className="mgc_tag_line text-[11px]"></i>
                            <span>{tag.name}</span>
                          </span>
                        </div>
                      </div>

                      {/* Middle: Info Pills matching Leads */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs font-mono">
                          ID: #{tag.id}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[11px] text-gray-600 dark:text-gray-300 font-medium shadow-xs">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span>Color Code</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      </div>

                      {/* Bottom Row: Color Swatch + Quick Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[11px]">
                          <span
                            className="w-3 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: color }}
                          />
                          <span>CRM Label</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenModal(tag)}
                              className="p-1 text-gray-400 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Edit Tag"
                              aria-label="Edit Tag"
                            >
                              <i className="mgc_edit_line text-sm"></i>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(tag)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Delete Tag"
                              aria-label="Delete Tag"
                            >
                              <i className="mgc_delete_2_line text-sm"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Tag</th>
                    <th className="px-5 py-3.5">Color Code</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent mr-2"></div>
                        Loading tags...
                      </td>
                    </tr>
                  ) : paginatedTags.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-gray-500 font-medium text-sm">
                        No Tags Available.
                      </td>
                    </tr>
                  ) : (
                    paginatedTags.map((tag) => (
                      <tr key={tag.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">#{tag.id}</td>
                        <td className="px-5 py-3.5 font-medium">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-xs"
                            style={{ backgroundColor: tag.color || "#0088cc" }}
                          >
                            <i className="mgc_tag_line mr-1 text-xs"></i>
                            {tag.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                          {tag.color || "#0088cc"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenModal(tag)}
                                className="p-1.5 text-gray-400 hover:text-[#0088cc] rounded-lg transition-colors"
                                title="Edit Tag"
                              >
                                <i className="mgc_edit_line text-base"></i>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(tag)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                title="Delete Tag"
                              >
                                <i className="mgc_delete_2_line text-base"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls Bar */}
        {totalRecords > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="pl-2.5 pr-8 min-w-[74px] py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0088cc] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="font-medium text-gray-700 dark:text-gray-300">
              {totalRecords === 0 ? "0 - 0 of 0" : `${startIndex} - ${endIndex} of ${totalRecords}`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <i className="mgc_chevron_left_line text-base"></i>
              </button>
              <span className="px-2 font-bold text-gray-800 dark:text-gray-200">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <i className="mgc_chevron_right_line text-base"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Create / Edit Tag */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shadow-xs shrink-0"
                  style={{ backgroundColor: tagColor }}
                >
                  <i className="mgc_tag_line"></i>
                </span>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                  {editingTag ? "Edit Tag" : "Create Tag"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl font-bold transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <form noValidate onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. VIP, High Priority, Hot Lead"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:bg-gray-900 dark:text-white transition-colors ${
                    errors.name
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:border-[#0088cc]"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tag Badge Color
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-900"
                  />
                  <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {tagColor}
                  </span>
                  {/* Live preview badge */}
                  <span
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: tagColor }}
                  >
                    <i className="mgc_tag_line text-xs"></i>
                    <span>{tagName.trim() || "Preview"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTagColor(c)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black/10 transition-transform flex items-center justify-center text-white text-xs ${
                        tagColor.toLowerCase() === c.toLowerCase()
                          ? "ring-2 ring-offset-2 ring-[#0088cc] scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {tagColor.toLowerCase() === c.toLowerCase() && (
                        <i className="mgc_check_line"></i>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#0088cc] hover:bg-[#0077b3] rounded-lg shadow-sm transition-colors text-center disabled:opacity-50"
                >
                  <i className="mgc_check_line text-base"></i>
                  <span>{saving ? "Saving..." : "Save Tag"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsPage;
