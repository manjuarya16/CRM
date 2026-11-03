import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import adminApi from "../../lib/adminApi";
import Swal from "sweetalert2";
import { PageBreadcrumb } from "../../components";

// Helper to dynamically load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CreateOrganization = () => {
  const basePath = typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin") ? "/super-admin" : "/admin";
  const navigate = useNavigate();
  const location = useLocation();

  const [modalLoading, setModalLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "admin" | "address" | "legal" | "contact">("basic");

  // Demo conversion state
  const [fromDemo, setFromDemo] = useState(false);
  const [demoData, setDemoData] = useState<any>(null);

  // Subscription Plan state
  const [selectedPlan, setSelectedPlan] = useState<string>("free_trial");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

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

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneRegex = /^[0-9]{10}$/;
  const nameRegex = /^[a-zA-Z0-9\s.,'&-]+$/;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
      setCityId("");
    }
  }, [stateId]);

  // Auto-fetch details if coming from Demo Request
  useEffect(() => {
    const demo = location.state?.demo;
    if (demo) {
      setFromDemo(true);
      setDemoData(demo);

      setOrgName(demo.organization_name || "");
      if (demo.trial_org_slug) {
        setOrgSlug(demo.trial_org_slug);
      } else if (demo.organization_name) {
        setOrgSlug(
          demo.organization_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
        );
      }
      setNgoType(demo.organization_type || "NGO");
      setOrgEmail(demo.email || "");
      setOrgPhone(demo.phone || "");
      setAdminName(demo.full_name || "");
      setAdminEmail(demo.email || "");
      setAdminPassword("Password@123");
      setRegistrationNo(`REG-${demo.id || Date.now().toString().slice(-6)}`);

      const today = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(today.getFullYear() + 1);
      setSubscriptionStartDate(today.toISOString().split("T")[0]);
      setSubscriptionExpiryDate(nextYear.toISOString().split("T")[0]);
    }
  }, [location.state]);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const autoGenerateSlug = () => {
    if (orgName.trim()) {
      const generated = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setOrgSlug(generated);
      clearFieldError("orgSlug");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Basic Info
    if (!orgName.trim()) {
      newErrors.orgName = "Organization name is required.";
    } else if (orgName.trim().length < 2) {
      newErrors.orgName = "Organization name must be at least 2 characters.";
    } else if (!nameRegex.test(orgName.trim())) {
      newErrors.orgName = "Organization name contains invalid special characters.";
    }

    if (orgSlug.trim()) {
      if (!slugRegex.test(orgSlug.trim())) {
        newErrors.orgSlug =
          "Slug must be lowercase letters, numbers, and single hyphens (e.g. green-earth).";
      } else if (orgSlug.trim().length > 100) {
        newErrors.orgSlug = "Slug cannot exceed 100 characters.";
      }
    }

    if (!ngoType) {
      newErrors.ngoType = "Organization type is required.";
    }

    // 2. Legal
    if (!registrationNo.trim()) {
      newErrors.registrationNo = "Registration number is required.";
    } else if (!/^[A-Za-z0-9-]+$/.test(registrationNo.trim())) {
      newErrors.registrationNo = "Registration number can only contain letters, digits, and hyphens (-).";
    }

    // 3. Contact
    if (orgEmail.trim() && !emailRegex.test(orgEmail.trim())) {
      newErrors.orgEmail = "Please enter a valid email address.";
    }

    if (orgPhone.trim() && !phoneRegex.test(orgPhone.trim())) {
      newErrors.orgPhone = "Organization phone must be exactly 10 digits.";
    }

    if (websiteUrl.trim()) {
      try {
        const urlToCheck = websiteUrl.startsWith("http://") || websiteUrl.startsWith("https://")
          ? websiteUrl
          : `https://${websiteUrl}`;
        new URL(urlToCheck);
      } catch (_) {
        newErrors.websiteUrl = "Please enter a valid website URL.";
      }
    }

    if (ceoName.trim() && !nameRegex.test(ceoName.trim())) {
      newErrors.ceoName = "CEO name contains invalid special characters.";
    }
    if (ceoContact.trim() && !phoneRegex.test(ceoContact.trim())) {
      newErrors.ceoContact = "Please enter a valid 10-digit phone number for CEO.";
    }

    if (chairpersonName.trim() && !nameRegex.test(chairpersonName.trim())) {
      newErrors.chairpersonName = "Chairperson name contains invalid special characters.";
    }
    if (chairpersonContact.trim() && !phoneRegex.test(chairpersonContact.trim())) {
      newErrors.chairpersonContact = "Please enter a valid 10-digit phone number for Chairperson.";
    }

    // 4. Address validation
    if (postalCode.trim() && !/^\d{6}$/.test(postalCode.trim())) {
      newErrors.postalCode = "Please enter a valid 6-digit postal / PIN code.";
    }

    // 5. Dates
    if (subscriptionStartDate && subscriptionExpiryDate) {
      if (new Date(subscriptionExpiryDate) < new Date(subscriptionStartDate)) {
        newErrors.subscriptionExpiryDate = "Expiry date cannot be earlier than start date.";
      }
    }

    // 6. Admin Info
    if (!adminName.trim()) {
      newErrors.adminName = "Admin user name is required.";
    } else if (adminName.trim().length < 2) {
      newErrors.adminName = "Admin name must be at least 2 characters.";
    } else if (!nameRegex.test(adminName.trim())) {
      newErrors.adminName = "Admin name contains invalid special characters.";
    }

    if (!adminEmail.trim()) {
      newErrors.adminEmail = "Admin user email is required.";
    } else if (!emailRegex.test(adminEmail.trim())) {
      newErrors.adminEmail = "Please enter a valid admin email address.";
    }

    if (!adminPassword) {
      newErrors.adminPassword = "Admin password is required.";
    } else if (adminPassword.length < 6) {
      newErrors.adminPassword = "Password must be at least 6 characters.";
    } else if (adminPassword.length > 50) {
      newErrors.adminPassword = "Password cannot exceed 50 characters.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.orgName || newErrors.orgSlug || newErrors.ngoType) {
        setActiveTab("basic");
      } else if (newErrors.adminName || newErrors.adminEmail || newErrors.adminPassword || newErrors.subscriptionExpiryDate) {
        setActiveTab("admin");
      } else if (newErrors.postalCode) {
        setActiveTab("address");
      } else if (newErrors.registrationNo) {
        setActiveTab("legal");
      } else if (newErrors.orgEmail || newErrors.orgPhone || newErrors.websiteUrl || newErrors.ceoContact || newErrors.chairpersonContact) {
        setActiveTab("contact");
      }
      return false;
    }
    return true;
  };

  /**
   * Submit Form Handler
   */
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
            return;
    }

    const isTrial = selectedPlan === "free_trial";

    const payload = {
      name: orgName.trim(),
      slug: orgSlug.trim() || undefined,
      email: orgEmail.trim() || adminEmail.trim() || null,
      phone: orgPhone.trim() || null,
      ngo_type: ngoType,
      ngo_objective: ngoObjective.trim() || null,
      registration_no: registrationNo.trim(),
      registration_date: registrationDate || null,
      date_of_establishment: dateOfEstablishment || null,
      registered_under_act: registeredUnderAct.trim() || null,
      website_url: websiteUrl.trim() || null,
      social_media_links: socialMediaLinks.trim() || null,
      ceo_name: ceoName.trim() || null,
      ceo_contact: ceoContact.trim() || null,
      chairperson_name: chairpersonName.trim() || null,
      chairperson_contact: chairpersonContact.trim() || null,
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
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      admin_password: adminPassword,
      plan_code: selectedPlan,
      is_trial: isTrial,
      demo_id: demoData?.id || null,
    };

    setModalLoading(true);
    try {
      const response = await adminApi.post("/admin/organizations", payload);
      if (response.data && response.data.success) {
        const { slug, subscription_expiry_date } = response.data.data;

        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : "";
        const host = window.location.hostname;
        let loginUrl = "";
        let paymentUrl = "";

        if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
          loginUrl = `${protocol}//${slug}.localhost${port}/auth/login`;
          paymentUrl = `${protocol}//${slug}.localhost${port}/subscription`;
        } else {
          const parts = host.split(".");
          const rootDomain = parts.length > 2 ? parts.slice(1).join(".") : host;
          loginUrl = `${protocol}//${slug}.${rootDomain}${port}/auth/login`;
          paymentUrl = `${protocol}//${slug}.${rootDomain}${port}/subscription`;
        }

        await Swal.fire({
          title: "Organization Provisioned! 🎉",
          html: `
            <div class="text-left text-sm space-y-2.5 mt-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-800 dark:text-slate-100">
              <div><strong>Organization:</strong> ${orgName}</div>
              <div><strong>Plan:</strong> <span class="badge bg-indigo-600 text-white text-xs px-2 py-0.5 rounded font-bold">${selectedPlan.toUpperCase()}</span></div>
              <div><strong>Admin Login Email:</strong> <span class="font-mono text-primary font-semibold">${adminEmail}</span></div>
              <div><strong>Initial Password:</strong> <span class="font-mono text-amber-600 font-bold">${adminPassword}</span></div>
              <div><strong>Expiry Date:</strong> <span class="text-rose-500 font-semibold">${subscription_expiry_date ? new Date(subscription_expiry_date).toLocaleDateString() : "N/A"}</span></div>
              <hr class="my-2 border-gray-200 dark:border-gray-700" />
              <div>
                <strong>Tenant Subdomain Login URL:</strong><br/>
                <a href="${loginUrl}" target="_blank" rel="noreferrer" class="text-primary font-bold underline break-all inline-block mt-0.5 text-xs">
                  ${loginUrl} <i class="mgc_external_link_line text-xs"></i>
                </a>
              </div>
              <div class="mt-2 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <strong class="text-xs text-indigo-900 dark:text-indigo-200">Organization Payment Link:</strong><br/>
                <div class="text-xs font-mono text-indigo-700 dark:text-indigo-300 break-all mt-0.5 select-all">
                  ${paymentUrl}
                </div>
              </div>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                ✉️ An automated email with login credentials and payment access has been dispatched to <strong>${adminEmail}</strong>.
              </p>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Go to Organizations",
          confirmButtonColor: "#4f46e5",
        });

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
      
      {/* Demo Conversion Alert Banner */}
      {fromDemo && demoData && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200 dark:border-indigo-800 p-4 rounded-2xl mb-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <i className="mgc_sparkles_2_line text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h6 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                  Subscribing Demo Request: {demoData.organization_name}
                </h6>
                <span className="badge bg-indigo-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                  Demo #{demoData.id}
                </span>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                Contact: <strong>{demoData.full_name}</strong> ({demoData.email}) • Preferred Scale: {demoData.user_count || "N/A"} users
              </p>
            </div>
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold italic hidden sm:block">
            Fields pre-filled automatically
          </div>
        </div>
      )}

      
      <form onSubmit={handleFormSubmit} className="space-y-4 pb-6" noValidate>
        {/* ─── Horizontal Tabs Bar ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-xs p-1.5 flex flex-wrap sm:flex-nowrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === "basic"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_building_2_line text-base"></i>
            <span>1. Basic Info</span>
            {(errors.orgName || errors.orgSlug || errors.ngoType) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === "admin"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_user_3_line text-base"></i>
            <span>2. Admin & Validity</span>
            {(errors.adminName || errors.adminEmail || errors.adminPassword || errors.subscriptionExpiryDate) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("address")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === "address"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_location_line text-base"></i>
            <span>3. Address & Location</span>
            {errors.postalCode && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("legal")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === "legal"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_certificate_line text-base"></i>
            <span>4. Legal Details</span>
            {errors.registrationNo && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contact")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
              activeTab === "contact"
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <i className="mgc_phone_line text-base"></i>
            <span>5. Contact & Leadership</span>
            {(errors.orgEmail || errors.orgPhone || errors.websiteUrl || errors.ceoContact || errors.chairpersonContact) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2"></span>
            )}
          </button>
        </div>

        {/* ─── Tab 1: Basic Information & Plan ────────────────────────────────── */}
        {activeTab === "basic" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input text-xs w-full ${errors.orgName ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. Green Earth Foundation"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      clearFieldError("orgName");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.orgName && <p className="text-xs text-red-500 mt-0.5">{errors.orgName}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Slug / Subdomain
                    </label>
                    {orgName && (
                      <button
                        type="button"
                        onClick={autoGenerateSlug}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Auto-generate
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`form-input text-xs w-full ${errors.orgSlug ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. green-earth"
                    value={orgSlug}
                    onChange={(e) => {
                      setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      clearFieldError("orgSlug");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.orgSlug && <p className="text-xs text-red-500 mt-0.5">{errors.orgSlug}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Company / Organization Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`form-select text-xs w-full ${errors.ngoType ? "border-red-500 focus:ring-red-500" : ""}`}
                    value={ngoType}
                    onChange={(e) => {
                      setNgoType(e.target.value);
                      clearFieldError("ngoType");
                    }}
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
                  {errors.ngoType && <p className="text-xs text-red-500 mt-0.5">{errors.ngoType}</p>}
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
          </div>
        )}

        {/* ─── Tab 2: Admin Account Setup & Validity ──────────────────────────── */}
        {activeTab === "admin" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <i className="mgc_user_3_line text-primary"></i> Primary Administrator Credentials
              </h6>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Admin Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input text-xs w-full ${errors.adminName ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. John Doe"
                    value={adminName}
                    onChange={(e) => {
                      setAdminName(e.target.value);
                      clearFieldError("adminName");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.adminName && <p className="text-xs text-red-500 mt-0.5">{errors.adminName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Admin Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={`form-input text-xs w-full ${errors.adminEmail ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="admin@example.org"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      clearFieldError("adminEmail");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.adminEmail && <p className="text-xs text-red-500 mt-0.5">{errors.adminEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Admin Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`form-input text-xs w-full !pr-10 ${errors.adminPassword ? "border-red-500 focus:ring-red-500" : ""}`}
                      placeholder="Min 6 characters"
                      maxLength={50}
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        clearFieldError("adminPassword");
                      }}
                      disabled={modalLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`${showPassword ? "mgc_eye_close_line" : "mgc_eye_line"} text-base`}></i>
                    </button>
                  </div>
                  {errors.adminPassword && <p className="text-xs text-red-500 mt-0.5">{errors.adminPassword}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <i className="mgc_calendar_line text-primary"></i> Subscription Window & Presets
                </h6>
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { label: "7D Trial", days: 7 },
                    { label: "10D Trial", days: 10 },
                    { label: "14D Trial", days: 14 },
                    { label: "30D Trial", days: 30 },
                    { label: "1Y Active", days: 365 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="text-[11px] bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-md px-2 py-0.5 font-semibold hover:bg-amber-100"
                      onClick={() => {
                        const start = new Date();
                        const exp = new Date();
                        exp.setDate(exp.getDate() + p.days);
                        setSubscriptionStartDate(start.toISOString().split("T")[0]);
                        setSubscriptionExpiryDate(exp.toISOString().split("T")[0]);
                      }}
                    >
                      ⚡ {p.label}
                    </button>
                  ))}
                </div>
              </div>

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

        {/* ─── Tab 3: Address & Location Details ──────────────────────────────── */}
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
                  className={`form-input text-xs w-full ${errors.postalCode ? "border-red-500 focus:ring-red-500" : ""}`}
                  placeholder="e.g. 400001"
                  value={postalCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPostalCode(val);
                    clearFieldError("postalCode");
                  }}
                  disabled={modalLoading}
                />
                {errors.postalCode && <p className="text-xs text-red-500 mt-0.5">{errors.postalCode}</p>}
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

        {/* ─── Tab 4: Legal & Statutory Compliance ────────────────────────────── */}
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
                  className={`form-input text-xs w-full ${errors.registrationNo ? "border-red-500 focus:ring-red-500" : ""}`}
                  placeholder="e.g. REG-2024-8891"
                  value={registrationNo}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
                    setRegistrationNo(cleanVal);
                    clearFieldError("registrationNo");
                  }}
                  disabled={modalLoading}
                />
                {errors.registrationNo && <p className="text-xs text-red-500 mt-0.5">{errors.registrationNo}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  Registered Under Act
                </label>
                <input
                  type="text"
                  className="form-input text-xs w-full"
                  placeholder="e.g. Societies Act"
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

        {/* ─── Tab 4: Contact & Leadership ───────────────────────────────────── */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <i className="mgc_mail_line text-primary"></i> Contact & Online Presence
              </h6>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Organization Email
                  </label>
                  <input
                    type="email"
                    className={`form-input text-xs w-full ${errors.orgEmail ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="contact@example.org"
                    value={orgEmail}
                    onChange={(e) => {
                      setOrgEmail(e.target.value);
                      clearFieldError("orgEmail");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.orgEmail && <p className="text-xs text-red-500 mt-0.5">{errors.orgEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Organization Phone
                  </label>
                  <input
                    type="tel"
                    className={`form-input text-xs w-full ${errors.orgPhone ? "border-red-500 focus:ring-red-500" : ""}`}
                    maxLength={10}
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={orgPhone}
                    onChange={(e) => {
                      setOrgPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      clearFieldError("orgPhone");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.orgPhone && <p className="text-xs text-red-500 mt-0.5">{errors.orgPhone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    className={`form-input text-xs w-full ${errors.websiteUrl ? "border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="https://example.org"
                    value={websiteUrl}
                    onChange={(e) => {
                      setWebsiteUrl(e.target.value);
                      clearFieldError("websiteUrl");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.websiteUrl && <p className="text-xs text-red-500 mt-0.5">{errors.websiteUrl}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Social Media Links
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    placeholder="LinkedIn, FB, Twitter"
                    value={socialMediaLinks}
                    onChange={(e) => setSocialMediaLinks(e.target.value)}
                    disabled={modalLoading}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h6 className="font-bold text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5 pb-2 border-b border-gray-100 dark:border-gray-700">
                <i className="mgc_user_star_line text-primary"></i> Key Leadership & Governance
              </h6>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Director / CEO Name
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    placeholder="e.g. Jane Smith"
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
                    type="tel"
                    className={`form-input text-xs w-full ${errors.ceoContact ? "border-red-500 focus:ring-red-500" : ""}`}
                    maxLength={10}
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={ceoContact}
                    onChange={(e) => {
                      setCeoContact(e.target.value.replace(/\D/g, "").slice(0, 10));
                      clearFieldError("ceoContact");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.ceoContact && <p className="text-xs text-red-500 mt-0.5">{errors.ceoContact}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Chairperson Name
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs w-full"
                    placeholder="e.g. Dr. Robert Brown"
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
                    type="tel"
                    className={`form-input text-xs w-full ${errors.chairpersonContact ? "border-red-500 focus:ring-red-500" : ""}`}
                    maxLength={10}
                    placeholder="e.g. 9876543210 (10 digits)"
                    value={chairpersonContact}
                    onChange={(e) => {
                      setChairpersonContact(e.target.value.replace(/\D/g, "").slice(0, 10));
                      clearFieldError("chairpersonContact");
                    }}
                    disabled={modalLoading}
                  />
                  {errors.chairpersonContact && <p className="text-xs text-red-500 mt-0.5">{errors.chairpersonContact}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Compact Persistent Action Bar ──────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {activeTab !== "basic" && (
                <button
                  type="button"
                  className="btn btn-sm text-xs border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-1"
                  onClick={() => {
                    if (activeTab === "contact") setActiveTab("legal");
                    else if (activeTab === "legal") setActiveTab("admin");
                    else if (activeTab === "admin") setActiveTab("basic");
                  }}
                >
                  <i className="mgc_arrow_left_line"></i> Previous
                </button>
              )}
              {activeTab !== "contact" && (
                <button
                  type="button"
                  className="btn btn-sm text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition flex items-center gap-1 font-semibold"
                  onClick={() => {
                    if (activeTab === "basic") setActiveTab("admin");
                    else if (activeTab === "admin") setActiveTab("legal");
                    else if (activeTab === "legal") setActiveTab("contact");
                  }}
                >
                  Next <i className="mgc_arrow_right_line"></i>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
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
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-primary hover:bg-primary-600 transition shadow-xs flex items-center gap-1.5 disabled:opacity-60 font-bold"
                disabled={modalLoading}
              >
                {modalLoading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <i className="mgc_check_line text-sm"></i>
                )}
                <span>Create & Provision Organization</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default CreateOrganization;


