import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import API from "../../config";
import Swal from "sweetalert2";
import { buildTenantUrl } from "@/utils/subdomain";

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

const DEFAULT_CRM_PLANS = [
  {
    id: 1,
    code: "starter",
    name: "Starter",
    category: "STARTER",
    tagline: "A clear workspace for a focused sales team.",
    price_inr: 9999,
    price_usd: 149,
    billing_period: "per year",
    description: "A clear workspace for a focused sales team.",
    trial_days: 14,
    is_popular: false,
    features: [
      "Leads and pipeline",
      "Persons and organizations",
      "Activities and tasks",
      "Up to 3 teammates"
    ]
  },
  {
    id: 2,
    code: "growth",
    name: "Growth",
    category: "GROWTH",
    tagline: "For teams ready to standardize customer work.",
    price_inr: 19999,
    price_usd: 299,
    billing_period: "per year",
    description: "For teams ready to standardize customer work.",
    trial_days: 14,
    is_popular: true,
    features: [
      "Everything in Starter",
      "Automation workflows",
      "Custom attributes",
      "Reporting and visibility"
    ]
  },
  {
    id: 3,
    code: "business",
    name: "Business",
    category: "BUSINESS",
    tagline: "For service-heavy sales teams with more complexity.",
    price_inr: 29999,
    price_usd: 449,
    billing_period: "per year",
    description: "For service-heavy sales teams with more complexity.",
    trial_days: 14,
    is_popular: false,
    features: [
      "Everything in Growth",
      "Advanced integrations",
      "Quoted products and warehouses",
      "Prioritized onboarding"
    ]
  }
];

