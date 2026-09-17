import { PageBreadcrumb } from "../../../../components";
import React, { useState, useEffect } from "react";
import { useUserStore } from "@/store";
import { useRoleStore } from "@/store";
import { useBranchStore } from "@/store";
import { useDepartmentStore } from "@/store";
import commonAPI from "@/helpers/api/common";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useNavigate } from "react-router-dom";
import {
  handleErrorResponse,
  showConfirmDialog,
  showInfoAlert,
} from "@/utils/swalAlert";
import { createUserSchema } from "../../../../schemas/userSchema.ts";
import { ZodError } from "zod";
import ImageUploader from "@/components/ImageUploader";
import { UserFormDataAdd } from "@/interface/userInterface";

const UserCreate = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthorization();
  const { loading: userLoading, addUser } = useUserStore();
  const { roles, fetchRoles } = useRoleStore();
  const { branches, getBranches } = useBranchStore();
  const { departments, fetchDepartments } = useDepartmentStore();

  const [formData, setFormData] = useState<UserFormDataAdd>({
    name: "",
    email: "",
    phone: "",
    user_id: undefined,
    password: "",
    role_id: undefined,
    branch_id: undefined,
    department_id: undefined,
    organization_id: currentUser?.organization_id,
    street: "",
    city: "",
    state: "",
    state_id: undefined,
    city_id: undefined,
    postal_code: "",
    country: "",
    address_type: "home",
  });

  const [states, setStates] = useState<Array<any>>([]);
  const [cities, setCities] = useState<Array<any>>([]);
  const [errors, setErrors] = useState<Record<string, string | string[]>>({});
  const [formValid, setFormValid] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");

  useEffect(() => {
    fetchRoles();
    getBranches();
    fetchDepartments();
    (async () => {
      try {
        const res = await commonAPI.getStates();
        if (res?.data?.data) {
          const raw = res.data.data || [];
          const dedupedByName = Array.from(
            new Map(
              raw.map((s: any) => [s.name?.toString().trim().toLowerCase(), s]),
            ).values(),
          );
          setStates(dedupedByName);
        }
      } catch (err) {
        console.error("Failed to fetch states:", err);
      }
    })();
  }, [fetchRoles, getBranches, fetchDepartments]);

  useEffect(() => {
    let mounted = true;
    const fetchServerId = async () => {
      try {
        const resp = await commonAPI.getNextUserId();
        if (mounted && resp?.data?.success && resp.data.data?.user_id) {
          setFormData((prev) => ({
            ...prev,
            user_id: String(resp.data.data.user_id),
          }));
          return;
        }
      } catch (e) {
        /* ignore */
      }
      if (mounted && !formData.user_id) {
        setFormData((prev) => ({ ...prev, user_id: "10001" }));
      }
    };
    fetchServerId();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = (data: any) => {
    try {
      const parsed = createUserSchema.safeParse(data);
      if (parsed.success) {
        setErrors({});
        setFormValid(true);
        return true;
      }
      const newErrors: Record<string, string[]> = {};
      parsed.error.issues.forEach((err: any) => {
        const path = err.path.join(".");
        const message: string = err.message || "";
        const add = (k: string, m: string) => {
          if (!newErrors[k]) newErrors[k] = [];
          newErrors[k].push(m);
        };
        if (!path || path === "") {
          add("", message);
        } else {
          add(path, message);
          if (path === "city_id") add("city", message);
          if (path === "state_id") add("state", message);
        }
      });
      setErrors(newErrors as any);
      setFormValid(false);
      return false;
    } catch (err) {
      setFormValid(false);
      return false;
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "state_id") {
      const stateId = parseInt(value) || undefined;
      const selected = states.find((s) => s.id === stateId);
      const next = {
        ...formData,
        state_id: stateId,
        state: selected ? selected.name : "",
        city_id: undefined,
        city: "",
      };
      setFormData(next);
      validateForm(next);
      if (stateId) {
        commonAPI
          .getCitiesByState(stateId)
          .then(async (res) => {
            const raw = res?.data?.data || [];
            const filtered = raw.filter(
              (c: any) =>
                c &&
                (c.name || c.city || c.city_name || c.value) &&
                (c.name || c.city || c.city_name || c.value)
                  .toString()
                  .trim() !== "",
            );
            if (filtered.length > 0) {
              setCities(filtered);
            } else {
              try {
                const sc = await commonAPI.getStateCities();
                const matchedState = (sc?.data?.data?.states || []).find(
                  (s: any) => s.id === stateId || s.id === Number(stateId),
                );
                setCities(
                  (matchedState?.cities || []).filter(
                    (c: any) =>
                      c &&
                      (c.name || c.city || c.city_name || c.value) &&
                      (c.name || c.city || c.city_name || c.value)
                        .toString()
                        .trim() !== "",
                  ),
                );
              } catch (e) {
                setCities([]);
              }
            }
          })
          .catch(() => setCities([]));
      } else {
        setCities([]);
      }
      return;
    }

    if (name === "city_id") {
      const cityId = parseInt(value) || undefined;
      const selectedCity = cities.find((c) => c.id === cityId);
      const cityName = selectedCity
        ? selectedCity.name ||
          selectedCity.city ||
          selectedCity.city_name ||
          selectedCity.value ||
          ""
        : "";
      const next = { ...formData, city_id: cityId, city: cityName };
      setFormData(next);
      validateForm(next);
      return;
    }

    const next = {
      ...formData,
      [name]:
        name === "role_id" || name === "branch_id" || name === "department_id"
          ? parseInt(value) || undefined
          : value,
    };
    // Trim strings to remove pre/post spaces except `name` to allow typing spaces
    Object.keys(next).forEach((k) => {
      const v = (next as any)[k];
      if (typeof v === "string" && k !== "name" && k !== "street") (next as any)[k] = v.trim();
    });
    setFormData(next);
    validateForm(next);
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrors({});
      setShowErrors(false);
      let localForm = { ...formData } as any;
      const validated = createUserSchema.parse(localForm);
      const payload = {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        password: formData.password,
        user_id: Number(localForm.user_id),
        role_id: formData.role_id,
        branch_id: formData.branch_id,
        department_id: formData.department_id,
        organization_id: formData.organization_id,
        street: formData.street,
        city_id: validated.city_id || formData.city_id,
        city: validated.city || formData.city,
        state_id: validated.state_id || formData.state_id,
        state: validated.state || formData.state,
        postal_code: formData.postal_code,
        country: validated.country || formData.country,
        address_type: validated.address_type || formData.address_type,
        created_by: currentUser?.id,
      };
      const created = await addUser(payload);
      if (profileFile && created) {
        try {
          const fileToDataUrl = (file: File) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          const dataUrl = await fileToDataUrl(profileFile);
          let recordId: number | undefined;
          if (typeof created === "number") {
            recordId = created;
          } else if (typeof created === "object" && created !== null) {
            recordId =
              Number((created as any).id || (created as any).create_user) ||
              undefined;
          } else {
            recordId = Number(created) || undefined;
          }
          if (recordId && recordId > 0) {
            const uploadResp = await commonAPI.uploadBase64ToDb({
              tableName: "users",
              columnName: "profile_img",
              recordId,
              filename: profileFile.name,
              content: dataUrl,
            });
            if (uploadResp?.data?.data?.profile_img)
              setProfilePreview(uploadResp.data.data.profile_img);
          }
        } catch (uploadErr) {
          console.error("Profile upload failed:", uploadErr);
        }
      }
      const assignmentPrompt = await showConfirmDialog(
        "Set up salary assignment?",
        "This user needs a salary assignment before payroll can use their individual salary, allowances, and overtime rate.",
      );
      if (assignmentPrompt.isConfirmed) {
        const createdUserId = Number(
          typeof created === "object" && created !== null
            ? (created as any).id || (created as any).create_user
            : created,
        );
        navigate(
          `/apps/salary-management?tab=assignments${createdUserId ? `&userId=${createdUserId}` : ""}`,
        );
      } else {
        navigate("/management/users");
      }
    } catch (error) {
      setShowErrors(true);
      if (error instanceof ZodError) {
        const newErrors: Record<string, string[]> = {};
        error.issues.forEach((err: any) => {
          const path = err.path.join(".");
          const message: string = err.message || "";
          const add = (k: string, m: string) => {
            if (!newErrors[k]) newErrors[k] = [];
            newErrors[k].push(m);
          };
          if (!path || path === "") {
            add("", message);
          } else {
            add(path, message);
            if (path === "city_id") add("city", message);
            if (path === "state_id") add("state", message);
          }
        });
        setErrors(newErrors);
      } else {
        const axiosErr = error as any;
        if (axiosErr?.response?.data?.errors) {
          setErrors(axiosErr.response.data.errors);
        } else {
          handleErrorResponse("User", "create", error);
        }
      }
    }
  };

  const handleCancel = () => navigate("/management/users");

  const renderFieldErrors = (key: string) => {
    if (!showErrors) return null;
    const collect = (k: string) => {
      const val = errors[k];
      if (!val) return [] as string[];
      return Array.isArray(val) ? val.slice() : [String(val)];
    };
    let msgs = collect(key);
    Object.keys(errors).forEach((k) => {
      if (k === key) return;
      if (
        k.endsWith(`.${key}`) ||
        k.startsWith(`${key}.`) ||
        k.includes(`.${key}.`)
      ) {
        msgs = msgs.concat(collect(k));
      }
    });
    msgs = Array.from(new Set(msgs));
    if (msgs.length === 0) return null;
    return <p className="mt-1 text-sm text-red-500">{msgs[0]}</p>;
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${showErrors && errors[field] ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-primary"}`;

  const selectCls = (field: string) =>
    `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${showErrors && errors[field] ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-primary"}`;

  return (
    <>
      <PageBreadcrumb
        name="Create User"
        title="Create User"
        breadCrumbItems={["User Management", "Create User"]}
      />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* LEFT - Profile Image */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="card p-6">
            <div className="rounded p-4">
              <ImageUploader
                accept="image/*"
                maxSize={5}
                centered={true}
                previewSize={96}
                label="Upload Profile"
                required={false}
                onImageUpload={(file: File, preview: string) => {
                  setProfileFile(file);
                  if (preview) setProfilePreview(preview);
                }}
                preview={profilePreview}
                onUpload={async () => {
                  showInfoAlert(
                    "Info",
                    "Please save the user first to upload the profile image.",
                  );
                }}
              />
              {renderFieldErrors("profile_img")}
            </div>
          </div>
        </div>

        {/* RIGHT - Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="card-title">User Information</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid md:grid-cols-2 gap-4">
                {/* User ID */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    User ID{" "}
                  </label>
                  <input
                    type="text"
                    name="user_id"
                    value={
                      formData.user_id ? `USR-${String(formData.user_id)}` : ""
                    }
                    disabled
                    className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 border-gray-300 bg-gray-50"
                    placeholder="Auto generated"
                  />
                </div>

                {/* User Name */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    User Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputCls("name")}
                    placeholder="Enter user name"
                  />
                  {renderFieldErrors("name")}
                </div>

                {/* Email */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputCls("email")}
                    placeholder="Enter email"
                  />
                  {renderFieldErrors("email")}
                </div>

                {/* Phone */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    className={inputCls("phone")}
                    placeholder="Enter phone number"
                  />
                  {renderFieldErrors("phone")}
                </div>

                {/* Password */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password || ""}
                    onChange={handleChange}
                    className={inputCls("password")}
                    placeholder="Enter password"
                  />
                  {renderFieldErrors("password")}
                </div>

                {/* Role */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role_id"
                    value={
                      formData.role_id != null ? String(formData.role_id) : ""
                    }
                    onChange={handleChange}
                    className={selectCls("role_id")}
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  {renderFieldErrors("role_id")}
                </div>

                {/* Branch */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="branch_id"
                    value={
                      formData.branch_id != null
                        ? String(formData.branch_id)
                        : ""
                    }
                    onChange={handleChange}
                    className={selectCls("branch_id")}
                  >
                    <option value="">Select a branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {renderFieldErrors("branch_id")}
                </div>

                {/* Department */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="department_id"
                    value={
                      formData.department_id != null
                        ? String(formData.department_id)
                        : ""
                    }
                    onChange={handleChange}
                    className={selectCls("department_id")}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {renderFieldErrors("department_id")}
                </div>

                {/* Country */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = {
                        ...formData,
                        country: val,
                        ...(val !== "India" ? { state_id: undefined, state: "", city_id: undefined, city: "" } : {}),
                      };
                      setFormData(next);
                      if (val !== "India") setCities([]);
                      validateForm(next);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="">Select country</option>
                    <option value="India">India</option>
                    <option value="Other">Other</option>
                  </select>
                  {renderFieldErrors("country")}
                </div>

                {/* Street */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                    placeholder="Street address"
                  />
                  {renderFieldErrors("street")}
                </div>

                {/* State */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State
                  </label>
                  <select
                    name="state_id"
                    value={formData.state_id != null ? String(formData.state_id) : ""}
                    onChange={handleChange}
                    disabled={formData.country !== "India"}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600 ${formData.country !== "India" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select a state</option>
                    {states.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                  {renderFieldErrors("state_id")}
                </div>

                {/* City */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <select
                    name="city_id"
                    value={formData.city_id != null ? String(formData.city_id) : ""}
                    onChange={handleChange}
                    disabled={formData.country !== "India"}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600 ${formData.country !== "India" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select a city</option>
                    {cities.length === 0 && (
                      <option value="" disabled>No cities available</option>
                    )}
                    {cities.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name || c.city || c.id}</option>
                    ))}
                  </select>
                  {renderFieldErrors("city_id")}
                </div>

                {/* Postal Code */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                    placeholder="Postal code"
                  />
                  {renderFieldErrors("postal_code")}
                </div>

                {/* Address Type */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Type
                  </label>
                  <select
                    name="address_type"
                    value={formData.address_type || "home"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                  {renderFieldErrors("address_type")}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-start gap-3 mt-6">
                <button
                  type="submit"
                  disabled={userLoading}
                  className="inline-flex justify-center  w-28
  items-center rounded-md border border-transparent bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {userLoading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex justify-center  w-28
  justify-center items-center rounded-md border border-transparent bg-gray-400 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserCreate;
