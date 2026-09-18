import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";

export interface IOrganization {
  id: number;
  name: string;
  address?: any;
  user_id?: number | null;
  person_count?: number;
  created_at?: string;
  updated_at?: string;
}

const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchOrgs();
  }, [page, perPage]);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const res = await API.get(
        `/organization?page=${page}&per_page=${perPage}&search=${encodeURIComponent(search)}`
      ).catch(() => ({ data: { data: [], total: 0 } }));

      const list = res.data?.data || [];
      setOrganizations(list);
      setTotal(res.data?.total !== undefined ? res.data.total : list.length);
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrgs();
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day} ${month} ${year} ${hours}:${minutes}${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredOrganizations.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete organization "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/organization/${id}`);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Organization deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchOrgs();
      } catch (err: any) {
        Swal.fire(
          "Error",
          err?.response?.data?.message || "Failed to delete organization",
          "error"
        );
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected organization(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => API.delete(`/organization/${id}`)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${selectedIds.length} organizations deleted.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        fetchOrgs();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.message || "Failed to delete records", "error");
      }
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return org.name?.toLowerCase().includes(s);
  });

  const startIndex = (total || filteredOrganizations.length) > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = (total || filteredOrganizations.length) > 0 ? Math.min(page * perPage, total || filteredOrganizations.length) : 0;
  const totalCount = total || filteredOrganizations.length;
  const isAllSelected = filteredOrganizations.length > 0 && selectedIds.length === filteredOrganizations.length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumbs and Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/dashboard" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            /{" "}
            <Link to="/contacts/persons" className="text-[#0088cc] hover:underline">
              Contacts
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Organizations</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Organizations
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <i className="mgc_delete_line text-base mr-1.5"></i>
              Delete ({selectedIds.length})
            </button>
          )}
          <Link
            to="/contacts/organizations/create"
            className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            Create Organization
          </Link>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Toolbar Header (Search, Filter, Per Page, Pagination) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleFilter} className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <i className="mgc_search_line text-base"></i>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc] w-56 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0284c7] font-semibold text-sm rounded-lg border border-[#bae6fd] transition-colors"
            >
              Filter
            </button>
          </form>

          {/* Right side: Per Page & Pagination controls */}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span>Per Page</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span>
              {startIndex} - {endIndex} of {totalCount}
            </span>

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
                disabled={filteredOrganizations.length < perPage || page * perPage >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 transition-colors"
                title="Next Page"
              >
                <i className="mgc_right_line text-base"></i>
              </button>
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
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Person Count</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium"
                  >
                    No Records Available.
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => {
                  const isSelected = selectedIds.includes(org.id);
                  return (
                    <tr
                      key={org.id}
                      className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                        isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(org.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                        {org.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-100">
                        <Link
                          to={`/contacts/organizations/edit/${org.id}`}
                          className="hover:text-[#0088cc] transition-colors"
                        >
                          {org.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                        {org.person_count ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                        {formatDate(org.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/contacts/organizations/edit/${org.id}`}
                          className="inline-flex items-center text-gray-500 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(org.id, org.name)}
                          className="inline-flex items-center text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          <i className="mgc_delete_line text-base"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganizationsPage;
