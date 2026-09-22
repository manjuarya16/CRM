import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";

const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "United Arab Emirates",
  "Singapore",
  "Japan",
  "Brazil",
  "China",
  "Italy",
  "Spain",
  "Netherlands",
  "Switzerland",
  "Mexico",
  "South Africa",
  "Saudi Arabia",
  "New Zealand",
];

const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    country: "",
    state: "",
    city: "",
    postcode: "",
    user_id: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/user/").catch(() => ({ data: { data: { rows: [] } } }));
      const userRows = res.data?.data?.rows || res.data?.data || [];
      setUsers(userRows);
    } catch (e) {
      console.error(e);
    }
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errs.name = "Name is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: {
          address: formData.address.trim(),
          country: formData.country,
          state: formData.state.trim(),
          city: formData.city.trim(),
          postcode: formData.postcode.trim(),
        },
        user_id: formData.user_id ? Number(formData.user_id) : null,
        custom_attributes: customAttributes,
      };

      const res = await API.post("/organization", payload);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Organization created successfully",
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/contacts/organizations");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed to create organization",
        text: err?.response?.data?.message || err.message || "An error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs & Header */}
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
            /{" "}
            <Link to="/contacts/organizations" className="text-[#0088cc] hover:underline">
              Organizations
            </Link>{" "}
            / <span className="text-gray-700 dark:text-gray-300">Create Organization</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Create Organization
          </h1>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                Saving...
              </>
            ) : (
              "Save Organization"
            )}
          </button>
        </div>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 space-y-6">
        {/* Name Field */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Organization Name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: "" });
            }}
            className={`w-full px-4 py-2.5 bg-white dark:bg-gray-900 border rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors ${
              errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name}</p>}
        </div>

        {/* Address Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Address
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Textarea */}
            <div>
              <textarea
                rows={7}
                placeholder="Street address or full address..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-full min-h-[160px] px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors resize-none"
              />
            </div>

            {/* Right: Country, State, City, Postcode Stack */}
            <div className="space-y-3">
              <div>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors"
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sales Owner */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
            Sales Owner
          </label>
          <select
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 focus:border-[#0088cc] transition-colors"
          >
            <option value="">Click to add</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.first_name || u.email || `User #${u.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Custom Attributes for Organizations */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <DynamicAttributeFields
            entityType="organizations"
            values={customAttributes}
            onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          />
        </div>
      </form>
    </div>
  );
};

export default CreateOrganizationPage;
