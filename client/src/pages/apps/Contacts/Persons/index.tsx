import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

import { usePersonStore } from "@/store";
import { IPerson, PersonEmailItem, ContactItem } from "@/interface";

const PersonsPage: React.FC = () => {
  const { persons, loading, total, fetchPersons, deletePerson, clearAllPersons } = usePersonStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    loadPersons();
  }, [page, perPage]);

  const loadPersons = () => {
    fetchPersons({ page, perPage, search });
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPersons();
  };

  const parseItems = (raw: any, defaultLabel = "work"): Array<{ label: string; value: string }> => {
    if (!raw) return [];

    const processString = (str: string, label = defaultLabel): Array<{ label: string; value: string }> => {
      let clean = str.trim();
      clean = clean.replace(/""/g, '"');
      if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) {
        clean = clean.slice(1, -1);
      }
      if ((clean.startsWith("[") && clean.endsWith("]")) || (clean.startsWith("{") && clean.endsWith("}"))) {
        try {
          const parsed = JSON.parse(clean);
          return parseItems(parsed, label);
        } catch {}
      }
      if (clean.includes(":") || clean.includes(",")) {
        const parts = clean.split(",");
        const res: Array<{ label: string; value: string }> = [];
        for (const p of parts) {
          const t = p.trim();
          if (!t) continue;
          if (t.includes(":")) {
            const idx = t.indexOf(":");
            const l = t.substring(0, idx).trim();
            const v = t.substring(idx + 1).trim();
            if (v) res.push({ label: l || label, value: v });
          } else {
            res.push({ label, value: t });
          }
        }
        if (res.length > 0) return res;
      }
      return [{ label, value: clean }];
    };

    if (Array.isArray(raw)) {
      const result: Array<{ label: string; value: string }> = [];
      for (const item of raw) {
        if (typeof item === "object" && item !== null) {
          const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
          const itemLabel = item.label || defaultLabel;
          if (typeof itemVal === "string" && (itemVal.startsWith("[") || itemVal.startsWith("{") || itemVal.includes(":") || itemVal.includes(","))) {
            result.push(...processString(itemVal, itemLabel));
          } else if (itemVal) {
            result.push({ label: itemLabel, value: String(itemVal).trim() });
          }
        } else if (typeof item === "string") {
          result.push(...processString(item, defaultLabel));
        }
      }
      return result;
    }

    if (typeof raw === "string") {
      return processString(raw, defaultLabel);
    }

    return [];
  };

  const formatEmails = (emails: any) => {
    const list = parseItems(emails, "work");
    if (!list.length) return "-";
    return (
      <div className="flex flex-col gap-0.5">
        {list.map((item, index) => (
          <div key={index} className="text-xs">
            <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}</span>
            {item.label && <span className="text-gray-400 dark:text-gray-500 ms-1.5 font-normal">({item.label})</span>}
          </div>
        ))}
      </div>
    );
  };

  const formatContacts = (contacts: any) => {
    const list = parseItems(contacts, "work");
    if (!list.length) return "-";
    return (
      <div className="flex flex-col gap-0.5">
        {list.map((item, index) => (
          <div key={index} className="text-xs">
            <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}</span>
            {item.label && <span className="text-gray-400 dark:text-gray-500 ms-1.5 font-normal">({item.label})</span>}
          </div>
        ))}
      </div>
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(persons.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (person: IPerson) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you really want to delete "${person.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deletePerson(person.id);
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Person deleted successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        loadPersons();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: err.response?.data?.message || err.message || "Failed to delete person",
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete ${selectedIds.length} selected person(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete selected!",
    });

    if (result.isConfirmed) {
      try {
        await Promise.all(selectedIds.map((id) => deletePerson(id)));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `${selectedIds.length} records deleted successfully.`,
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        loadPersons();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.message || err.message || "Failed to delete records", "error");
      }
    }
  };

  const handleClearAll = async () => {
    const result = await Swal.fire({
      title: "Clear All Persons?",
      text: `This will permanently delete all ${total} person records. This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, clear all!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const res = await clearAllPersons();
        Swal.fire({
          icon: "success",
          title: "Cleared!",
          text: res.message || "All persons deleted successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
        setSelectedIds([]);
        loadPersons();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.message || err.message || "Failed to clear all persons", "error");
      }
    }
  };


  const handleExport = () => {
    if (persons.length === 0) {
      Swal.fire("Info", "No records to export", "info");
      return;
    }

    const headers = ["ID", "Name", "Emails", "Contact Numbers", "Organization Name", "Job Title", "Sales Owner", "Created At"];
    const rows = persons.map((p) => {
      const emailStr = Array.isArray(p.emails) ? p.emails.map((e: any) => typeof e === "object" ? e.value || e.email : String(e)).join("; ") : String(p.emails || "");
      const contactStr = Array.isArray(p.contact_numbers) ? p.contact_numbers.map((c: any) => typeof c === "object" ? c.value || c.number : String(c)).join("; ") : String(p.contact_numbers || "");
      return [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${emailStr.replace(/"/g, '""')}"`,
        `"${contactStr.replace(/"/g, '""')}"`,
        `"${(p.organization_name || "").replace(/"/g, '""')}"`,
        `"${(p.job_title || "").replace(/"/g, '""')}"`,
        `"${(p.sales_owner_name || "").replace(/"/g, '""')}"`,
        `"${p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `persons_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startIndex = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endIndex = total > 0 ? Math.min(page * perPage, total) : 0;
  const isAllSelected = persons.length > 0 && selectedIds.length === persons.length;

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
            / <span className="text-gray-700 dark:text-gray-300">Persons</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Persons
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
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors shadow-sm"
          >
            Export
          </button>
          {total > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800 transition-colors shadow-sm"
            >
              <i className="mgc_delete_line text-base mr-1.5"></i>
              Clear All
            </button>
          )}
          <Link
            to="/contacts/persons/create"
            className="inline-flex items-center px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            Create Person
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
              {startIndex} - {endIndex} of {total}
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
                disabled={persons.length < perPage || page * perPage >= total}
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
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Emails</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Contact Numbers</th>
                <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Organization Name</th>
                <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#0088cc] border-t-transparent"></div>
                  </td>
                </tr>
              ) : persons.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium"
                  >
                    No Records Available.
                  </td>
                </tr>
              ) : (
                persons.map((person) => {
                  const isSelected = selectedIds.includes(person.id);
                  return (
                    <tr
                      key={person.id}
                      className={`border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${
                        isSelected ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(person.id)}
                          className="rounded border-gray-300 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 font-medium">
                        {person.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0088cc]">
                        <Link
                          to={`/contacts/persons/edit/${person.id}`}
                          className="hover:underline"
                        >
                          {person.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                        {formatEmails(person.emails)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                        {formatContacts(person.contact_numbers)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                        {person.organization_name || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          to={`/contacts/persons/edit/${person.id}`}
                          className="inline-flex items-center text-gray-400 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <i className="mgc_edit_line text-base"></i>
                        </Link>
                        <button
                          onClick={() => handleDelete(person)}
                          className="inline-flex items-center text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
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

export default PersonsPage;
