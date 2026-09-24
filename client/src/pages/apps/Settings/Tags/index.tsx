import React, { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import API from "@/config";
import Swal from "sweetalert2";
import { tagSchema } from "@/schemas";

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
  const [tags, setTags] = useState<ITag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

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
      const res = await API.get("/tags", { params: { search: search || undefined } });
      if (res.data?.data) {
        setTags(res.data.data);
      }
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
        await API.put(`/tags/${editingTag.id}`, { name: tagName.trim(), color: tagColor });
        Swal.fire({ icon: "success", title: "Updated!", text: "Tag updated successfully.", timer: 1500, showConfirmButton: false });
      } else {
        await API.post("/tags", { name: tagName.trim(), color: tagColor });
        Swal.fire({ icon: "success", title: "Created!", text: "Tag created successfully.", timer: 1500, showConfirmButton: false });
      }
      setIsModalOpen(false);
      fetchTags();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save tag";
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
        await API.delete(`/tags/${tag.id}`);
        Swal.fire("Deleted!", "Tag deleted successfully.", "success");
        fetchTags();
      } catch (err: any) {
        const msg = err.response?.data?.message || "Failed to delete tag";
        Swal.fire("Error", msg, "error");
      }
    }
  };

  const totalPages = Math.ceil(tags.length / perPage) || 1;
  const paginatedTags = tags.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageBreadcrumb title="Tags" name="Tags" breadCrumbItems={["Settings", "Tags"]} />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tags Management</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Create and manage color-coded tags to organize Leads, Contacts, Organizations, and Products.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <i className="mgc_add_line text-base"></i>
            <span>Create Tag</span>
          </button>
        </div>

        {/* Search & Per Page */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchTags();
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <i className="mgc_search_line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 dark:text-white"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Grid of Tags */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-16 px-4">
              <i className="mgc_tag_line text-4xl text-gray-300 dark:text-gray-600 mb-2 block"></i>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No Tags Found</h3>
              <p className="text-xs text-gray-400 mt-1">Create tags to label CRM records.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Tag</th>
                    <th className="px-5 py-3.5">Color Code</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {paginatedTags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-gray-400">#{tag.id}</td>
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
                          <button
                            type="button"
                            onClick={() => handleOpenModal(tag)}
                            className="p-1.5 text-gray-500 hover:text-primary rounded-lg transition-colors"
                            title="Edit Tag"
                          >
                            <i className="mgc_edit_line text-base"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tag)}
                            className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete Tag"
                          >
                            <i className="mgc_delete_2_line text-base"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  Showing {tags.length === 0 ? 0 : (page - 1) * perPage + 1} to{" "}
                  {Math.min(page * perPage, tags.length)} of {tags.length} tags
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

      {/* Modal for Create / Edit Tag */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {editingTag ? "Edit Tag" : "Create Tag"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <i className="mgc_close_line text-xl"></i>
              </button>
            </div>

            <form noValidate onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. VIP, High Priority, Hot Lead"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-gray-900 dark:text-white ${
                    errors.name
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tag Badge Color
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="color"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{tagColor}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTagColor(c)}
                      className="w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold shadow-sm"
                >
                  {saving ? "Saving..." : "Save Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TagsPage;
