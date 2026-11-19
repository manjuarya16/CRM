import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useWarehouseStore } from "@/store";
import { IWarehouseProduct } from "@/interface";

/* ─── helpers ─────────────────────────────────────────────── */

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

/** Extract single string value from array-or-string contact field */
const extractFirst = (val: any, keys: string[] = ["value", "email", "number"]): string => {
  if (!val) return "-";
  if (Array.isArray(val) && val.length > 0) {
    const first = val[0];
    if (typeof first === "object") {
      for (const k of keys) if (first[k]) return String(first[k]);
      return "-";
    }
    return String(first);
  }
  if (typeof val === "string" && val.trim()) return val.trim();
  return "-";
};

/** Parse contact_address object (may be a JSON string) */
const parseAddress = (raw: any): Record<string, string> => {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (typeof raw === "object") return raw;
  return {};
};

const formatFullAddress = (raw: any): string => {
  const a = parseAddress(raw);
  const parts = [
    a.street_address || a.address,
    a.city,
    a.state,
    a.postcode,
    a.country,
  ].filter(Boolean);
  return parts.join(", ") || "-";
};

/* ─── component ───────────────────────────────────────────── */

const WarehouseViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState<any>(null);
  const [products, setProducts] = useState<IWarehouseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── derived display values ── */
  const contactName  = warehouse?.contact_name || "-";
  const contactEmail = extractFirst(warehouse?.contact_emails, ["value", "email"]);
  const contactPhone = extractFirst(warehouse?.contact_numbers, ["value", "number"]);
  const fullAddress  = formatFullAddress(warehouse?.contact_address);
  const description  = warehouse?.description || "";
  const locations: any[] = Array.isArray(warehouse?.locations) ? warehouse.locations : [];
  const locCount = locations.length;

  const avatarColor = AVATAR_COLORS[(warehouse?.id || 0) % AVATAR_COLORS.length];

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        // Use fetchWarehouseById to get FULL details (not the list endpoint)
        const data = await useWarehouseStore.getState().fetchWarehouseById(id);
        if (!data) { setError("Warehouse not found."); return; }
        setWarehouse(data);

        setProductsLoading(true);
        const prods = await useWarehouseStore.getState().fetchWarehouseProducts(data.id);
        setProducts(prods || []);
      } catch {
        setError("Failed to load warehouse details.");
      } finally {
        setLoading(false);
        setProductsLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── loading ── */
  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-28 text-gray-400">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-2 border-[#0088cc] border-t-transparent mb-3"></div>
          <p className="text-sm font-medium">Loading warehouse details…</p>
        </div>
      </div>
    );
  }

  /* ── error ── */
  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-24">
        <i className="mgc_store_2_line text-6xl text-gray-200 dark:text-gray-700 block mb-3"></i>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-4">{error}</p>
        <button
          onClick={() => navigate("/settings/warehouses")}
          className="px-5 py-2 bg-[#0088cc] text-white text-xs font-semibold rounded-xl hover:bg-[#0077b5] transition"
        >
          ← Back to Warehouses
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* ── Breadcrumb ── */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/settings" className="text-[#0e90d9] hover:underline">Settings</Link>
        <span>/</span>
        <Link to="/settings/warehouses" className="text-[#0e90d9] hover:underline">Warehouses</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[180px]">
          {warehouse?.name || "View"}
        </span>
      </div>

      {/* ── Page Title ── */}
      <div className="pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Warehouse Details
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Full information and inventory for this storage facility
        </p>
      </div>

      {/* ── Hero Identity Card ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#0088cc]/15 via-sky-100/60 to-indigo-100/40 dark:from-[#0088cc]/20 dark:via-sky-900/20 dark:to-indigo-900/10" />
        <div className="px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-8">
            <span className={`h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-md ring-4 ring-white dark:ring-gray-800 ${avatarColor}`}>
              {getInitials(warehouse?.name, "WH")}
            </span>
            <div className="pb-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {warehouse?.name}
                </h2>
                <span className="font-mono text-xs font-bold text-[#0088cc] dark:text-[#38bdf8] bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-900/50">
                  #WH-{warehouse?.id}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Storage Facility</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <i className="mgc_user_3_line text-lg"></i>
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Contact</div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">
              {contactName === "-" ? <span className="text-gray-400 font-normal italic">—</span> : contactName}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-[#0088cc] dark:text-sky-400 flex items-center justify-center shrink-0">
            <i className="mgc_phone_line text-lg"></i>
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Phone</div>
            <div className="text-sm font-bold text-[#0088cc] dark:text-[#38bdf8] truncate mt-0.5">
              {contactPhone}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4 flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <i className="mgc_store_2_line text-lg"></i>
          </span>
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500 uppercase font-semibold tracking-wide">Locations</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {locCount} defined
            </div>
          </div>
        </div>

        
      </div>

      {/* ── Contact Information ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <i className="mgc_information_line text-[#0088cc]"></i>
            Contact Information
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="text-xs text-gray-500 font-medium block mb-1">Contact Person</span>
            <div className="flex items-center gap-2">
              <i className="mgc_user_3_line text-gray-400 shrink-0"></i>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{contactName}</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block mb-1">Email Address</span>
            <div className="flex items-center gap-2">
              <i className="mgc_mail_line text-gray-400 shrink-0"></i>
              <span className="font-semibold text-gray-800 dark:text-gray-200 break-all">{contactEmail}</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block mb-1">Phone Number</span>
            <div className="flex items-center gap-2">
              <i className="mgc_phone_line text-gray-400 shrink-0"></i>
              <span className="font-semibold text-[#0088cc] dark:text-[#38bdf8]">{contactPhone}</span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 font-medium block mb-1">Address</span>
            <div className="flex items-start gap-2">
              <i className="mgc_location_line text-gray-400 shrink-0 mt-0.5"></i>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{fullAddress}</span>
            </div>
          </div>
          {description && (
            <div className="sm:col-span-2">
              <span className="text-xs text-gray-500 font-medium block mb-1">Description</span>
              <div className="flex items-start gap-2">
                <i className="mgc_file_line text-gray-400 shrink-0 mt-0.5"></i>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{description}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Locations List ── */}
      {locCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <i className="mgc_map_pin_line text-[#0088cc]"></i>
              Warehouse Locations
            </h3>
            <span className="text-xs font-medium text-[#0088cc] bg-sky-50 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-full border border-sky-200/80 dark:border-sky-800">
              {locCount} location{locCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {locations.map((loc: any, i: number) => {
              const name = typeof loc === "object" ? loc.name : String(loc);
              const desc = typeof loc === "object" ? loc.description : "";
              return (
                <div key={loc?.id ?? i} className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center shrink-0">
                    <i className="mgc_map_pin_line text-sm"></i>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {name || `Location ${i + 1}`}
                    </p>
                    {desc && <p className="text-[11px] text-gray-500 truncate mt-0.5">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
{false && (


      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <i className="mgc_box_line text-[#0088cc]"></i>
            Current Inventory
          </h3>
          <span className="text-xs font-medium text-[#0088cc] bg-sky-50 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-full border border-sky-200/80 dark:border-sky-800">
            {products.length} item{products.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="p-5">
          {productsLoading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-[#0088cc] border-t-transparent mb-2"></div>
              <p className="text-xs font-medium">Loading inventory…</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <i className="mgc_box_line text-5xl text-gray-200 dark:text-gray-700 block mb-2"></i>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                No products currently in stock at this warehouse.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">Location</th>
                    <th className="py-3 px-4 font-semibold text-center">In Stock</th>
                    <th className="py-3 px-4 font-semibold text-center">Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {products.map((p, pIdx) => (
                    <tr key={pIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {p.name || (p as any).product_name || `Product #${p.id || (p as any).product_id}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                        {p.warehouse_location_name || "Default"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.in_stock || 0}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
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
) }
    </div>
  );
};

export default WarehouseViewPage;
