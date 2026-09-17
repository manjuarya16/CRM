import { PageBreadcrumb } from "../../../../components";
import React, { useState, useEffect } from "react";
import { useUserStore } from "@/store";
import { useRoleStore } from "@/store";
import { useBranchStore } from "@/store";
import { useDepartmentStore } from "@/store";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useNavigate, useParams } from "react-router-dom";
import commonAPI from "@/helpers/api/common";
import { handleErrorResponse, handleSuccessResponse } from "@/utils/swalAlert";
import { updateUserSchema } from "../../../../schemas/userSchema.ts";
import { ZodError } from "zod";
import ImageUploader from "@/components/ImageUploader";
import { UserFormDataEit } from "@/interface/userInterface";

const UserEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthorization();
  const {
    users,
    loading: userLoading,
    fetchUsers,
    updateUser,
    fetchUserById,
    selectedUser,
    setSelectedUser,
  } = useUserStore();
  const { roles, fetchRoles } = useRoleStore();
  const { branches, getBranches } = useBranchStore();
  const { departments, fetchDepartments } = useDepartmentStore();

  const [formData, setFormData] = useState<UserFormDataEit>({
    id: undefined,
    name: "",
    email: "",
    phone: "",
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

  const [errors, setErrors] = useState<Record<string, string | string[]>>({});
  const [formValid, setFormValid] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [states, setStates] = useState<Array<any>>([]);
  const [cities, setCities] = useState<Array<any>>([]);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      // Clear stale selectedUser before loading new one
      setSelectedUser(null);
      await Promise.all([fetchRoles(), getBranches(), fetchDepartments()]);

      if (id) {
        try {
          await fetchUserById(Number(id), true);
        } catch (e) {
          // ignore
        }
      }

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
        // ignore
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate form when selectedUser, users list, roles, or departments change
  useEffect(() => {
    const populate = async () => {
      const sourceUser: any =
        selectedUser ||
        (id ? users.find((u) => String(u.id) === String(id)) : null);
      if (!sourceUser) return;
      if (roles.length === 0) return;
      if (departments.length === 0) return;
      // wait until states are loaded before populating to avoid blank state name
      if (states.length === 0) return;

      const user = sourceUser;

      // If the user record has no user_id, request a server-generated candidate
      if (!user.user_id) {
        try {
          const resp = await commonAPI.getNextUserId();
          if (resp?.data?.success && resp.data.data?.user_id) {
            setFormData((prev) => ({
              ...prev,
              user_id: String(resp.data.data.user_id),
            }));
          }
        } catch (e) {
          // ignore
        }
      }

      const deptId = user.department_id
        ? Number(user.department_id)
        : undefined;

      const resolvedRoleId = user.role_id
        ? Number(user.role_id)
        : user.role && typeof user.role === "object" && user.role.id
          ? Number(user.role.id)
          : user.role && typeof user.role === "string"
            ? Number(user.role)
            : undefined;

      const resolvedBranchId = user.branch_id
        ? Number(user.branch_id)
        : user.branch && typeof user.branch === "object" && user.branch.id
          ? Number(user.branch.id)
          : undefined;

      const resolvedDepartmentId = deptId;

      setFormData((prev) => ({
        ...prev,
        user_id: user.user_id ? String(user.user_id) : prev.user_id,
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role_id: resolvedRoleId,
        branch_id: resolvedBranchId,
        department_id: resolvedDepartmentId,
        organization_id: user.organization_id,
        street: user.address_line1 || user.street || "",
        postal_code: user.postal_code || "",
        country: user.country || "",
        address_type: user.address_type || "home",
        state_id: user.state_id ? Number(user.state_id) : undefined,
        city_id: user.city_id ? Number(user.city_id) : undefined,
        state: "",
        city: "",
      }));

      if (user.profile_img) setProfilePreview(user.profile_img);

      // If server returned a state_id, fetch cities for it and select the city
      if (user.state_id) {
        try {
          const resp = await commonAPI.getCitiesByState(user.state_id);
          const raw = resp?.data?.data || [];
          const filtered = raw.filter(
            (c: any) =>
              c &&
              (c.name || c.city || c.city_name || c.value) &&
              (c.name || c.city || c.city_name || c.value).toString().trim() !==
                "",
          );
          setCities(filtered);
          if (user.city_id) {
            const matchedCity = filtered.find(
              (c: any) => String(c.id) === String(user.city_id),
            );
            if (matchedCity) {
              setFormData((prev) => ({
                ...prev,
                city_id: matchedCity.id,
                city: matchedCity.name || matchedCity.city || "",
              }));
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Map state name from states if available
      if (user.state_id && states.length > 0) {
        const matchedState = states.find(
          (s: any) => String(s.id) === String(user.state_id),
        );
        if (matchedState)
          setFormData((prev) => ({ ...prev, state: matchedState.name }));
      }
    };

    populate();
    // only re-run when these change
  }, [id, users, selectedUser, states, departments, roles]);

  useEffect(() => {
    try {
      updateUserSchema.parse(formData as any);
      setFormValid(true);
    } catch (error) {
      setFormValid(false);
    }
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    // handle selects for ids
    if (name === "state_id") {
      const stateId = parseInt(value) || undefined;
      const selected = states.find((s) => s.id === stateId);
      const next = {
        ...formData,
        state_id: stateId,
        state: selected ? selected.name : "",
        // reset city when state changes
        city_id: undefined,
        city: "",
      };
      setFormData(next);
      // validate live
      try {
        const parsed = updateUserSchema.safeParse(next);
        if (parsed.success) {
          setErrors({});
          setFormValid(true);
        } else {
          const newErrors: Record<string, string[]> = {};
          parsed.error.issues.forEach((err: any) => {
            const path = err.path.join(".");
            const message: string = err.message || "";
            const add = (k: string, m: string) => {
              if (!newErrors[k]) newErrors[k] = [];
              newErrors[k].push(m);
            };
            if (!path || path === "") {
              if (message.includes("City is required")) {
                add("city_id", message);
                add("city", message);
              } else if (message.includes("Postal code is required")) {
                add("postal_code", message);
              } else {
                add("", message);
              }
            } else {
              add(path, message);
              if (path === "city_id") add("city", message);
              if (path === "state_id") add("state", message);
            }
          });
          setErrors(newErrors as any);
          setFormValid(false);
        }
      } catch (e) {
        setFormValid(false);
      }

      // fetch cities for this state
      if (stateId) {
        commonAPI
          .getCitiesByState(stateId)
          .then(async (res) => {
            const raw = res?.data?.data || [];
            // filter out entries with empty/blank names
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
                const statesData = sc?.data?.data?.states || [];
                const matchedState = statesData.find(
                  (s: any) => s.id === stateId || s.id === Number(stateId),
                );
                const fallbackCities = (matchedState?.cities || []).filter(
                  (c: any) =>
                    c &&
                    (c.name || c.city || c.city_name || c.value) &&
                    (c.name || c.city || c.city_name || c.value)
                      .toString()
                      .trim() !== "",
                );
                setCities(fallbackCities);
              } catch (e) {
                console.error("Fallback getStateCities failed", e);
                setCities([]);
              }
            }
          })
          .catch((err) => {
            console.error("Failed to fetch cities for state", stateId, err);
            setCities([]);
          });
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
      try {
        const parsed = updateUserSchema.safeParse(next);
        if (parsed.success) {
          setErrors({});
          setFormValid(true);
        } else {
          const newErrors: Record<string, string[]> = {};
          parsed.error.issues.forEach((err: any) => {
            const path = err.path.join(".");
            const message: string = err.message || "";
            const add = (k: string, m: string) => {
              if (!newErrors[k]) newErrors[k] = [];
              newErrors[k].push(m);
            };
            if (!path || path === "") {
              if (message.includes("City is required")) {
                add("city_id", message);
                add("city", message);
              } else if (message.includes("Postal code is required")) {
                add("postal_code", message);
              } else {
                add("", message);
              }
            } else {
              add(path, message);
              if (path === "city_id") add("city", message);
              if (path === "state_id") add("state", message);
            }
          });
          setErrors(newErrors as any);
          setFormValid(false);
        }
      } catch (e) {
        setFormValid(false);
      }

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
    try {
      const parsed = updateUserSchema.safeParse(next);
      if (parsed.success) {
        setErrors({});
        setFormValid(true);
      } else {
        const newErrors: Record<string, string[]> = {};
        parsed.error.issues.forEach((err: any) => {
          const path = err.path.join(".");
          const message: string = err.message || "";
          const add = (k: string, m: string) => {
            if (!newErrors[k]) newErrors[k] = [];
            newErrors[k].push(m);
          };
          if (!path || path === "") {
            if (message.includes("City is required")) {
              add("city_id", message);
              add("city", message);
            } else if (message.includes("Postal code is required")) {
              add("postal_code", message);
            } else if (message.includes("Country is required")) {
              add("country", message);
            } else {
              add("", message);
            }
          } else {
            add(path, message);
            if (path === "city_id") add("city", message);
            if (path === "state_id") add("state", message);
            if (path === "country") add("country", message);
          }
        });
        setErrors(newErrors as any);
        setFormValid(false);
      }
    } catch (e) {
      setFormValid(false);
    }
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setShowErrors(false);
      // Validate using Zod schema
      setErrors({});
      const validatedData = updateUserSchema.parse(formData as any);

      const payload = {
        name: validatedData.name,
        email: validatedData.email ?? formData.email,
        phone: formData.phone || null,
        role_id: validatedData.role_id,
        branch_id: validatedData.branch_id,
        department_id: validatedData.department_id,
        street: formData.street || null,
        city_id: validatedData.city_id,
        city: validatedData.city,
        state_id: validatedData.state_id,
        state: validatedData.state,
        postal_code: formData.postal_code || null,
        country: validatedData.country,
        address_type: validatedData.address_type,
        updated_by: currentUser?.id,
      };
      const resp = await updateUser(formData.id!, payload);
      handleSuccessResponse("User", "updated", null);
      navigate("/management/users");
    } catch (error) {
      setShowErrors(true);
      if (error instanceof ZodError) {
        // Extract validation errors and set in state (arrays)
        const newErrors: Record<string, string[]> = {};
        error.issues.forEach((err: any) => {
          const path = err.path.join(".");
          const message: string = err.message || "";
          const add = (k: string, m: string) => {
            if (!newErrors[k]) newErrors[k] = [];
            newErrors[k].push(m);
          };

          if (!path || path === "") {
            if (message.includes("City is required")) {
              add("city_id", message);
              add("city", message);
            } else if (message.includes("Postal code is required")) {
              add("postal_code", message);
            } else {
              add("", message);
            }
          } else {
            add(path, message);
            if (path === "city_id") add("city", message);
            if (path === "state_id") add("state", message);
          }
        });
        setErrors(newErrors);
      } else {
        // Handle server-side validation errors
        const axiosErr = error as any;
        if (axiosErr?.response?.data?.errors) {
          setErrors(axiosErr.response.data.errors);
        } else {
          handleErrorResponse("User", "update", error);
        }
      }
    }
  };

  const handleCancel = () => {
    navigate("/management/users");
  };

  const renderFieldErrors = (key: string) => {
    if (!showErrors) return null;
    // Collect messages for exact key and dotted variants like 'address.city' or 'address.city_id'
    const collect = (k: string) => {
      const val = errors[k];
      if (!val) return [] as string[];
      return Array.isArray(val) ? val.slice() : [String(val)];
    };

    let msgs: string[] = [];
    msgs = msgs.concat(collect(key));
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

    // dedupe
    msgs = Array.from(new Set(msgs));
    if (msgs.length === 0) return null;
    return <p className="mt-1 text-sm text-red-500">{msgs[0]}</p>;
  };

return (
    <>
      <PageBreadcrumb
        name="Edit User"
        title="Edit User"
        breadCrumbItems={["User Management", "Edit User"]}
      />

      <div className="grid lg:grid-cols-4 gap-6">
        {/* LEFT SIDE - Profile */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="card-title"></h4>
            </div>

            <div className="rounded p-4">
              <ImageUploader
                accept="image/*"
                maxSize={5}
                centered={true}
                previewSize={96}
                label="Upload Profile"
                required={false}
                onImageUpload={async (file: File, preview: string) => {
                  setProfileFile(file);
                  if (preview) setProfilePreview(preview);
                  const userId = formData.id ?? (id ? Number(id) : null);
                  if (!userId || !file?.name) return;
                  try {
                    const toDataUrl = (f: File) =>
                      new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result as string);
                        r.onerror = reject;
                        r.readAsDataURL(f);
                      });
                    const dataUrl = await toDataUrl(file);
                    const payload = {
                      tableName: "users",
                      columnName: "profile_img",
                      recordId: Number(userId),
                      filename: file.name,
                      content: dataUrl,
                    };
                    const uploadResp =
                      await commonAPI.uploadBase64ToDb(payload);
                    if (uploadResp?.data?.data?.profile_img) {
                      setProfilePreview(uploadResp.data.data.profile_img);
                    }
                  } catch (err) {
                    console.error("Profile upload failed:", err);
                  }
                }}
                preview={profilePreview}
              />
              {renderFieldErrors("profile_img")}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <p className="card-title">User Information</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid md:grid-cols-2 gap-4">
                {/* User ID removed from edit form (read-only elsewhere) */}

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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${
                      errors.name
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${
                      errors.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:bg-slate-700 dark:border-slate-600 ${
                      errors.phone
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-primary"
                    }`}
                    placeholder="Enter phone number"
                  />
                  {renderFieldErrors("phone")}
                </div>

                {/* Role */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role_id"
                    value={
                      formData.role_id !== undefined &&
                      formData.role_id !== null
                        ? String(formData.role_id)
                        : ""
                    }
                    onChange={handleChange}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600 opacity-60 cursor-not-allowed"
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
                      formData.branch_id !== undefined &&
                      formData.branch_id !== null
                        ? String(formData.branch_id)
                        : ""
                    }
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
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
                      formData.department_id !== undefined &&
                      formData.department_id !== null
                        ? String(formData.department_id)
                        : ""
                    }
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
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

                {/* Street */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Street
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
                    value={
                      formData.state_id !== undefined &&
                      formData.state_id !== null
                        ? String(formData.state_id)
                        : ""
                    }
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="">Select a state</option>
                    {states.map((s: any) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
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
                    value={
                      formData.city_id !== undefined &&
                      formData.city_id !== null
                        ? String(formData.city_id)
                        : ""
                    }
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                  >
                    <option value="">Select a city</option>
                    {cities.length === 0 && (
                      <option value="" disabled>
                        No cities available
                      </option>
                    )}
                    {cities.map((c: any) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name || c.city || c.id}
                      </option>
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

                {/* Country */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:border-slate-600"
                    placeholder="Country"
                  />
                  {renderFieldErrors("country")}
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

              <div className="flex justify-start gap-3 mt-6">
                <button
                  type="submit"
                  disabled={userLoading || !formValid}
                  className="inline-flex items-center justify-center  w-28
  rounded-md border border-transparent bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {userLoading ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center  w-28
  rounded-md border border-transparent bg-gray-400 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-500"
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

export default UserEdit;
