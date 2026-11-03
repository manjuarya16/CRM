import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "../../components";

const EditOrganization = () => {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const id = paramId || window.location.pathname.split("/").filter(Boolean).pop();
  const [modalLoading, setModalLoading] = useState(false);

  // Form fields
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [ngoType, setNgoType] = useState("");
  const [ngoObjective, setNgoObjective] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [dateOfEstablishment, setDateOfEstablishment] = useState("");
  const [registeredUnderAct, setRegisteredUnderAct] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialMediaLinks, setSocialMediaLinks] = useState("");
  const [ceoName, setCeoName] = useState("");
  const [ceoContact, setCeoContact] = useState("");
  const [chairpersonName, setChairpersonName] = useState("");
  const [chairpersonContact, setChairpersonContact] = useState("");
  const [subscriptionStartDate, setSubscriptionStartDate] = useState("");
  const [subscriptionExpiryDate, setSubscriptionExpiryDate] = useState("");
  const [orgStatus, setOrgStatus] = useState<boolean>(true);
  const [computedStatus, setComputedStatus] = useState<string>("Active");

  // Address fields
  const [street, setStreet] = useState("");
  const [stateId, setStateId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [addressType, setAddressType] = useState("Registered Office");

  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"basic" | "address" | "legal" | "contact" | "leadership">("basic");
  
  // Load States on mount
  useEffect(() => {
    adminApi
      .get("/admin/states")
      .then((res) => {
        if (res.data && res.data.success) {
          setStates(res.data.data || []);
        }
      })
      .catch((err) => console.error("Error fetching states:", err));
  }, []);

  // Load Cities when stateId changes
  useEffect(() => {
    if (stateId) {
      setLoadingCities(true);
      adminApi
        .get(`/admin/cities?state_id=${stateId}`)
        .then((res) => {
          if (res.data && res.data.success) {
            setCities(res.data.data || []);
          }
        })
        .catch((err) => {
          console.error("Error fetching cities:", err);
          setCities([]);
        })
        .finally(() => setLoadingCities(false));
    } else {
      setCities([]);
    }
  }, [stateId]);

  // Helper to normalize dates
  const normalizeDate = (val: string | undefined | null): string => {
    if (!val) return "";
    try {
      const dateFormate = new Date(val);
      if (!isNaN(dateFormate.getTime()) && dateFormate.getFullYear() >= 1900) {
        const yyyy = dateFormate.getFullYear();
        const mm = String(dateFormate.getMonth() + 1).padStart(2, "0");
        const dd = String(dateFormate.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch (_) {}
    return String(val).split("T")[0];
  };

  const fetchDetails = async () => {
    setModalLoading(true);
    try {
      const response = await adminApi.get(`/admin/organizations/${id}`);
      if (response.data && response.data.success) {
        const org = response.data.data;
        setOrgName(org.name || "");
        setOrgSlug(org.slug || "");
        setOrgEmail(org.email || "");
        setOrgPhone(org.phone || "");
        setNgoType(org.ngo_type || org.ngoType || "");
        setNgoObjective(org.ngo_objective || org.purpose || "");
        setRegistrationNo(org.registration_no || "");
        setRegistrationDate(normalizeDate(org.registration_date));
        setDateOfEstablishment(normalizeDate(org.date_of_establishment));
        setRegisteredUnderAct(org.registered_under_act || "");
        setWebsiteUrl(org.website_url || org.website || "");
        setSocialMediaLinks(org.social_media_links || "");
        setCeoName(org.ceo_name || "");
        setCeoContact(org.ceo_contact || "");
        setChairpersonName(org.chairperson_name || "");
        setChairpersonContact(org.chairperson_contact || "");
        setSubscriptionStartDate(normalizeDate(org.subscription_start_date));
        setSubscriptionExpiryDate(normalizeDate(org.subscription_expiry_date));
        setOrgStatus(org.status !== false);
        setComputedStatus(org.computed_status || (org.status !== false ? "Active" : "Suspended"));

        // Address details
        setStreet(org.street || org.address || "");
        if (org.state_id) {
          setStateId(Number(org.state_id));
        }
        if (org.city_id) {
          setCityId(Number(org.city_id));
        }
        setPostalCode(org.postal_code || org.pincode || "");
        setCountry(org.country || "India");
        setAddressType(org.address_type || "Registered Office");
      }
    } catch (err: any) {
      console.error("Error fetching organization details:", err);
      setClientValidationError("Failed to load organization details.");
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleToggleStatus = async () => {
    const isCurrentlyActive = orgStatus !== false;
    const actionTitle = isCurrentlyActive ? "Suspend" : "Resume & Activate";

    const confirmResult = await Swal.fire({
      title: `${actionTitle} Organization?`,
      text: isCurrentlyActive
        ? `Are you sure you want to suspend "${orgName}"? Users will be temporarily locked out from logging in.`
        : `Are you sure you want to resume and activate "${orgName}"? Users will regain access.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionTitle}!`,
      cancelButtonText: "Cancel",
      confirmButtonColor: isCurrentlyActive ? "#ef4444" : "#10b981"
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const response = await adminApi.patch(`/admin/organizations/${id}/status`, {
        status: !isCurrentlyActive
      });

      if (response.data && response.data.success) {
        Swal.fire({
          title: `Organization ${isCurrentlyActive ? "Suspended" : "Activated"}!`,
          text: `Organization has been ${isCurrentlyActive ? "suspended" : "activated"} successfully.`,
          icon: "success",
          timer: 2000
        });
        fetchDetails();
      }
    } catch (err: any) {
      console.error("Error toggling organization status:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to update organization status.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientValidationError(null);

    // Basic validations
    if (!orgName) {
      setClientValidationError("Organization name is required.");
      setActiveTab("basic");
      return;
    }
    const nameRegex = /^[a-zA-Z0-9\s.,'&-]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!nameRegex.test(orgName.trim())) {
      setClientValidationError("Organization name contains invalid special characters.");
      setActiveTab("basic");
      return;
    }
    if (!ngoType) {
      setClientValidationError("Organization type is required.");
      setActiveTab("basic");
      return;
    }
    if (!registrationNo) {
      setClientValidationError("Registration number is required.");
      setActiveTab("legal");
      return;
    }

    if (orgSlug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(orgSlug)) {
        setClientValidationError("Slug format is invalid. Lowercase letters, numbers, and single hyphens only.");
        setActiveTab("basic");
        return;
      }
    }

    if (postalCode.trim() && !/^\d{6}$/.test(postalCode.trim())) {
      setClientValidationError("Please enter a valid 6-digit postal / PIN code.");
      setActiveTab("address");
      return;
    }

    if (orgEmail.trim() && !emailRegex.test(orgEmail.trim())) {
      setClientValidationError("Please enter a valid organization email address.");
      setActiveTab("contact");
      return;
    }

    if (orgPhone.trim() && !phoneRegex.test(orgPhone.trim())) {
      setClientValidationError("Organization phone must be exactly 10 digits.");
      setActiveTab("contact");
      return;
    }

    if (ceoContact.trim() && !phoneRegex.test(ceoContact.trim())) {
      setClientValidationError("CEO contact must be exactly 10 digits.");
      setActiveTab("leadership");
      return;
    }

    if (chairpersonContact.trim() && !phoneRegex.test(chairpersonContact.trim())) {
      setClientValidationError("Chairperson contact must be exactly 10 digits.");
      setActiveTab("leadership");
      return;
    }

    if (ceoName.trim() && !nameRegex.test(ceoName.trim())) {
      setClientValidationError("CEO name contains invalid special characters.");
      setActiveTab("leadership");
      return;
    }

    if (chairpersonName.trim() && !nameRegex.test(chairpersonName.trim())) {
      setClientValidationError("Chairperson name contains invalid special characters.");
      setActiveTab("leadership");
      return;
    }

    const payload = {
      name: orgName,
      slug: orgSlug,
      email: orgEmail,
      phone: orgPhone,
      ngo_type: ngoType,
      ngo_objective: ngoObjective,
      registration_no: registrationNo,
      registration_date: registrationDate || null,
      date_of_establishment: dateOfEstablishment || null,
      registered_under_act: registeredUnderAct,
      website_url: websiteUrl,
      social_media_links: socialMediaLinks,
      ceo_name: ceoName,
      ceo_contact: ceoContact,
      chairperson_name: chairpersonName,
      chairperson_contact: chairpersonContact,
      subscription_start_date: subscriptionStartDate || null,
      subscription_expiry_date: subscriptionExpiryDate || null,
      street: street.trim() || null,
      address: street.trim() || null,
      state_id: stateId || null,
      city_id: cityId || null,
      postal_code: postalCode.trim() || null,
      pincode: postalCode.trim() || null,
      country: country.trim() || "India",
      address_type: addressType.trim() || "Registered Office",
    };

    setModalLoading(true);
    try {
      const response = await adminApi.put(`/admin/organizations/${id}`, payload);
      if (response.data && response.data.success) {
        Swal.fire("Success", "Organization updated successfully!", "success");
        navigate(`${basePath}/organizations`);
      }
    } catch (err: any) {
      console.error("Error saving organization:", err);
      // Server validation suppressed - only client validation is shown
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <>
      
      {/* Organization Status Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-4 mb-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            <i className="mgc_building_2_line"></i>
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{orgName || "Organization Profile"}</span>
              {orgSlug && <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">{orgSlug}</span>}
            </h5>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              <span>Status:</span>
              <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-xs ${
                computedStatus === "Active"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : computedStatus === "Trial"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : computedStatus === "Suspended"
                  ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
              }`}>
                <i className={computedStatus === "Suspended" ? "mgc_close_circle_fill" : computedStatus === "Expired" ? "mgc_alarm_1_fill" : computedStatus === "Trial" ? "mgc_time_fill" : "mgc_check_circle_fill"}></i>
                {computedStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Suspend / Resume Button */}
        <div>
          <button
            type="button"
            className={`btn btn-sm text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs ${
              orgStatus !== false
                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-600"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-600"
            }`}
            onClick={handleToggleStatus}
            disabled={modalLoading}
          >
            {orgStatus !== false ? (
              <>
                <i className="mgc_pause_circle_line text-sm"></i> Suspend Organization
              </>
            ) : (
              <>
                <i className="mgc_play_circle_line text-sm"></i> Resume & Activate Organization
              </>
            )}
          </button>
        </div>
      </div>

      
      {clientValidationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300 p-4 rounded-xl text-sm mb-4 flex items-start gap-2">
          <i className="mgc_alert_line text-lg mt-0.5 shrink-0"></i>
          <span>{clientValidationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pb-6" noValidate>
        {/* ─── Horizontal Tabs Bar ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-1.5 flex flex-wrap sm:flex-nowrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "basic"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_building_2_line text-base"></i>
            <span>1. Basic Information</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "address"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_location_line text-base"></i>
            <span>2. Address & Location</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("legal")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "legal"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_certificate_line text-base"></i>
            <span>3. Legal Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "contact"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_phone_line text-base"></i>
            <span>4. Contact & Online</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leadership")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === "leadership"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_user_star_line text-base"></i>
            <span>5. Leadership & Validity</span>
          </button>
        </div>

        {/* ─── Tab 1: Basic Information & Objective ───────────────────────────── */}
        {activeTab === "basic" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <i className="mgc_building_2_line text-primary"></i> Organization Details
            </h6>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="Organization Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="lowercase-and-hyphens-only"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Company / Organization Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-select text-xs w-full"
                  value={ngoType}
                  onChange={(e) => setNgoType(e.target.value)}
                  required
                  disabled={modalLoading}
                >
                  <option value="">Select type</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="Section 8 Company">Section 8 Company</option>
                  <option value="LLP">LLP</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Trust / Society">Trust / Society</option>

                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Company Objective / Business Focus
              </label>
              <textarea
                className="form-input text-xs w-full leading-relaxed"
                rows={2}
                placeholder="Brief summary of company objectives, industry, and focus..."
                value={ngoObjective}
                onChange={(e) => setNgoObjective(e.target.value)}
                disabled={modalLoading}
              />
            </div>
          </div>
        )}

        {/* ─── Tab 2: Address & Location ──────────────────────────────────────── */}
        {activeTab === "address" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <i className="mgc_location_line text-primary"></i> Registered Office & Location Details
            </h6>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Street / Office Address
                </label>
                <textarea
                  className="form-input text-xs w-full leading-relaxed"
                  rows={2}
                  placeholder="Building name, street, locality, landmark..."
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  State
                </label>
                <select
                  className="form-input text-xs w-full"
                  value={stateId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setStateId(val);
                  }}
                  disabled={modalLoading}
                >
                  <option value="">Select State</option>
                  {states.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  City
                </label>
                <select
                  className="form-input text-xs w-full"
                  value={cityId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setCityId(val);
                  }}
                  disabled={modalLoading || !stateId || loadingCities}
                >
                  <option value="">{loadingCities ? "Loading cities..." : !stateId ? "Select state first" : "Select City"}</option>
                  {cities.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.city || c.city_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Postal / PIN Code
                </label>
                <input
                  type="text"
                  maxLength={10}
                  className="form-input text-xs w-full"
                  placeholder="e.g. 400001"
                  value={postalCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPostalCode(val);
                  }}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Address Type
                </label>
                <select
                  className="form-input text-xs w-full"
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  disabled={modalLoading}
                >
                  <option value="Registered Office">Registered Office</option>
                  <option value="Head Office">Head Office</option>
                  <option value="Branch Office">Branch Office</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab 3: Legal & Statutory Compliance ────────────────────────────── */}
        {activeTab === "legal" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <i className="mgc_certificate_line text-primary"></i> Legal & Statutory Details
            </h6>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="Enter registration number"
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  required
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Registered Under Act
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="e.g. Societies Registration Act 1860"
                  value={registeredUnderAct}
                  onChange={(e) => setRegisteredUnderAct(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  className="form-input text-xs w-full"
                  value={registrationDate}
                  onChange={(e) => setRegistrationDate(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Date of Establishment
                </label>
                <input
                  type="date"
                  className="form-input text-xs w-full"
                  value={dateOfEstablishment}
                  onChange={(e) => setDateOfEstablishment(e.target.value)}
                  disabled={modalLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab 3: Contact & Online Presence ───────────────────────────────── */}
        {activeTab === "contact" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
              <i className="mgc_mail_line text-primary"></i> Contact & Web Presence
            </h6>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-input text-xs w-full"
                  placeholder="org@example.com"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  maxLength={10}
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  className="form-input text-xs w-full"
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={modalLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Social Media Links
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="Facebook, Twitter, LinkedIn"
                  value={socialMediaLinks}
                  onChange={(e) => setSocialMediaLinks(e.target.value)}
                  disabled={modalLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab 4: Leadership & Subscription ───────────────────────────────── */}
        {activeTab === "leadership" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <i className="mgc_user_star_line text-primary"></i> Leadership & Key Persons
              </h6>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Director / CEO Name
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    placeholder="Enter name"
                    value={ceoName}
                    onChange={(e) => setCeoName(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Director / CEO Contact
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    maxLength={10}
                  placeholder="e.g. 9876543210 (10 digits)"
                    value={ceoContact}
                    onChange={(e) => setCeoContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    disabled={modalLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Chairperson Name
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    placeholder="Enter name"
                    value={chairpersonName}
                    onChange={(e) => setChairpersonName(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Chairperson Contact
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    maxLength={10}
                  placeholder="e.g. 9876543210 (10 digits)"
                    value={chairpersonContact}
                    onChange={(e) => setChairpersonContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    disabled={modalLoading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <i className="mgc_calendar_line text-primary"></i> SaaS Subscription Window
              </h6>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Subscription Start Date
                  </label>
                  <input
                    type="date"
                    className="form-input text-xs w-full"
                    value={subscriptionStartDate}
                    onChange={(e) => setSubscriptionStartDate(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Subscription Expiry Date
                  </label>
                  <input
                    type="date"
                    className="form-input text-xs w-full"
                    value={subscriptionExpiryDate}
                    onChange={(e) => setSubscriptionExpiryDate(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Compact Action Buttons Bar ────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab !== "basic" && (
                <button
                  type="button"
                  className="btn btn-sm text-xs border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-1"
                  onClick={() => {
                    if (activeTab === "leadership") setActiveTab("contact");
                    else if (activeTab === "contact") setActiveTab("legal");
                    else if (activeTab === "legal") setActiveTab("basic");
                  }}
                >
                  <i className="mgc_arrow_left_line"></i> Previous
                </button>
              )}
              {activeTab !== "leadership" && (
                <button
                  type="button"
                  className="btn btn-sm text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition flex items-center gap-1 font-semibold"
                  onClick={() => {
                    if (activeTab === "basic") setActiveTab("legal");
                    else if (activeTab === "legal") setActiveTab("contact");
                    else if (activeTab === "contact") setActiveTab("leadership");
                  }}
                >
                  Next <i className="mgc_arrow_right_line"></i>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                onClick={() => navigate(`${basePath}/organizations`)}
                disabled={modalLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                disabled={modalLoading}
              >
                {modalLoading && (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default EditOrganization;
