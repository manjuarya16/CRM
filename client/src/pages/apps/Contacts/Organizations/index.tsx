import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { useOrganizationStore } from "@/store";

import { IOrganization } from "@/interface";
import { usePermission } from "@/hooks/usePermission";

const OrganizationsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("organizations.create");
  const canEdit = hasPermission("organizations.edit");
  const canDelete = hasPermission("organizations.delete");
  const canView = hasPermission("organizations.view");
  const [organizations, setOrganizations] = useState<IOrganization[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table"
  );

  const AVATAR_COLORS = [
    "bg-blue-600 text-white",
    "bg-teal-600 text-white",
    "bg-purple-600 text-white",
    "bg-indigo-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-500 text-white",
    "bg-emerald-600 text-white",
    "bg-cyan-600 text-white",
  ];

  const getInitials = (name?: string, fallback = "OR") => {
    if (!name) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatOrgAddress = (address: any) => {
    if (!address) return "Corporate Account";
    if (typeof address === "object") {
      const parts = [address.city, address.state, address.country].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
      if (address.address) return address.address;
    } else if (typeof address === "string" && address.trim()) {
      try {
        const parsed = JSON.parse(address);
        const parts = [parsed.city, parsed.state, parsed.country].filter(Boolean);
        if (parts.length > 0) return parts.join(", ");
        if (parsed.address) return parsed.address;
      } catch {
        return address;
      }
    }
    return "Corporate Account";
  };

  useEffect(() => {
    fetchOrgs();
  }, [page, perPage]);

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const res = await useOrganizationStore.getState().fetchOrganizations(page, perPage, search);
      const list = res?.data || [];
      setOrganizations(list);
      setTotal(res?.total !== undefined ? res.total : list.length);
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
        await useOrganizationStore.getState().deleteOrganization(id);
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
        await Promise.all(selectedIds.map((id) => useOrganizationStore.getState().deleteOrganization(id)));
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

  const formatFullAddress = (address: any) => {
    if (!address) return "No physical address registered";
    let obj = address;
    if (typeof address === "string") {
      try {
        obj = JSON.parse(address);
      } catch {
        return address;
      }
    }
    if (typeof obj === "object" && obj) {
      const parts = [
        obj.address,
        [obj.city, obj.state, obj.postcode].filter(Boolean).join(", "),
        obj.country,
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(" • ");
    }
    return String(address);
  };

  const renderOrganizationCard = (org: IOrganization, idx: number) => {
    const isSelected = selectedIds.includes(org.id);
    const avatarColor = AVATAR_COLORS[(org.id || idx) % AVATAR_COLORS.length];
    const fullAddress = formatFullAddress(org.address);

    return (
      <div
        key={org.id}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 ${
          isSelected
            ? "border-[#0088cc] shadow-sm bg-blue-50/20 dark:bg-blue-900/10"
            : "border-gray-200 dark:border-gray-700/80 shadow-2xs hover:shadow-xs"
        }`}
      >
        {/* Top Row: Checkbox + Avatar + Name + ID Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectOne(org.id)}
              className="mt-1 rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer shrink-0"
            />
            <Link
              to={canEdit ? `/contacts/organizations/edit/${org.id}` : "#"}
              className="flex items-start gap-2.5 min-w-0 flex-1 group"
            >
              <span className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}>
                {getInitials(org.name, "OR")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {org.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Corporate Account #{org.id}
                </p>
              </div>
            </Link>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #ORG-{org.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Full Details as shown on desktop table (Address, Associated Persons, Created Date) */}
        <div className="space-y-2.5 py-2.5 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* Full Address */}
          <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
            <i className="mgc_location_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <span className="leading-relaxed">{fullAddress}</span>
          </div>

          {/* Person Count & Date */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <i className="mgc_group_line text-sm text-gray-400 shrink-0"></i>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{org.person_count ?? 0}</span>
              <span className="text-gray-500">{org.person_count === 1 ? "associated contact" : "associated contacts"}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-[11px]">
              <i className="mgc_calendar_line text-xs shrink-0"></i>
              <span>Created {formatDate(org.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Person Count Pill + Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
            <i className="mgc_user_3_line text-xs shrink-0"></i>
            <span>{org.person_count ?? 0} {org.person_count === 1 ? "Person" : "Persons"}</span>
          </span>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canEdit && (
              <Link
                to={`/contacts/organizations/edit/${org.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Organization"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(org.id, org.name)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Organization"
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
            <Link to="/contacts/persons" className="text-[#0e90d9] hover:underline">
              Contacts
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium">Organizations</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Organizations
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
          {canCreate && (
            <Link
              to="/contacts/organizations/create"
              className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Create Organization
            </Link>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar Header (Search, View Mode, Per Page, Pagination) */}
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
                placeholder="Search organizations..."
                className="pl-9 pr-3.5 py-2 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 w-44 sm:w-60 dark:text-gray-200 placeholder-gray-400 transition"
              />
            </div>
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

        {/* 📊 Summary Sub-Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredOrganizations.length}</strong> {filteredOrganizations.length === 1 ? "organization" : "organizations"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{totalCount}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading organizations...</p>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW (Full details matching desktop info in clean responsive cards) */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredOrganizations.map((org, idx) => renderOrganizationCard(org, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW (With Full-Detail Mobile Cards Fallback) */
          <>
            {/* Mobile Fallback Cards for Table View */}
            <div className="block md:hidden p-3 space-y-3">
              {filteredOrganizations.map((org, idx) => renderOrganizationCard(org, idx))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                  {filteredOrganizations.map((org) => {
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
                          {canEdit && (
                            <Link
                              to={`/contacts/organizations/edit/${org.id}`}
                              className="inline-flex items-center text-gray-500 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Edit"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(org.id, org.name)}
                              className="inline-flex items-center text-gray-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                              title="Delete"
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
      </div>
    </div>
  );
};

export default OrganizationsPage;
