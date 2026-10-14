import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

import { usePersonStore } from "@/store";
import { IPerson, PersonEmailItem, ContactItem } from "@/interface";
import { usePermission } from "@/hooks/usePermission";
import { stripHtmlToText, cleanEmailAddress } from "@/utils/formatters";

const PersonsPage: React.FC = () => {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("persons.create");
  const canEdit = hasPermission("persons.edit");
  const canDelete = hasPermission("persons.delete");
  const canView = hasPermission("persons.view");

  const { persons, loading, total, fetchPersons, deletePerson, clearAllPersons } = usePersonStore();
  const [search, setSearch] = useState<string>("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "table">(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table"
  );

  const AVATAR_COLORS = [
    "bg-purple-600 text-white",
    "bg-amber-600 text-white",
    "bg-teal-600 text-white",
    "bg-blue-600 text-white",
    "bg-emerald-600 text-white",
    "bg-rose-500 text-white",
    "bg-indigo-600 text-white",
    "bg-cyan-600 text-white",
  ];

  const getInitials = (name?: string) => {
    if (!name) return "PR";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
      // Strip any HTML tags and mailto: prefix before splitting on ':'
      clean = stripHtmlToText(clean).replace(/\bmailto:\s*/gi, "").trim();
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
            const isValidLabel = /^[a-zA-Z0-9_-]{1,20}$/.test(l) && !/^mailto$/i.test(l) && !/^https?$/i.test(l);
            if (isValidLabel && v) {
              res.push({ label: l || label, value: v.includes("@") ? cleanEmailAddress(v) : v });
            } else if (v) {
              res.push({ label, value: t.includes("@") ? cleanEmailAddress(t) : v });
            }
          } else {
            res.push({ label, value: t.includes("@") ? cleanEmailAddress(t) : t });
          }
        }
        if (res.length > 0) return res;
      }
      return [{ label, value: clean.includes("@") ? cleanEmailAddress(clean) : clean }];
    };

    if (Array.isArray(raw)) {
      const result: Array<{ label: string; value: string }> = [];
      for (const item of raw) {
        if (typeof item === "object" && item !== null) {
          const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
          const rawLabel = item.label && !/^mailto$/i.test(String(item.label).trim()) ? item.label : defaultLabel;
          const itemLabel = stripHtmlToText(rawLabel) || defaultLabel;
          if (typeof itemVal === "string" && (itemVal.startsWith("[") || itemVal.startsWith("{") || itemVal.includes(":") || itemVal.includes(",") || itemVal.includes("<"))) {
            result.push(...processString(itemVal, itemLabel));
          } else if (itemVal) {
            const valStr = String(itemVal).trim();
            result.push({ label: itemLabel, value: valStr.includes("@") ? cleanEmailAddress(valStr) : stripHtmlToText(valStr) });
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
            <span className="font-medium text-gray-800 dark:text-gray-200">{cleanEmailAddress(item.value) || item.value}</span>
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

  const renderPersonCard = (person: IPerson, idx: number) => {
    const isSelected = selectedIds.includes(person.id);
    const emailList = parseItems(person.emails);
    const contactList = parseItems(person.contact_numbers);
    const avatarColor = AVATAR_COLORS[(person.id || idx) % AVATAR_COLORS.length];

    return (
      <div
        key={person.id}
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
              onChange={() => handleSelectOne(person.id)}
              className="mt-1 rounded border-gray-300 dark:border-gray-600 text-[#0088cc] focus:ring-[#0088cc] cursor-pointer shrink-0"
            />
            <Link
              to={canView ? `/contacts/persons/view/${person.id}` : canEdit ? `/contacts/persons/edit/${person.id}` : "#"}
              className="flex items-start gap-2.5 min-w-0 flex-1 group"
            >
              <span className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${avatarColor}`}>
                {getInitials(person.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 group-hover:text-[#0088cc] dark:group-hover:text-[#38bdf8] truncate leading-tight">
                  {person.name}
                </p>
                {person.job_title ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                    {person.job_title}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Contact #{person.id}</p>
                )}
              </div>
            </Link>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
              #PR-{person.id}
            </span>
          </div>
        </div>

        {/* Middle Body: Full Details as shown on desktop table (All Emails, All Contacts, Organization) */}
        <div className="space-y-2.5 py-2.5 border-y border-gray-100 dark:border-gray-700/60 text-xs">
          {/* All Emails */}
          <div className="flex items-start gap-2">
            <i className="mgc_mail_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <div className="min-w-0 flex-1">
              {emailList.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {emailList.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.value}</span>
                      {item.label && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700/70 text-gray-500 dark:text-gray-400 font-medium">
                          {item.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">No email</span>
              )}
            </div>
          </div>

          {/* All Contact Numbers */}
          <div className="flex items-start gap-2">
            <i className="mgc_phone_line text-sm text-gray-400 mt-0.5 shrink-0"></i>
            <div className="min-w-0 flex-1">
              {contactList.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {contactList.map((item, index) => (
                    <div key={index} className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[#0e90d9] dark:text-[#38bdf8]">{item.value}</span>
                      {item.label && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 font-medium">
                          {item.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 italic">No phone</span>
              )}
            </div>
          </div>

          {/* Sales Owner Info */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <i className="mgc_user_3_line text-sm text-gray-400 shrink-0"></i>
            <span className="truncate">
              <span className="text-gray-400 dark:text-gray-500">Owner:</span>{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200" title={person.sales_owner_name || "Unassigned"}>
                {person.sales_owner_name || "Unassigned"}
              </span>
            </span>
          </div>
        </div>

        {/* Bottom Row: Organization / Status Pill + Quick Actions */}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div className="min-w-0 flex-1">
            {person.organization_name ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-[#0284c7] dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 truncate max-w-full"
                title={person.organization_name}
              >
                <i className="mgc_building_2_line text-xs shrink-0"></i>
                <span className="truncate">{person.organization_name}</span>
              </span>
            ) : person.job_title ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 truncate max-w-full"
                title={person.job_title}
              >
                <span className="truncate">{person.job_title}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                Individual
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-gray-400">
            {canView && (
              <Link
                to={`/contacts/persons/view/${person.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="View Person"
              >
                <i className="mgc_eye_line text-sm"></i>
              </Link>
            )}
            {canEdit && (
              <Link
                to={`/contacts/persons/edit/${person.id}`}
                className="p-1 hover:text-[#0088cc] hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Edit Person"
              >
                <i className="mgc_edit_line text-sm"></i>
              </Link>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(person)}
                className="p-1 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                title="Delete Person"
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
            <span className="text-gray-600 dark:text-gray-300 font-medium">Persons</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Persons
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
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs sm:text-sm font-medium rounded-md border border-gray-200 dark:border-gray-700 transition shadow-2xs"
          >
            <i className="mgc_download_line text-base mr-1.5 text-gray-500"></i>
            Export
          </button>
          {total > 0 && canDelete && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center px-3.5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium rounded-md border border-red-200 dark:border-red-800 transition shadow-2xs"
            >
              <i className="mgc_delete_line text-base mr-1.5"></i>
              Clear All
            </button>
          )}
          {canCreate && (
            <Link
              to="/contacts/persons/create"
              className="inline-flex items-center px-3.5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors"
            >
              Create Person
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
                placeholder="Search persons..."
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

        {/* 📊 Summary Sub-Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700/80 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200">{persons.length}</strong> {persons.length === 1 ? "person" : "persons"}
          </span>
          <span>
            {startIndex} - {endIndex} of <strong className="text-gray-800 dark:text-gray-200">{total}</strong>
          </span>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Loading persons...</p>
          </div>
        ) : persons.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm font-medium">
            No Records Available.
          </div>
        ) : viewMode === "cards" ? (
          /* 📱 CARDS VIEW (Full details matching desktop info in clean responsive cards) */
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {persons.map((person, idx) => renderPersonCard(person, idx))}
          </div>
        ) : (
          /* 📋 TABLE VIEW (With Full-Detail Mobile Cards Fallback) */
          <>
            {/* Mobile Fallback Cards for Table View */}
            <div className="block md:hidden p-3 space-y-3">
              {persons.map((person, idx) => renderPersonCard(person, idx))}
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
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Emails</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Contact Numbers</th>
                    <th className="py-3.5 px-4 font-semibold text-gray-600 dark:text-gray-300">Organization Name</th>
                    <th className="py-3.5 px-4 font-semibold text-right text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person) => {
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
                        <td className="py-3.5 px-4 font-bold text-[#0088cc]">
                          <Link
                            to={`/contacts/persons/view/${person.id}`}
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
                          {canView && (
                            <Link
                              to={`/contacts/persons/view/${person.id}`}
                              className="inline-flex items-center text-gray-400 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="View Details"
                            >
                              <i className="mgc_eye_line text-base"></i>
                            </Link>
                          )}
                          {canEdit && (
                            <Link
                              to={`/contacts/persons/edit/${person.id}`}
                              className="inline-flex items-center text-gray-400 hover:text-[#0088cc] p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Edit"
                            >
                              <i className="mgc_edit_line text-base"></i>
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(person)}
                              className="inline-flex items-center text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
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

export default PersonsPage;
