import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { useOrganizationStore, useUserStore, useTagStore } from "@/store";
import { OrganizationFormData } from "@/interface";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { organizationSchema } from "@/schemas";
import { TagPicker } from "@/components/TagPicker";

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

const EditOrganizationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    country: "",
    state: "",
    city: "",
    postcode: "",
    user_id: "",
  });

  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [org, usersRes, tags] = await Promise.all([
        useOrganizationStore.getState().fetchOrganizationById(id!),
        useUserStore.getState().fetchUsers(1, 200),
        useTagStore.getState().fetchEntityTags("organization", id!),
      ]);

      const userRows: any = (usersRes as any)?.rows || usersRes || [];
      setUsers(userRows);

      if (tags) {
        setSelectedTagIds(tags.map((t: any) => t.id));
      }

      if (org) {
        let addrObj: any = {};
        if (typeof org.address === "object" && org.address !== null) {
          addrObj = org.address;
        } else if (typeof org.address === "string") {
          try {
            addrObj = JSON.parse(org.address);
          } catch {
            addrObj = { address: org.address };
          }
        }

        setFormData({
          name: org.name || "",
          address: addrObj.address || (typeof org.address === "string" ? org.address : ""),
          country: addrObj.country || "",
          state: addrObj.state || "",
          city: addrObj.city || "",
          postcode: addrObj.postcode || "",
          user_id: org.user_id ? String(org.user_id) : "",
        });
        if (org.custom_attributes) {
          if (typeof org.custom_attributes === "object") {
            setCustomAttributes(org.custom_attributes);
          } else if (typeof org.custom_attributes === "string") {
            try {
              setCustomAttributes(JSON.parse(org.custom_attributes));
            } catch {
              setCustomAttributes({});
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire("Error", "Failed to load organization data", "error");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const payloadToValidate = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      country: formData.country,
      state: formData.state.trim(),
      city: formData.city.trim(),
      postcode: formData.postcode.trim(),
      user_id: formData.user_id ? Number(formData.user_id) : null,
    };
    const validation = organizationSchema.safeParse(payloadToValidate);
    if (!validation.success) {
      const errs: { [key: string]: string } = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] ? String(issue.path[0]) : "general";
        errs[field] = issue.message;
      });
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
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

      const res = await useOrganizationStore.getState().updateOrganization(id!, payload);
      await useTagStore.getState().saveEntityTags("organization", id!, selectedTagIds);
      if (res?.success || res?.data?.id || res?.id || res?.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Organization updated successfully",
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/contacts/organizations");
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Failed to update organization",
        text: err?.response?.data?.message || err.message || "An error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
      </div>
    );
  }

  const inputCls =
    "w-full px-3.5 py-2.5 bg-gray-50/70 hover:bg-gray-50 focus:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-[#0088cc] dark:focus:border-[#0088cc] rounded-xl text-xs sm:text-sm font-medium transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20 dark:text-gray-100 placeholder-gray-400";
  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 🧭 Top Breadcrumb Navigation */}
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
        <Link to="/dashboard" className="text-[#0e90d9] hover:underline flex items-center gap-1">
          <i className="mgc_home_3_line text-xs"></i>
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/contacts/persons" className="text-[#0e90d9] hover:underline">
          Contacts
        </Link>
        <span>/</span>
        <Link to="/contacts/organizations" className="text-[#0e90d9] hover:underline">
          Organizations
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Edit Organization</span>
      </div>

      {/* 🏷️ Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/contacts/organizations"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Organizations"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Edit Organization
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 font-mono text-xs font-bold border border-blue-100 dark:border-blue-800/60 shrink-0">
                #ORG-{id}
              </span>
            </div>
            {formData.name ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.name}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                Update enterprise profile and address information
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            to="/contacts/organizations"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition shadow-sm"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-[#0e90d9] hover:bg-[#0c7ab8] text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <i className="mgc_check_line text-base"></i>
            )}
            <span>Save Organization</span>
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0088cc] flex items-center justify-center font-bold">
              <i className="mgc_community_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Organization Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Company identity, location, and owner</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Name Field */}
            <div>
              <label className={labelCls}>
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Corporation"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: "" });
                }}
                className={`${inputCls} ${errors.name ? "!border-red-500 !ring-red-500/20" : ""}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name}</p>}
            </div>

            {/* Address Section */}
            <div>
              <label className={labelCls}>
                Office Address
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Textarea */}
                <div>
                  <textarea
                    rows={6}
                    placeholder="Street address, building, suite..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`${inputCls} min-h-[140px] resize-none`}
                  />
                </div>

                {/* Right: Country, State, City, Postcode */}
                <div className="space-y-3">
                  <div>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="State / Region"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={inputCls}
                    />

                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Postcode / ZIP"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Owner & Tags Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1">
              <div>
                <label className={labelCls}>Sales Owner</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">-- Unassigned --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.first_name || u.email || `User #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Tags</label>
                <TagPicker
                  selectedTagIds={selectedTagIds}
                  onChange={setSelectedTagIds}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Custom Attributes for Organizations */}
        <DynamicAttributeFields
          entityType="organizations"
          values={customAttributes}
          onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        />
      </form>
    </div>
  );
};

export default EditOrganizationPage;
