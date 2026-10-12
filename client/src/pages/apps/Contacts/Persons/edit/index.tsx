import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";
import { usePersonStore, useOrganizationStore, useUserStore, useTagStore } from "@/store";
import { DynamicAttributeFields } from "@/components/DynamicAttributeFields";
import { personSchema } from "@/schemas";

import { PersonEmailItem, ContactItem, PersonFormData } from "@/interface";
import { TagPicker } from "@/components/TagPicker";

const EditPersonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<{
    name: string;
    emails: PersonEmailItem[];
    contact_numbers: ContactItem[];
    organization_id: string;
    job_title: string;
    user_id: string;
  }>({
    name: "",
    emails: [{ label: "work", value: "" }],
    contact_numbers: [{ label: "work", value: "" }],
    organization_id: "",
    job_title: "",
    user_id: "",
  });

  useEffect(() => {
    fetchMetadataAndPerson();
  }, [id]);

  const fetchMetadataAndPerson = async () => {
    try {
      setLoading(true);
      const [orgsRes, usersRes, person, tags] = await Promise.all([
        useOrganizationStore.getState().fetchOrganizations(1, 100),
        useUserStore.getState().fetchUsers(1, 200),
        usePersonStore.getState().getPersonById(id!),
        useTagStore.getState().fetchEntityTags("person", id!),
      ]);

      setOrganizations(orgsRes?.data || []);
      const userRows: any = (usersRes as any)?.rows || usersRes || [];
      setUsers(userRows);

      if (tags) {
        setSelectedTagIds(tags.map((t: any) => t.id));
      }

      if (person) {
        const unpackItems = (raw: any, defaultLabel = "work"): Array<{ label: string; value: string }> => {
          if (!raw) return [];
          const parseStr = (str: string, label = defaultLabel): Array<{ label: string; value: string }> => {
            let clean = str.trim().replace(/""/g, '"');
            if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) clean = clean.slice(1, -1);
            if ((clean.startsWith("[") && clean.endsWith("]")) || (clean.startsWith("{") && clean.endsWith("}"))) {
              try {
                const p = JSON.parse(clean);
                return unpackItems(p, label);
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
            const res: Array<{ label: string; value: string }> = [];
            for (const item of raw) {
              if (typeof item === "object" && item !== null) {
                const itemVal = item.value ?? item.email ?? item.phone ?? item.contact;
                const itemLabel = item.label || defaultLabel;
                if (typeof itemVal === "string" && (itemVal.startsWith("[") || itemVal.startsWith("{") || itemVal.includes(":") || itemVal.includes(","))) {
                  res.push(...parseStr(itemVal, itemLabel));
                } else if (itemVal) {
                  res.push({ label: itemLabel, value: String(itemVal).trim() });
                }
              } else if (typeof item === "string") {
                res.push(...parseStr(item, defaultLabel));
              }
            }
            return res;
          }
          if (typeof raw === "string") return parseStr(raw, defaultLabel);
          return [];
        };

        let parsedEmails = unpackItems(person.emails, "work");
        if (parsedEmails.length === 0) parsedEmails = [{ label: "work", value: "" }];

        let parsedContacts = unpackItems(person.contact_numbers, "work");
        if (parsedContacts.length === 0) parsedContacts = [{ label: "work", value: "" }];

        let cleanTitle = person.job_title || "";
        if (cleanTitle.includes("{") || cleanTitle.includes("[") || cleanTitle.includes('"')) {
          cleanTitle = "";
        }

        setFormData({
          name: person.name || "",
          emails: parsedEmails as PersonEmailItem[],
          contact_numbers: parsedContacts as ContactItem[],
          organization_id: person.organization_id ? String(person.organization_id) : "",
          job_title: cleanTitle,
          user_id: person.user_id ? String(person.user_id) : "",
        });
        if (person.custom_attributes) {
          if (typeof person.custom_attributes === "object") {
            setCustomAttributes(person.custom_attributes);
          } else if (typeof person.custom_attributes === "string") {
            try {
              setCustomAttributes(JSON.parse(person.custom_attributes));
            } catch {
              setCustomAttributes({});
            }
          }
        }
      }
    } catch (e: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: e.response?.data?.message || "Failed to load person",
      });
      navigate("/contacts/persons");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, { label: "work", value: "" }],
    }));
  };

  const handleRemoveEmail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, idx) => idx !== index),
    }));
  };

  const handleEmailChange = (
    index: number,
    field: "label" | "value",
    val: string
  ) => {
    setFormData((prev) => {
      const updated = [...prev.emails];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, emails: updated };
    });
    if (errors.emails || errors.email) {
      setErrors((prev) => ({ ...prev, emails: "", email: "" }));
    }
  };

  const handleAddContact = () => {
    setFormData((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, { label: "work", value: "" }],
    }));
  };

  const handleRemoveContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.filter((_, idx) => idx !== index),
    }));
  };

  const handleContactChange = (
    index: number,
    field: "label" | "value",
    val: string
  ) => {
    let errorMsg = "";
    let cleanVal = val;
    if (field === "value") {
      if (/[a-zA-Z]/.test(val)) {
        errorMsg = "Text characters are not allowed. Mobile number must contain digits only.";
      } else if (val.includes("+") && !val.trim().startsWith("+")) {
        errorMsg = "Country code '+' is only allowed at the beginning of the mobile number.";
      } else if ((val.match(/\+/g) || []).length > 1) {
        errorMsg = "Only one '+' is allowed at the beginning of the mobile number.";
      }

      const startsWithPlus = val.trim().startsWith("+");
      const digitsAndSymbols = val.replace(/[^0-9\-\s()]/g, "");
      cleanVal = startsWithPlus ? "+" + digitsAndSymbols : digitsAndSymbols;

      const digitsOnly = cleanVal.replace(/[^0-9]/g, "");
      if (digitsOnly.length > 15) {
        errorMsg = "Mobile number cannot exceed 15 digits.";
      }
    }

    setFormData((prev) => {
      const updated = [...prev.contact_numbers];
      updated[index] = { ...updated[index], [field]: cleanVal };
      return { ...prev, contact_numbers: updated };
    });

    if (errorMsg) {
      setErrors((prev) => ({ ...prev, contact_numbers: errorMsg }));
    } else if (errors.contact_numbers || errors.phone) {
      setErrors((prev) => ({ ...prev, contact_numbers: "", phone: "" }));
    }
  };

  const checkDuplicateEmail = async (val: string) => {
    if (!val || !val.trim().includes("@")) return;
    try {
      const data = await usePersonStore.getState().checkDuplicate(val.trim(), undefined, id);
      if (data?.isDuplicate) {
        setErrors((prev) => ({ ...prev, emails: data.message }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkDuplicateContact = async (val: string) => {
    if (!val || val.trim() === "") return;
    const cleanVal = val.trim();
    const digitsOnly = cleanVal.replace(/[^0-9]/g, "");
    if (digitsOnly.length < 7) {
      setErrors((prev) => ({
        ...prev,
        contact_numbers: "Please enter a valid mobile number (at least 7 digits).",
      }));
      return;
    }
    if (digitsOnly.length > 15) {
      setErrors((prev) => ({
        ...prev,
        contact_numbers: "Mobile number cannot exceed 15 digits.",
      }));
      return;
    }
    try {
      const data = await usePersonStore.getState().checkDuplicate(undefined, cleanVal, id);
      if (data?.isDuplicate) {
        setErrors((prev) => ({ ...prev, contact_numbers: data.message }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payloadToValidate = {
      name: formData.name.trim(),
      emails: formData.emails,
      contact_numbers: formData.contact_numbers,
      organization_id: formData.organization_id ? Number(formData.organization_id) : null,
      job_title: formData.job_title.trim() || null,
      user_id: formData.user_id ? Number(formData.user_id) : null,
    };

    const validation = personSchema.safeParse(payloadToValidate);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] ? String(issue.path[0]) : "general";
        formattedErrors[fieldName] = issue.message;
      });
      setErrors(formattedErrors);
      return;
    }

    const payload = {
      ...payloadToValidate,
      emails: formData.emails.filter((e) => e.value.trim() !== ""),
      contact_numbers: formData.contact_numbers.filter((c) => c.value.trim() !== ""),
      custom_attributes: customAttributes,
    };

    try {
      setSaving(true);
      await usePersonStore.getState().savePerson(payload as any, id);
      await useTagStore.getState().saveEntityTags("person", id!, selectedTagIds);
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Person updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/contacts/persons");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update person";
      if (errMsg.toLowerCase().includes("email")) {
        setErrors((prev) => ({ ...prev, emails: errMsg }));
      } else if (errMsg.toLowerCase().includes("contact") || errMsg.toLowerCase().includes("phone")) {
        setErrors((prev) => ({ ...prev, contact_numbers: errMsg }));
      }
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0088cc] border-t-transparent"></div>
        <p className="mt-2 text-sm">Loading contact details...</p>
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
          Persons
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300 font-medium">Edit Person</span>
      </div>

      {/* 🏷️ Page Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/contacts/persons"
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 hover:text-[#0e90d9] flex items-center justify-center transition shadow-2xs shrink-0"
            title="Back to Persons"
          >
            <i className="mgc_arrow_left_line text-lg"></i>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                Edit Person
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-[#0088cc] dark:text-blue-400 font-mono text-xs font-bold border border-blue-100 dark:border-blue-800/60 shrink-0">
                #PR-{id}
              </span>
            </div>
            {formData.name ? (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {formData.name}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                Update person contact details and profile
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            to="/contacts/persons"
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
            <span>Update Person</span>
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <i className="mgc_user_3_line text-lg"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                General Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Basic contact identity and communication channels</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className={labelCls}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. John Doe"
                className={`${inputCls} ${errors.name ? "!border-red-500 !ring-red-500/20" : ""}`}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name}</p>
              )}
            </div>

            {/* Emails */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>
                  Email Addresses
                </label>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1"
                >
                  <i className="mgc_add_line text-sm"></i> Add Email
                </button>
              </div>
              <div className="space-y-2.5">
                {formData.emails.map((emailItem, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex flex-1 items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50/70 focus-within:bg-white focus-within:border-[#0088cc] focus-within:ring-2 focus-within:ring-[#0088cc]/20 dark:bg-gray-900/60 dark:focus-within:bg-gray-900 transition">
                      <select
                        value={emailItem.label}
                        onChange={(e) =>
                          handleEmailChange(index, "label", e.target.value as any)
                        }
                        className="w-24 sm:w-28 px-3 py-2.5 bg-gray-100/80 dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 focus:outline-none capitalize shrink-0"
                      >
                        <option value="work">Work</option>
                        <option value="home">Home</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="email"
                        value={emailItem.value}
                        onChange={(e) =>
                          handleEmailChange(index, "value", e.target.value)
                        }
                        onBlur={() => checkDuplicateEmail(emailItem.value)}
                        placeholder="john@example.com"
                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none font-medium"
                      />
                    </div>
                    {formData.emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0"
                        title="Remove email"
                      >
                        <i className="mgc_delete_line text-lg"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(errors.emails || errors.email) && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.emails || errors.email}</p>
              )}
            </div>

            {/* Contact Numbers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>
                  Phone / Mobile Numbers
                </label>
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1"
                >
                  <i className="mgc_add_line text-sm"></i> Add Number
                </button>
              </div>
              <div className="space-y-2.5">
                {formData.contact_numbers.map((contactItem, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex flex-1 items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50/70 focus-within:bg-white focus-within:border-[#0088cc] focus-within:ring-2 focus-within:ring-[#0088cc]/20 dark:bg-gray-900/60 dark:focus-within:bg-gray-900 transition">
                      <select
                        value={contactItem.label}
                        onChange={(e) =>
                          handleContactChange(
                            index,
                            "label",
                            e.target.value as any
                          )
                        }
                        className="w-24 sm:w-28 px-3 py-2.5 bg-gray-100/80 dark:bg-gray-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 focus:outline-none capitalize shrink-0"
                      >
                        <option value="work">Work</option>
                        <option value="mobile">Mobile</option>
                        <option value="home">Home</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="tel"
                        value={contactItem.value}
                        onChange={(e) =>
                          handleContactChange(index, "value", e.target.value)
                        }
                        onBlur={() => checkDuplicateContact(contactItem.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 min-w-0 px-3.5 py-2.5 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none font-medium"
                      />
                    </div>
                    {formData.contact_numbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(index)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0"
                        title="Remove contact"
                      >
                        <i className="mgc_delete_line text-lg"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(errors.contact_numbers || errors.phone) && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.contact_numbers || errors.phone}</p>
              )}
            </div>

            {/* Job Title & Organization Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1">
              <div>
                <label className={labelCls}>Job Title</label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) =>
                    setFormData({ ...formData, job_title: e.target.value })
                  }
                  placeholder="e.g. Sales Manager"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Organization</label>
                <select
                  value={formData.organization_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      organization_id: e.target.value,
                    })
                  }
                  className={inputCls}
                >
                  <option value="">-- None / Select Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sales Owner */}
            <div>
              <label className={labelCls}>Sales Owner</label>
              <select
                value={formData.user_id}
                onChange={(e) =>
                  setFormData({ ...formData, user_id: e.target.value })
                }
                className={inputCls}
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Tags</label>
              <TagPicker
                selectedTagIds={selectedTagIds}
                onChange={setSelectedTagIds}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Custom Attributes for Persons */}
        <DynamicAttributeFields
          entityType="persons"
          values={customAttributes}
          onChange={(code, val) => setCustomAttributes((prev) => ({ ...prev, [code]: val }))}
          containerClassName="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 sm:p-6 space-y-5"
        />
      </form>
    </div>
  );
};

export default EditPersonPage;