const PublicPayment: React.FC = () => {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [slug, setSlug] = useState<string>("");
  const [manualSlug, setManualSlug] = useState<string>("");
  const [orgData, setOrgData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>(DEFAULT_CRM_PLANS);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [activePaymentTab, setActivePaymentTab] = useState<"online" | "offline">("online");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    percentage?: number;
    flatAmount?: number;
  } | null>(null);
  const [cashModalPlan, setCashModalPlan] = useState<any | null>(null);
  const [cashForm, setCashForm] = useState({
    payerName: "",
    payerPhone: "",
    payerEmail: "",
    reference: "",
    notes: "",
  });
  const [submittingCash, setSubmittingCash] = useState(false);


  // Sync default custom enterprise amount when currency toggles
  const handleCurrencyChange = (newCurr: "INR" | "USD") => {
    if (newCurr !== currency) {
      setCurrency(newCurr);
    }
  };

  // Extract subdomain helper
  const getSubdomain = () => {
    if (typeof window === "undefined") return "";
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    if (parts.length <= 1 || (parts.length === 2 && parts[1] === "localhost")) {
      if (parts.length === 2 && parts[1] === "localhost") {
        return parts[0];
      }
      return "";
    }
    return parts[0];
  };

  const currentSlug = routeSlug || searchParams.get("slug") || searchParams.get("org") || searchParams.get("id") || getSubdomain() || "arya-group";

  const fetchPaymentDetails = async (targetSlug: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const url = targetSlug
        ? `/subscription/public-info?slug=${encodeURIComponent(targetSlug)}`
        : "/subscription/public-info";

      const res = await API.get(url);
      if (res.data && res.data.success) {
        const org = res.data.data.organization || res.data.data.tenant;
        setOrgData(org);
        const fetched = res.data.data.plans;
        if (Array.isArray(fetched) && fetched.length > 0 && !fetched.some((p: any) => p.description?.includes("NGO"))) {
          setPlans(fetched);
        } else {
          setPlans(DEFAULT_CRM_PLANS);
        }
        if (targetSlug && !org) {
          setErrorMsg(`No organization found matching subdomain: "${targetSlug}"`);
        }
      } else {
        setPlans(DEFAULT_CRM_PLANS);
        setErrorMsg(res.data?.message || "Failed to load payment details");
      }
    } catch (err: any) {
      console.error("Error fetching public payment info:", err);
      setErrorMsg("Failed to connect to payment server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSlug(currentSlug);
    setManualSlug(currentSlug);
    fetchPaymentDetails(currentSlug);
  }, [currentSlug]);


  const getPlanPricing = (plan: any) => {
    const basePrice = currency === "USD" ? Number(plan.price_usd) : Number(plan.price_inr);
    if (!appliedCoupon) {
      return {
        originalPrice: basePrice,
        discountAmount: 0,
        finalPrice: basePrice,
        hasDiscount: false,
      };
    }
    let discountAmount = 0;
    if (appliedCoupon.flatAmount) {
      discountAmount = currency === "USD" ? 50 : appliedCoupon.flatAmount;
    } else if (appliedCoupon.percentage) {
      discountAmount = Math.round((basePrice * (appliedCoupon.percentage / 100)) * 100) / 100;
    }
    const minFloor = currency === "USD" ? 1 : 10;
    discountAmount = Math.min(basePrice - minFloor, Math.max(0, discountAmount));
    const finalPrice = Math.max(minFloor, Math.round((basePrice - discountAmount) * 100) / 100);
    return {
      originalPrice: basePrice,
      discountAmount,
      finalPrice,
      hasDiscount: discountAmount > 0,
    };
  };

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;
    if (code === "WELCOME10") {
      setAppliedCoupon({ code, percentage: 10 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Coupon WELCOME10 applied (10% OFF)!", showConfirmButton: false, timer: 2500 });
    } else if (code === "SAVE20") {
      setAppliedCoupon({ code, percentage: 20 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Coupon SAVE20 applied (20% OFF)!", showConfirmButton: false, timer: 2500 });
    } else if (code === "FESTIVE15") {
      setAppliedCoupon({ code, percentage: 15 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Coupon FESTIVE15 applied (15% OFF)!", showConfirmButton: false, timer: 2500 });
    } else if (code === "SPECIAL50" || code === "PROMO50") {
      setAppliedCoupon({ code, percentage: 50 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Coupon " + code + " applied (50% OFF)!", showConfirmButton: false, timer: 2500 });
    } else if (code === "FLAT5000") {
      setAppliedCoupon({ code, flatAmount: 5000 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Coupon FLAT5000 applied (Flat ₹5,000 / $50 OFF)!", showConfirmButton: false, timer: 2500 });
    } else if (code.startsWith("DISC") && !isNaN(Number(code.replace("DISC", "")))) {
      const pct = Math.min(90, Math.max(1, Number(code.replace("DISC", ""))));
      setAppliedCoupon({ code, percentage: pct });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: `Coupon ${code} applied (${pct}% OFF)!`, showConfirmButton: false, timer: 2500 });
    } else {
      setAppliedCoupon({ code, percentage: 10 });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: `Coupon ${code} applied (10% OFF)!`, showConfirmButton: false, timer: 2500 });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleOpenCashModal = (plan: any) => {
    const effectiveSlug = orgData?.slug || slug;
    if (!effectiveSlug) {
      Swal.fire("Organization Required", "Please specify your organization subdomain to proceed.", "warning");
      return;
    }
    setCashModalPlan(plan);
    setCashForm({
      payerName: orgData?.name || "",
      payerPhone: orgData?.phone || "",
      payerEmail: orgData?.email || "",
      reference: `CASH-${Date.now().toString().slice(-6)}`,
      notes: "Cash payment for annual subscription renewal",
    });
  };

  const handleSubmitCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashModalPlan) return;
    const effectiveSlug = orgData?.slug || slug;
    const pricing = getPlanPricing(cashModalPlan);
    setSubmittingCash(true);
    try {
      const res = await API.post("/subscription/public-cash-payment", {
        slug: effectiveSlug,
        plan_code: cashModalPlan.code,
        currency,
        discount_code: appliedCoupon?.code,
        discount_amount: pricing.discountAmount,
        payer_name: cashForm.payerName,
        payer_phone: cashForm.payerPhone,
        payer_email: cashForm.payerEmail,
        reference: cashForm.reference,
        notes: cashForm.notes,
      });

      if (res.data && res.data.success) {
        setCashModalPlan(null);
        const data = res.data.data;
        const loginUrl = getLoginUrl(effectiveSlug);
        Swal.fire({
          title: "Cash Payment Recorded! 🎉",
          html: `
            <div class="text-left text-xs space-y-2 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
              <div class="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-700">
                <span class="font-bold text-sm">Invoice #: ${data.invoice_number}</span>
                <span class="bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold px-2 py-0.5 rounded text-[11px]">Paid (Cash)</span>
              </div>
              <p><strong>Organization:</strong> ${orgData?.name || effectiveSlug}</p>
              <p><strong>Activated Plan:</strong> ${data.plan_name} Plan</p>
              <p><strong>Amount Paid:</strong> ${currency === "USD" ? "$" : "₹"}${Number(data.amount).toLocaleString()}</p>
              ${data.discount_amount > 0 ? `<p class="text-emerald-700 dark:text-emerald-300"><strong>Discount Applied:</strong> -${currency === "USD" ? "$" : "₹"}${Number(data.discount_amount).toLocaleString()} (${data.discount_code})</p>` : ""}
              <p><strong>Receipt / Ref:</strong> ${cashForm.reference}</p>
              <p><strong>Subscription Expiry:</strong> ${new Date(data.subscription_expiry_date).toLocaleDateString()}</p>
              <div class="pt-3 border-t border-emerald-200 dark:border-emerald-800">
                <a href="${loginUrl}" class="inline-block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-center transition">
                  Go to CRM Workspace →
                </a>
              </div>
            </div>
          `,
          icon: "success",
          confirmButtonText: "Done",
          confirmButtonColor: "#10b981",
        });
        fetchPaymentDetails(effectiveSlug);
      } else {
        throw new Error(res.data?.message || "Failed to record cash payment");
      }
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || err.message || "Failed to record cash payment", "error");
    } finally {
      setSubmittingCash(false);
    }
  };

  const handleInitiatePayment = (plan: any) => {
    handlePayNow(plan);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSlug.trim()) {
      setSlug(manualSlug.trim());
      fetchPaymentDetails(manualSlug.trim());
    }
  };

  const getLoginUrl = (orgSlug: string) => {
    return buildTenantUrl(orgSlug, "/auth/login");
  };

  const handlePayNow = async (plan: any, customAmt?: number) => {
    const effectiveSlug = orgData?.slug || slug;
    if (!effectiveSlug) {
      Swal.fire("Organization Required", "Please specify your organization subdomain to proceed.", "warning");
      return;
    }

    const currentPlanObj = plans.find((p) => p.code === orgData?.plan_code);
    const isOrgActivePaid =
      orgData &&
      (orgData.computed_status === "Active" ||
        (orgData.subscription_expiry_date && new Date(orgData.subscription_expiry_date) > new Date())) &&
      !orgData.is_trial &&
      orgData.plan_code !== "free_trial" &&
      orgData.plan_code !== "trial" &&
      orgData.computed_status !== "Trial";

    const currentPlanPrice = currentPlanObj
      ? currency === "USD"
        ? Number(currentPlanObj.price_usd)
        : Number(currentPlanObj.price_inr)
      : 0;

    const planPrice = currency === "USD" ? Number(plan.price_usd) : Number(plan.price_inr);
    const isCurrent = orgData?.plan_code === plan.code;

    // Disallow downgrades
    if (isOrgActivePaid && !isCurrent && planPrice < currentPlanPrice) {
      Swal.fire({
        title: "Upgrade Only",
        text: `Your organization currently has an active ${orgData?.plan_name || "higher"} plan. Downgrading to a lower plan is not allowed during an active subscription.`,
        icon: "warning",
        confirmButtonColor: "#040975",
      });
      return;
    }

    setProcessingPlan(plan.code);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      Swal.fire("Error", "Failed to load Razorpay payment gateway. Please check your internet connection.", "error");
      setProcessingPlan(null);
      return;
    }

    try {
      const pricing = getPlanPricing(plan);
      // 1. Create Public Razorpay order
      const orderRes = await API.post("/subscription/public-create-order", {
        slug: effectiveSlug,
        plan_code: plan.code,
        currency,
        discount_code: appliedCoupon?.code,
        discount_amount: pricing.discountAmount,
      });

      if (!orderRes.data || !orderRes.data.success) {
        throw new Error(orderRes.data?.message || "Failed to create payment order");
      }

      const {
        order_id,
        amount,
        key_id,
        is_upgrade,
        upgrade_amount,
        total_valuation,
        current_plan_price,
        original_amount,
        current_plan_name,
      } = orderRes.data.data;

      const formattedPayAmount = currency === "USD" 
        ? `$${upgrade_amount || Number(plan.price_usd)}` 
        : `₹${Number(upgrade_amount || plan.price_inr).toLocaleString()}`;

      // Handle Mock / Sandbox mode fallback
      if (!key_id || key_id === "rzp_test_placeholder" || order_id.startsWith("order_mock_")) {
        const mockConfirm = await Swal.fire({
          title: is_upgrade ? "Confirm Plan Upgrade" : "Razorpay Sandbox / Direct Pay",
          html: `
            <div class="text-left text-xs space-y-2.5 text-slate-700 dark:text-slate-200">
              <p>Organization: <strong class="text-primary">${orgData?.name || effectiveSlug}</strong></p>
              ${
                is_upgrade
                  ? `
                <div class="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                  <div class="flex justify-between font-semibold text-slate-700 dark:text-slate-200">
                    <span>${plan.name} Standard:</span>
                    <span>${currency === "USD" ? `$${original_amount}` : `₹${Number(original_amount).toLocaleString()}`}</span>
                  </div>
                  <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>${current_plan_name || orgData?.plan_name || "Current Plan"} Credit:</span>
                    <span>-${currency === "USD" ? `$${original_amount - upgrade_amount}` : `₹${Number(original_amount - upgrade_amount).toLocaleString()}`}</span>
                  </div>
                  <div class="flex justify-between font-bold text-sm text-primary pt-1 border-t border-indigo-200 dark:border-indigo-700">
                    <span>Payable Today:</span>
                    <span class="text-emerald-600 dark:text-emerald-400">${formattedPayAmount}</span>
                  </div>
                </div>
                <p class="text-[11px] text-gray-500">
                  ✨ Your active subscription period (valid until <strong>${orgData?.subscription_expiry_date ? new Date(orgData.subscription_expiry_date).toLocaleDateString() : 'N/A'}</strong>) will be upgraded to <strong>${plan.name}</strong> immediately.
                </p>
              `
                  : `
                <p class="font-semibold text-emerald-600 dark:text-emerald-400">
                  Confirm payment of <strong>${formattedPayAmount}</strong> for <strong>${plan.name} Plan (1 Year)</strong>?
                </p>
              `
              }
            </div>
          `,
          icon: is_upgrade ? "question" : "info",
          showCancelButton: true,
          confirmButtonText: is_upgrade ? `Pay ${formattedPayAmount} & Upgrade` : "Simulate Payment & Activate",
          confirmButtonColor: "#10b981",
          cancelButtonText: "Cancel",
        });

        if (mockConfirm.isConfirmed) {
          Swal.fire({
            title: is_upgrade ? "Upgrading Plan..." : "Activating Subscription...",
            text: is_upgrade ? "Applying plan upgrade..." : "Processing payment and extending validity...",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const verifyRes = await API.post("/subscription/public-verify-payment", {
            slug: effectiveSlug,
            plan_code: plan.code,
            currency,
            discount_code: appliedCoupon?.code,
            discount_amount: pricing.discountAmount,
            razorpay_order_id: order_id,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: "mock_signature_public_payment",
          });

          if (verifyRes.data && verifyRes.data.success) {
            const loginUrl = getLoginUrl(effectiveSlug);
            Swal.fire({
              title: is_upgrade ? "Plan Upgraded! 🎉" : "Payment Successful! 🎉",
              html: `
                <div class="text-left text-xs space-y-2.5 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                  <p><strong>Organization:</strong> ${orgData?.name || effectiveSlug}</p>
                  <p><strong>Active Plan:</strong> ${plan.name} Plan</p>
                  <p><strong>Validity Expiry:</strong> ${new Date(verifyRes.data.data.subscription_expiry_date).toLocaleDateString()}</p>
                  <div class="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                    <p class="font-semibold mb-1">Your organization space is now fully upgraded!</p>
                    <a href="${loginUrl}" class="inline-block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-center transition">
                      Go to Organization Login →
                    </a>
                  </div>
                </div>
              `,
              icon: "success",
              confirmButtonText: "Done",
              confirmButtonColor: "#10b981",
            });
            fetchPaymentDetails(effectiveSlug);
          } else {
            throw new Error(verifyRes.data?.message || "Failed to verify payment");
          }
        }
        setProcessingPlan(null);
        return;
      }

      // Live Razorpay options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency.toUpperCase(),
        name: "MORSE CRM",
        description: is_upgrade
          ? `Upgrade to ${plan.name} Plan - ${orgData?.name || effectiveSlug}`
          : `${plan.name} Subscription Renewal - ${orgData?.name || effectiveSlug}`,
        image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
        order_id: order_id,
        prefill: {
          ...(orgData?.name ? { name: orgData.name } : {}),
          ...(orgData?.email ? { email: orgData.email } : {}),
          ...(orgData?.phone && String(orgData.phone).trim().length >= 10 ? { contact: String(orgData.phone).trim() } : {}),
        },
        handler: async function (response: any) {
          try {
            Swal.fire({
              title: "Verifying Payment...",
              text: "Confirming transaction with Razorpay...",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            const verifyRes = await API.post("/subscription/public-verify-payment", {
              slug: effectiveSlug,
              plan_code: plan.code,
              currency,
              discount_code: appliedCoupon?.code,
              discount_amount: pricing.discountAmount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data && verifyRes.data.success) {
              const loginUrl = getLoginUrl(effectiveSlug);
              Swal.fire({
                title: is_upgrade ? "Plan Upgraded! 🎉" : "Payment Received! 🎉",
                html: `
                  <div class="text-left text-xs space-y-2 mt-2 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <p><strong>Organization:</strong> ${orgData?.name || effectiveSlug}</p>
                    <p><strong>Upgraded Plan:</strong> ${plan.name}</p>
                    <p><strong>Expiry Date:</strong> ${new Date(verifyRes.data.data.subscription_expiry_date).toLocaleDateString()}</p>
                    <div class="pt-2">
                      <a href="${loginUrl}" class="inline-block w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-center transition">
                        Log In to Your CRM Workspace →
                      </a>
                    </div>
                  </div>
                `,
                icon: "success",
                confirmButtonColor: "#10b981",
              });
              fetchPaymentDetails(effectiveSlug);
            } else {
              throw new Error(verifyRes.data?.message || "Verification failed");
            }
          } catch (vErr: any) {
            Swal.fire(
              "Verification Error",
              vErr.response?.data?.message || vErr.message || "Failed to verify payment transaction.",
              "error"
            );
          }
        },
        theme: {
          color: "#040975",
        },
      };

      const rzpWindow = new (window as any).Razorpay(options);
      rzpWindow.on("payment.failed", function (failRes: any) {
        Swal.fire({
          title: "Payment Failed",
          text: failRes.error?.description || "Transaction was cancelled or declined by your bank.",
          icon: "error",
          confirmButtonColor: "#ef4444",
        });
      });
      rzpWindow.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      Swal.fire(
        "Payment Error",
        err.response?.data?.message || err.message || "Unable to initialize payment checkout.",
        "error"
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Public Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-2.png" alt="MORSE CRM" className="h-9 w-auto bg-[#040975] p-1.5 rounded-lg object-contain shadow-sm" />
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">MORSE CRM</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                Payment Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {orgData ? (
              <a
                href={getLoginUrl(orgData.slug)}
                className="btn btn-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 transition flex items-center gap-1.5"
              >
                <i className="mgc_enter_door_line text-sm"></i>
                <span>Sign In to {orgData.name}</span>
              </a>
            ) : (
              <Link
                to="/auth/login"
                className="btn btn-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold rounded-lg px-3 py-1.5 transition flex items-center gap-1.5"
              >
                <i className="mgc_enter_door_line text-sm"></i>
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-500 font-medium">Loading organization payment details...</p>
          </div>
        ) : (
          <div>
            {/* Organization Hero Banner */}
            {orgData ? (
              <div className="card p-6 mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-900/50">
                <div className="flex flex-wrap justify-between items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs uppercase tracking-widest font-bold text-indigo-300">Organization Space</span>
                      <span className={`inline-flex items-center gap-1.5 py-0.5 px-3 rounded-full text-xs font-bold ${
                        orgData.computed_status === "Active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : orgData.computed_status === "Trial"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}>
                        <i className={
                          orgData.computed_status === "Active"
                            ? "mgc_check_circle_fill text-xs"
                            : orgData.computed_status === "Trial"
                            ? "mgc_time_fill text-xs"
                            : "mgc_alarm_1_fill text-xs"
                        }></i>
                        <span>{orgData.computed_status === "Trial" ? "Active Trial" : orgData.computed_status}</span>
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {orgData.name}
                    </h1>

                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed flex items-center gap-2">
                      <span>Subdomain:</span>
                      <span className="font-mono bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded font-semibold">
                        {orgData.slug}
                      </span>
                      <span>• Current Plan: <strong>{orgData.plan_name}</strong></span>
                    </p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-right min-w-[220px]">
                    <span className="text-xs text-indigo-200 block mb-1">Subscription Validity</span>
                    <div className="text-lg font-bold text-white">
                      {orgData.subscription_expiry_date ? (
                        new Date(orgData.subscription_expiry_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      ) : (
                        "No Expiry / Unregistered"
                      )}
                    </div>
                    <div className="text-xs font-semibold mt-1">
                      {orgData.days_remaining !== null && orgData.days_remaining >= 0 ? (
                        <span className="text-amber-300 flex items-center justify-end gap-1">
                          <i className="mgc_time_line text-xs"></i>
                          <span>{orgData.days_remaining} Days Remaining</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center justify-end gap-1">
                          <i className="mgc_alarm_1_line text-xs"></i>
                          <span>Subscription Expired</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-6 mb-8 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-center max-w-2xl mx-auto shadow-sm">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <i className="mgc_search_line text-2xl"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Find Your Organization Space</h3>
                <p className="text-xs text-gray-500 mb-4">Enter your organization subdomain slug to view renewal packages and pay directly.</p>
                <form onSubmit={handleManualSearch} className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="text"
                    placeholder="e.g. arya-group"
                    value={manualSlug}
                    onChange={(e) => setManualSlug(e.target.value)}
                    className="form-input text-sm flex-1 rounded-xl"
                  />
                  <button type="submit" className="btn bg-primary hover:bg-primary-600 text-white text-xs px-4 py-2 rounded-xl font-bold">
                    Lookup
                  </button>
                </form>
                {errorMsg && <p className="text-xs text-rose-500 mt-3 font-medium">{errorMsg}</p>}
              </div>
            )}

            {/* Plans Selection & Tabs Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Select Subscription Plan / Annual Renewal
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Instant activation upon online payment via Razorpay or direct bank/UPI transfer.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Online vs Offline Tab */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePaymentTab === "online"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    onClick={() => setActivePaymentTab("online")}
                  >
                    <i className="mgc_bank_card_line text-sm"></i> Online Payment
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activePaymentTab === "offline"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    onClick={() => setActivePaymentTab("offline")}
                  >
                    <i className="mgc_bank_line text-sm"></i> Bank / UPI Transfer
                  </button>
                </div>

                {/* Currency Switcher */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currency === "INR"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    onClick={() => handleCurrencyChange("INR")}
                  >
                    INR (₹)
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      currency === "USD"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    onClick={() => handleCurrencyChange("USD")}
                  >
                    USD ($)
                  </button>
                </div>
              </div>
            </div>

            {/* Tab 1: Online Plans */}
            
            {/* Promo / Discount Coupon Section */}
            <div className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <i className="mgc_coupon_line text-xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Have a Promo or Discount Code?</span>
                    {appliedCoupon && (
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        <i className="mgc_check_circle_fill text-xs"></i> {appliedCoupon.code} Applied
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500">Apply promo coupons to get instant discounts on all plans.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 py-1.5 px-3 rounded-xl text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">
                      {appliedCoupon.percentage ? appliedCoupon.percentage + '% OFF Applied' : 'Discount Applied'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-rose-500 hover:text-rose-700 font-bold ml-1 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SAVE20"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="form-input text-xs py-1.5 px-3 rounded-xl uppercase tracking-wider font-semibold w-40"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      className="btn bg-[#040975] hover:bg-[#060c9e] text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition shadow-xs"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {!appliedCoupon && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('WELCOME10')}
                      className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 transition"
                    >
                      WELCOME10 (-10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('SAVE20')}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 transition"
                    >
                      SAVE20 (-20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('FLAT5000')}
                      className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 transition"
                    >
                      FLAT5000 (-₹5k)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activePaymentTab === "online" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-12">
                {(() => {
                  const currentPlanObj = plans.find((p) => p.code === orgData?.plan_code);
                  const isOrgActivePaid =
                    orgData &&
                    (orgData.computed_status === "Active" ||
                      (orgData.subscription_expiry_date && new Date(orgData.subscription_expiry_date) > new Date())) &&
                    !orgData.is_trial &&
                    orgData.plan_code !== "free_trial" &&
                    orgData.plan_code !== "trial" &&
                    orgData.computed_status !== "Trial";

                  const currentPlanPrice = currentPlanObj
                    ? currency === "USD"
                      ? Number(currentPlanObj.price_usd)
                      : Number(currentPlanObj.price_inr)
                    : 0;

                  return plans
                    .filter((p) => p.code !== "free_trial")
                    .map((plan) => {
                      const isCurrent = orgData?.plan_code === plan.code;
                      const planPrice = currency === "USD" ? Number(plan.price_usd) : Number(plan.price_inr);
                      const isUpgradeEligible = isOrgActivePaid && !isCurrent && planPrice > currentPlanPrice;
                      const isLowerPlan = isOrgActivePaid && !isCurrent && planPrice < currentPlanPrice;
                      const upgradeDiffAmount = isUpgradeEligible ? planPrice - currentPlanPrice : 0;

                      return (
                        <div
                          key={plan.id}
                          className={`card p-7 flex flex-col justify-between rounded-2xl border transition-all relative ${
                            isLowerPlan
                              ? "border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-slate-800/50 opacity-80"
                              : plan.code === "growth" || plan.is_popular
                              ? "border-2 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10 bg-white dark:bg-slate-800"
                              : isCurrent
                              ? "border-2 border-emerald-500 shadow-md bg-white dark:bg-slate-800"
                              : "border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-slate-800 hover:shadow-md"
                          }`}
                        >
                          <div>
                            {/* Card Top Category & Active Badge (Exact match to screenshot) */}
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">
                                {plan.category || plan.name.toUpperCase()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {isCurrent && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                                    Current Plan
                                  </span>
                                )}
                                {isLowerPlan ? (
                                  <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                    Included in current plan
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Plan Name */}
                            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                              {plan.name}
                            </h3>

                            {/* Price / per year */}
                            {(() => {
                              const pricing = getPlanPricing(plan);
                              return (
                                <div className="mt-3">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100">
                                      {currency === "USD" ? '$' + pricing.finalPrice : '₹' + Number(pricing.finalPrice).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">/per year</span>
                                    {pricing.hasDiscount && (
                                      <span className="text-xs font-bold text-gray-400 line-through ml-1">
                                        {currency === "USD" ? '$' + pricing.originalPrice : '₹' + Number(pricing.originalPrice).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {pricing.hasDiscount && (
                                    <div className="mt-1">
                                      <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                                        Save {currency === "USD" ? '$' + pricing.discountAmount : '₹' + Number(pricing.discountAmount).toLocaleString()} with {appliedCoupon?.code}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Tagline / Subtitle */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 mb-6 min-h-[34px] leading-relaxed">
                              {plan.tagline || plan.description}
                            </p>

                            {/* Features List with Indigo Checkmark */}
                            <ul className="space-y-3 mb-6 border-t border-gray-100 dark:border-gray-700/80 pt-5">
                              {(plan.features || []).map((feat: string, idx: number) => (
                                <li key={idx} className="flex items-start text-xs text-slate-700 dark:text-slate-300 gap-2.5">
                                  <i className="mgc_check_line text-indigo-600 dark:text-indigo-400 text-base flex-shrink-0 mt-0.5 font-bold"></i>
                                  <span className="leading-snug">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Footer with 14-day trial & action button */}
                          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 font-medium">{plan.trial_days || 14}-day trial</span>
                              {isUpgradeEligible && (
                                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  Upgrade diff: {currency === "USD" ? `$${upgradeDiffAmount}` : `₹${upgradeDiffAmount.toLocaleString()}`}
                                </span>
                              )}
                              {isLowerPlan && (
                                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                  Downgrade not allowed
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isLowerPlan || processingPlan === plan.code}
                              className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md ${
                                isLowerPlan
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700 shadow-none"
                                  : plan.code === "growth" || plan.is_popular
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  : isCurrent
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-primary hover:bg-primary-600 text-white"
                              }`}
                              onClick={() => {
                                if (isLowerPlan) return;
                                handlePayNow(plan);
                              }}
                            >
                              {processingPlan === plan.code ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              ) : isLowerPlan ? (
                                <>
                                  <i className="mgc_check_circle_fill text-base text-emerald-500"></i> Included in {orgData?.plan_name || "Active"} Plan
                                </>
                              ) : isUpgradeEligible ? (
                                <>
                                  <i className="mgc_arrow_up_circle_fill text-base"></i> Upgrade to {plan.name} ({currency === "USD" ? '$' + getPlanPricing(plan).finalPrice : '₹' + Number(getPlanPricing(plan).finalPrice).toLocaleString()}) →
                                </>
                              ) : isCurrent ? (
                                <>
                                  <i className="mgc_refresh_3_line text-base"></i> Renew {plan.name} Plan ({currency === "USD" ? '$' + getPlanPricing(plan).finalPrice : '₹' + Number(getPlanPricing(plan).finalPrice).toLocaleString()}) →
                                </>
                              ) : (
                                <>
                                  <i className="mgc_wallet_2_line text-base"></i> Pay for {plan.name} ({currency === "USD" ? '$' + getPlanPricing(plan).finalPrice : '₹' + Number(getPlanPricing(plan).finalPrice).toLocaleString()}) →
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            )}

            {/* Tab 2: Bank / UPI Details */}
            {activePaymentTab === "offline" && (
              <div className="card p-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm mb-12">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <i className="mgc_bank_line text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Direct Bank & UPI Transfer</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Transfer subscription fees directly via NEFT/RTGS/IMPS or scan UPI QR. Send the payment reference to activate instantly.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/60 p-5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs">
                    <div>
                      <span className="text-gray-500 block">Beneficiary Account Name:</span>
                      <strong className="text-slate-800 dark:text-slate-200 text-sm">CRM Platform Solutions Private Limited</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Bank Name:</span>
                      <strong className="text-slate-800 dark:text-slate-200 text-sm">HDFC Bank Ltd</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Account Number:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">50200084920192</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">IFSC Code:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">HDFC0001234</strong>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                      <span className="text-gray-500 block">UPI ID (VPA):</span>
                      <strong className="text-primary font-mono text-sm">crmplatform@hdfcbank</strong>
                    </div>
                  </div>

                  <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <i className="mgc_information_line text-sm"></i> How to activate after bank transfer:
                    </p>
                    <p>
                      1. After completing the payment, email your transaction screenshot or UTR number to <strong className="underline">billing@crmsaas.com</strong> or WhatsApp to <strong>+91 98765 43210</strong>.
                    </p>
                    <p>
                      2. Mention your organization slug: <strong className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded">{orgData?.slug || slug || "your-subdomain"}</strong>.
                    </p>
                    <p>3. Super Admin will verify and activate your annual subscription immediately.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} CRM Management Platform. All transactions are SSL encrypted and 100% secure.</p>
        </div>
      </footer>

      {/* Cash Payment Modal */}
      {cashModalPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <i className="mgc_wallet_2_line text-lg"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Record Cash Payment</h3>
                  <p className="text-xs text-gray-500">Direct cash payment & subscription activation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCashModalPlan(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Plan and Price Breakdown (Supports Upgrades!) */}
            {(() => {
              const currentPlanObj = plans.find((p) => p.code === orgData?.plan_code);
              const isOrgActivePaid =
                orgData &&
                (orgData.computed_status === "Active" ||
                  (orgData.subscription_expiry_date && new Date(orgData.subscription_expiry_date) > new Date())) &&
                !orgData.is_trial &&
                orgData.plan_code !== "free_trial" &&
                orgData.plan_code !== "trial" &&
                orgData.computed_status !== "Trial";
              const currentPlanPrice = currentPlanObj
                ? currency === "USD"
                  ? Number(currentPlanObj.price_usd)
                  : Number(currentPlanObj.price_inr)
                : 0;
              const planPrice = currency === "USD" ? Number(cashModalPlan.price_usd) : Number(cashModalPlan.price_inr);
              const isCurrent = orgData?.plan_code === cashModalPlan.code;
              const isUpgrade = isOrgActivePaid && !isCurrent && planPrice > currentPlanPrice;
              const currentPlanName = currentPlanObj?.name || orgData?.plan_name || "Current Plan";
              const upgradeDiff = isUpgrade ? planPrice - currentPlanPrice : 0;
              const baseAmount = isUpgrade ? upgradeDiff : planPrice;

              let discount = 0;
              if (appliedCoupon) {
                if (appliedCoupon.flatAmount) discount = currency === "USD" ? 50 : appliedCoupon.flatAmount;
                else if (appliedCoupon.percentage) discount = Math.round((baseAmount * (appliedCoupon.percentage / 100)) * 100) / 100;
                discount = Math.min(baseAmount - (currency === "USD" ? 1 : 10), Math.max(0, discount));
              }
              const finalAmount = Math.max(currency === "USD" ? 1 : 10, Math.round((baseAmount - discount) * 100) / 100);

              return (
                <div className="my-4 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 text-xs space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>{isUpgrade ? "Upgrading Plan To:" : "Plan Selected:"}</span>
                    <strong className="text-slate-900 dark:text-white">{cashModalPlan.name} Plan</strong>
                  </div>
                  {isUpgrade ? (
                    <>
                      <div className="flex justify-between text-gray-500">
                        <span>{cashModalPlan.name} Standard Price:</span>
                        <span>{currency === "USD" ? '$' + planPrice : '₹' + planPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>{currentPlanName} Credit:</span>
                        <span>-{currency === "USD" ? '$' + currentPlanPrice : '₹' + currentPlanPrice.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-500">
                      <span>Base Amount:</span>
                      <span>{currency === "USD" ? '$' + planPrice : '₹' + planPrice.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Discount ({appliedCoupon?.code}):</span>
                      <span>-{currency === "USD" ? '$' + discount : '₹' + discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-emerald-800 dark:text-emerald-300 pt-1.5 border-t border-emerald-200 dark:border-emerald-800">
                    <span>{isUpgrade ? "Net Upgrade Cash to Pay:" : "Total Cash Payable:"}</span>
                    <span>{currency === "USD" ? '$' + finalAmount : '₹' + finalAmount.toLocaleString()}</span>
                  </div>
                  {isUpgrade && (
                    <p className="text-[10px] text-gray-500 pt-1">
                      ✨ Active subscription validity until <strong>{orgData?.subscription_expiry_date ? new Date(orgData.subscription_expiry_date).toLocaleDateString() : 'expiry'}</strong> will be preserved.
                    </p>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleSubmitCashPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Payer / Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Authorized Signatory"
                  value={cashForm.payerName}
                  onChange={(e) => setCashForm({ ...cashForm, payerName: e.target.value })}
                  className="form-input text-xs w-full rounded-xl py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={cashForm.payerPhone}
                    onChange={(e) => setCashForm({ ...cashForm, payerPhone: e.target.value })}
                    className="form-input text-xs w-full rounded-xl py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. billing@company.com"
                    value={cashForm.payerEmail}
                    onChange={(e) => setCashForm({ ...cashForm, payerEmail: e.target.value })}
                    className="form-input text-xs w-full rounded-xl py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Cash Receipt / Voucher Ref #
                </label>
                <input
                  type="text"
                  placeholder="e.g. CASH-REC-001"
                  value={cashForm.reference}
                  onChange={(e) => setCashForm({ ...cashForm, reference: e.target.value })}
                  className="form-input text-xs w-full rounded-xl py-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Payment Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid in cash at branch office"
                  value={cashForm.notes}
                  onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                  className="form-input text-xs w-full rounded-xl py-1.5"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setCashModalPlan(null)}
                  className="btn border border-gray-300 dark:border-gray-600 text-xs px-4 py-2 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCash}
                  className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"
                >
                  {submittingCash ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <i className="mgc_check_circle_fill text-sm"></i>
                      <span>Confirm & Activate Subscription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPayment;
