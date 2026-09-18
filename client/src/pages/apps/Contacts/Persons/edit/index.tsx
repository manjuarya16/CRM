import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "@/config";
import Swal from "sweetalert2";

import { EmailItem, ContactItem, PersonFormData } from "@/interface";

const EditPersonPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    name: string;
    emails: EmailItem[];
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
      const [orgsRes, usersRes, personRes] = await Promise.all([
        API.get("/organization").catch(() => ({ data: { data: [] } })),
        API.get("/user/").catch(() => ({ data: { data: { rows: [] } } })),
        API.get(`/persons/${id}`),
      ]);

      setOrganizations(orgsRes.data?.data || []);
      const userRows = usersRes.data?.data?.rows || usersRes.data?.data || [];
      setUsers(userRows);

      const person = personRes.data?.data;
      if (person) {
        let parsedEmails: EmailItem[] = [];
        if (Array.isArray(person.emails)) {
          parsedEmails = person.emails;
        } else if (typeof person.emails === "string") {
          try {
            parsedEmails = JSON.parse(person.emails);
          } catch {
            parsedEmails = [{ label: "work", value: person.emails }];
          }
        }
        if (parsedEmails.length === 0) parsedEmails = [{ label: "work", value: "" }];

        let parsedContacts: ContactItem[] = [];
        if (Array.isArray(person.contact_numbers)) {
          parsedContacts = person.contact_numbers;
        } else if (typeof person.contact_numbers === "string") {
          try {
            parsedContacts = JSON.parse(person.contact_numbers);
          } catch {
            parsedContacts = [{ label: "work", value: person.contact_numbers }];
          }
        }
        if (parsedContacts.length === 0) parsedContacts = [{ label: "work", value: "" }];

        setFormData({
          name: person.name || "",
          emails: parsedEmails,
          contact_numbers: parsedContacts,
          organization_id: person.organization_id ? String(person.organization_id) : "",
          job_title: person.job_title || "",
          user_id: person.user_id ? String(person.user_id) : "",
        });
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
    setFormData((prev) => {
      const updated = [...prev.contact_numbers];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, contact_numbers: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Person name is required",
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      emails: formData.emails.filter((e) => e.value.trim() !== ""),
      contact_numbers: formData.contact_numbers.filter((c) => c.value.trim() !== ""),
      organization_id: formData.organization_id ? Number(formData.organization_id) : null,
      job_title: formData.job_title.trim() || null,
      user_id: formData.user_id ? Number(formData.user_id) : null,
    };

    try {
      setSaving(true);
      await API.put(`/persons/${id}`, payload);
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Person updated successfully",
        timer: 1500,
        showConfirmButton: false,
      });
      navigate("/contacts/persons");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to update person",
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

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumb & Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/contacts/persons" className="hover:text-[#0088cc]">
              Contacts
            </Link>
            <span>/</span>
            <Link to="/contacts/persons" className="hover:text-[#0088cc]">
              Persons
            </Link>
            <span>/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              Edit Person
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
            Edit Person: {formData.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/contacts/persons"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Update Person
          </button>
        </div>
      </div>

      {/* Main Form Box */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-3">
            General Information
          </h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
            />
          </div>

          {/* Emails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Emails
              </label>
              <button
                type="button"
                onClick={handleAddEmail}
                className="text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1"
              >
                <i className="mgc_add_line text-sm"></i> Add Email
              </button>
            </div>
            <div className="space-y-3">
              {formData.emails.map((emailItem, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={emailItem.label}
                    onChange={(e) =>
                      handleEmailChange(index, "label", e.target.value as any)
                    }
                    className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm capitalize focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
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
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
                  />
                  {formData.emails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <i className="mgc_delete_line text-lg"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Numbers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Contact Numbers
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                className="text-xs font-semibold text-[#0088cc] hover:underline flex items-center gap-1"
              >
                <i className="mgc_add_line text-sm"></i> Add Number
              </button>
            </div>
            <div className="space-y-3">
              {formData.contact_numbers.map((contactItem, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={contactItem.label}
                    onChange={(e) =>
                      handleContactChange(
                        index,
                        "label",
                        e.target.value as any
                      )
                    }
                    className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm capitalize focus:outline-none focus:ring-1 focus:ring-[#0088cc]"
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
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
                  />
                  {formData.contact_numbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <i className="mgc_delete_line text-lg"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Job Title & Organization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) =>
                  setFormData({ ...formData, job_title: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Organization
              </label>
              <select
                value={formData.organization_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    organization_id: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
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
          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Sales Owner
            </label>
            <select
              value={formData.user_id}
              onChange={(e) =>
                setFormData({ ...formData, user_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30 focus:border-[#0088cc]"
            >
              <option value="">-- Unassigned --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/contacts/persons"
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white text-sm font-semibold rounded-lg shadow transition-colors disabled:opacity-50"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            )}
            Update Person
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPersonPage;
