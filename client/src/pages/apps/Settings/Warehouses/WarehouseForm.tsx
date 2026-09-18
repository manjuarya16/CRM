import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { ZodError } from "zod";
import { warehouseSchema } from "@/schemas/warehouse.schema";

interface WarehouseFormProps {
  mode: "create" | "edit";
}

export const WarehouseForm: React.FC<WarehouseFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  
  // Address
  const [country, setCountry] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [postcode, setPostcode] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");

  // Locations
  const [locations, setLocations] = useState<string[]>([""]);

  const [loading, setLoading] = useState<boolean>(mode === "edit");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      fetchWarehouseDetails(id);
    }
  }, [mode, id]);

  const fetchWarehouseDetails = async (warehouseId: string) => {
    try {
      setLoading(true);
      const res = await API.get("/warehouse/" + warehouseId);
      const data = res.data?.data;
      if (data) {
        setName(data.name || "");
        setDescription(data.description || "");
        setContactName(data.contact_name || "");

        // Parse contact emails
        let emailVal = "";
        if (Array.isArray(data.contact_emails) && data.contact_emails.length > 0) {
          const first = data.contact_emails[0];
          emailVal = typeof first === "object" ? first.value || first.email || "" : String(first);
        } else if (typeof data.contact_emails === "string") {
          emailVal = data.contact_emails;
        }
        setContactEmail(emailVal);

        // Parse contact numbers
        let phoneVal = "";
        if (Array.isArray(data.contact_numbers) && data.contact_numbers.length > 0) {
          const first = data.contact_numbers[0];
          phoneVal = typeof first === "object" ? first.value || first.number || "" : String(first);
        } else if (typeof data.contact_numbers === "string") {
          phoneVal = data.contact_numbers;
        }
        setContactNumber(phoneVal);

        // Parse address
        let addr = data.contact_address;
        if (typeof addr === "string") {
          try {
            addr = JSON.parse(addr);
          } catch {
            addr = {};
          }
        }
        if (addr && typeof addr === "object") {
          setCountry(addr.country || "");
          setState(addr.state || "");
          setCity(addr.city || "");
          setPostcode(addr.postcode || "");
          setStreetAddress(addr.street_address || addr.address || "");
        }

        // Parse locations
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          setLocations(data.locations.map((l: any) => (typeof l === "object" ? l.name : String(l))));
        } else {
          setLocations([""]);
        }
      }
    } catch {
      Swal.fire("Error", "Failed to load warehouse details", "error");
      navigate("/settings/warehouses");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    setLocations((prev) => [...prev, ""]);
  };

  const handleLocationChange = (index: number, val: string) => {
    setLocations((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleRemoveLocation = (index: number) => {
    setLocations((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [""];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire("Validation Error", "Warehouse name is required", "warning");
      return;
    }
    if (!contactName.trim()) {
      Swal.fire("Validation Error", "Contact person name is required", "warning");
      return;
    }

    try {
      const cleanLocations = locations.filter((l) => l.trim() !== "").map((name) => ({ name: name.trim() }));

      const payload = {
        name: name.trim(),
        description: description?.trim() || null,
        contact_name: contactName.trim(),
        contact_emails: contactEmail.trim() ? [{ value: contactEmail.trim() }] : [],
        contact_numbers: contactNumber.trim() ? [{ value: contactNumber.trim() }] : [],
        contact_address: {
          country: country.trim(),
          state: state.trim(),
          city: city.trim(),
          postcode: postcode.trim(),
          street_address: streetAddress.trim(),
        },
        locations: cleanLocations,
      };

      const validated = warehouseSchema.parse(payload);
      setSaving(true);

      if (mode === "edit" && id) {
        await API.put("/warehouse/" + id, validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Warehouse updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await API.post("/warehouse/", validated);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Warehouse created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate("/settings/warehouses");
    } catch (err: any) {
      if (err instanceof ZodError) {
        Swal.fire("Validation Error", err.issues[0]?.message || "Invalid input", "warning");
        return;
      }
      Swal.fire("Error", err?.response?.data?.message || "Failed to save warehouse", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-[#0088cc] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500">Loading warehouse details...</span>
        </div>
      </div>
    );
  }

  const isCreate = mode === "create";
  const pageTitle = isCreate ? "Create Warehouse" : "Edit Warehouse";

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/" className="text-[#0088cc] hover:underline">
              Dashboard
            </Link>{" "}
            /{" "}
            <Link to="/settings" className="text-[#0088cc] hover:underline">
              Settings
            </Link>{" "}
            /{" "}
            <Link to="/settings/warehouses" className="text-[#0088cc] hover:underline">
              Warehouses
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">{pageTitle}</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/settings/warehouses"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="mgc_check_line text-lg"></i>
                <span>Save Warehouse</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: General & Contact Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* General Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <i className="mgc_box_3_line text-lg text-[#0088cc]"></i>
              General Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Central Warehouse, East Depot"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of inventory, capacity, or storage notes..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <i className="mgc_user_3_line text-lg text-[#0088cc]"></i>
              Contact Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Contact Person Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Robert Smith (Operations Manager)"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="warehouse@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Address & Locations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact Address Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <i className="mgc_location_line text-lg text-[#0088cc]"></i>
              Physical Address
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Street Address
              </label>
              <textarea
                rows={2}
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="Building number, street name, suite/unit..."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc] focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Chicago"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  State / Province
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Illinois"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Postcode / ZIP
                </label>
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 60601"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. United States"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                />
              </div>
            </div>
          </div>

          {/* Locations Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <i className="mgc_map_pin_line text-lg text-[#0088cc]"></i>
                Storage Locations
              </h2>
              <button
                type="button"
                onClick={handleAddLocation}
                className="text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1"
              >
                <i className="mgc_add_line text-sm"></i> Add Location
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Add specific aisles, rows, or bin areas inside this warehouse.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {locations.map((loc, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={loc}
                    onChange={(e) => handleLocationChange(index, e.target.value)}
                    placeholder={"Location name (e.g. Aisle " + (index + 1) + " - Row A)"}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                  />
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                      title="Remove Location"
                    >
                      <i className="mgc_delete_2_line text-base"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
