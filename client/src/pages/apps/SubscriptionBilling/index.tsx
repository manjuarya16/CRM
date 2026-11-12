import { useEffect, useState } from "react";
import { API } from "@/config";
import Swal from "sweetalert2";
import { Check, ShieldCheck, Zap } from "lucide-react";
import { useTenantStore } from "@/store/tenantStore";
import { calculateProratedUpgrade, ProratedUpgradeInfo } from "@/helpers/proratedUpgrade";

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

type Plan = {
  id: number;
  name: string;
  description: string | null;
  amount_cents: number | string;
  currency: string;
  billing_interval: string;
  trial_days: number;
  features: string[] | string | null;
};

type Subscription = {
  id: number;
  pricing_tier_id: number | null;
  status: string;
  tier_name: string | null;
  amount_cents: number | string | null;
  currency: string | null;
  billing_interval: string | null;
  starts_at: string;
  ends_at: string | null;
  auto_renew: boolean;
  payment_status: string | null;
};

type Payment = {
  id: number;
  amount_cents: number | string;
  currency: string;
  status: string;
  method: string;
  provider_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
};

type BillingData = {
  tenant: { id?: number; name: string; slug?: string; plan?: string; status?: string; is_trial?: boolean };
  subscription: Subscription | null;
  plans: Plan[];
  payments: Payment[];
  razorpay_key_id?: string;
};

const formatAmount = (amount: number | string | null, currency: string | null) => {
  if (amount === null || currency === null || !Number.isFinite(Number(amount))) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(Number(amount) / 100);
  } catch {
    return `${currency} ${(Number(amount) / 100).toFixed(2)}`;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const SubscriptionBillingPage = () => {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadBillingData = async () => {
    try {
      const response = await API.get("/subscription/current");
      const payload = response.data as { success?: boolean; data?: BillingData; message?: string };
      if (!payload.success || !payload.data) {
        throw new Error(payload.message || "Billing information could not be loaded.");
      }
      setData(payload.data);
      if (payload.data?.tenant?.slug) {
        sessionStorage.setItem("active_tenant_slug", payload.data.tenant.slug);
        localStorage.setItem("active_tenant_slug", payload.data.tenant.slug);
      }
      if (payload.data?.tenant?.id) {
        sessionStorage.setItem("active_tenant_id", String(payload.data.tenant.id));
        localStorage.setItem("active_tenant_id", String(payload.data.tenant.id));
      }
      const sub = payload.data?.subscription;
      const tenant = payload.data?.tenant;
      if (sub && tenant) {
        const isTrialing =
          sub.status === "trialing" ||
          sub.status === "trial" ||
          (tenant.plan && tenant.plan.toLowerCase().includes("trial")) ||
          tenant.status === "trial";
        const expiry = sub.ends_at ? new Date(sub.ends_at) : null;
        const now = new Date();
        const daysRemaining = expiry ? Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

        const updatedProfile = {
          ...(useTenantStore.getState().profile || {}),
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status || "active",
          plan: sub.tier_name || tenant.plan || "Starter",
          tier_name: sub.tier_name,
          sub_status: sub.status,
          is_trial: Boolean(isTrialing),
          computed_status: isTrialing ? "Trial" : "Active",
          trial_days_remaining: isTrialing ? daysRemaining : null,
          subscription_expiry_date: sub.ends_at,
          settings: useTenantStore.getState().profile?.settings || {},
        };

        try {
          sessionStorage.setItem("current_tenant_profile", JSON.stringify(updatedProfile));
          localStorage.setItem("current_tenant_profile", JSON.stringify(updatedProfile));
        } catch {}

        useTenantStore.setState((prev) => ({
          ...prev,
          profile: updatedProfile as any,
        }));
      }
      setError("");
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : "Billing information could not be loaded.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBillingData();
  }, []);

  const handleCheckout = async (plan: Plan) => {
    try {
      const currentAmount = subscription?.amount_cents ? Number(subscription.amount_cents) : 0;
      const planAmount = Number(plan.amount_cents || 0);
      const isCurrent = subscription?.pricing_tier_id === plan.id;
      const isOrgActive = subscription?.status === "active";

      if (isOrgActive && !isCurrent && planAmount < currentAmount) {
        Swal.fire({
          icon: "warning",
          title: "Upgrade Only",
          text: "Your organization already has an active higher plan. Downgrades are not permitted during an active subscription period. You can only upgrade to a higher plan.",
        });
        return;
      }

      
      const isUpgrade = isOrgActive && !isCurrent && planAmount > currentAmount;
      let upgradeInfo: ProratedUpgradeInfo | null = null;
      let payAmountCents = planAmount;

      if (isUpgrade) {
        upgradeInfo = calculateProratedUpgrade({
          currentAmount: currentAmount / 100,
          targetAmount: planAmount / 100,
          startDate: subscription?.starts_at,
          upgradeDate: new Date(),
          currency: plan.currency || "INR",
          currentPlanName: subscription?.tier_name || "Current Plan",
          targetPlanName: plan.name,
        });
        payAmountCents = Math.round(upgradeInfo.payableUpgradeAmount * 100);
      }
      const formattedPrice = formatAmount(payAmountCents, plan.currency);

      // ALWAYS ASK PAYMENT MODE: Cash or Online (for regular payment and upgrades!)
      const choice: any = await Swal.fire({
        title: isUpgrade ? "Plan Upgrade: Select Payment Mode" : "Select Payment Mode",
        html: `
          <div class="text-left text-xs space-y-3 pt-1 text-slate-700">
            <div class="p-3.5 bg-indigo-50/90 rounded-xl border border-indigo-200 space-y-2">
              <div class="flex justify-between items-center border-b border-indigo-200 pb-1.5">
                <span class="text-xs text-indigo-900 font-bold block">
                  ${isUpgrade ? `Upgrade to ${plan.name} Plan` : `${plan.name} Plan`}
                </span>
                ${isUpgrade ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">New Validity: 1 Year</span>` : ''}
              </div>
              ${isUpgrade && upgradeInfo ? `
                <div class="space-y-1 text-[11px] text-slate-600 pt-0.5">
                  <div class="flex justify-between">
                    <span>Current Plan (${upgradeInfo.currentPlanName}):</span>
                    <span class="font-medium">${formatAmount(currentAmount, plan.currency)}</span>
                  </div>
                  <div class="flex justify-between text-slate-500">
                    <span>Days Used (${upgradeInfo.daysUsed} days @ ${formatAmount(Math.round(upgradeInfo.dailyRate * 100), plan.currency)}/day):</span>
                    <span class="text-red-500 font-medium">-${formatAmount(Math.round(upgradeInfo.usedAmount * 100), plan.currency)}</span>
                  </div>
                  <div class="flex justify-between font-semibold text-emerald-700">
                    <span>Unused Balance Credit:</span>
                    <span>+${formatAmount(Math.round(upgradeInfo.remainingCredit * 100), plan.currency)}</span>
                  </div>
                  <div class="flex justify-between pt-1 border-t border-indigo-100">
                    <span>Upgraded Plan (${upgradeInfo.targetPlanName}):</span>
                    <span class="font-medium">${formatAmount(planAmount, plan.currency)}</span>
                  </div>
                  <div class="flex justify-between font-bold text-sm text-indigo-950 pt-1 border-t border-indigo-200">
                    <span>Net Upgrade Payable:</span>
                    <span class="text-emerald-600 text-base font-extrabold">${formattedPrice}</span>
                  </div>
                </div>
                <div class="text-[10px] text-indigo-700 bg-indigo-100/70 p-2 rounded-lg leading-relaxed mt-1">
                  ✨ <strong>1-Year Renewal:</strong> Upon upgrade, your subscription start date resets to today and validity extends for 1 full year (until <strong>${new Date(upgradeInfo.newExpiryDate).toLocaleDateString()}</strong>).
                </div>
              ` : `
                <span class="text-xl font-extrabold text-indigo-950 mt-1 block">${formattedPrice}</span>
              `}
            </div>
            <p class="text-center font-bold text-xs text-slate-700">
              ${isUpgrade ? "Select payment mode to pay the upgrade difference:" : "Please choose how you want to make this payment:"}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button id="swal-bill-cash" type="button" class="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-left transition hover:shadow-md cursor-pointer flex flex-col justify-between">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">💵</span>
                  <strong class="text-sm font-bold text-emerald-950">Cash Payment</strong>
                </div>
                <p class="text-[11px] text-gray-600 leading-snug">
                  ${isUpgrade ? "Pay upgrade difference in cash." : "Pay via cash handover or physical receipt."}
                </p>
                <div class="mt-3 pt-2 border-t border-emerald-200 text-[11px] font-bold text-emerald-700">
                  Pay with Cash (${formattedPrice}) →
                </div>
              </button>
              <button id="swal-bill-online" type="button" class="p-3.5 rounded-xl border-2 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 text-left transition hover:shadow-md cursor-pointer flex flex-col justify-between">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">💳</span>
                  <strong class="text-sm font-bold text-indigo-950">Online Payment</strong>
                </div>
                <p class="text-[11px] text-gray-600 leading-snug">
                  ${isUpgrade ? "Pay upgrade difference online via Razorpay." : "Instant online checkout via Razorpay."}
                </p>
                <div class="mt-3 pt-2 border-t border-indigo-200 text-[11px] font-bold text-indigo-700">
                  Pay Online (${formattedPrice}) →
                </div>
              </button>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Cancel",
        cancelButtonColor: "#94a3b8",
        didOpen: () => {
          const cashBtn = document.getElementById("swal-bill-cash");
          const onlineBtn = document.getElementById("swal-bill-online");
          if (cashBtn) cashBtn.onclick = () => (Swal as any).close({ value: "cash" });
          if (onlineBtn) onlineBtn.onclick = () => (Swal as any).close({ value: "online" });
        },
      });

      if (!choice || !choice.value) {
        return;
      }

      if (choice.value === "cash") {
        const { value: cashDetails } = await Swal.fire({
          title: isUpgrade ? "Record Cash Payment for Upgrade" : "Record Cash Payment",
          width: "680px",
          customClass: {
            popup: "!w-[680px] !max-w-[95vw] !p-8 rounded-3xl border border-slate-200 shadow-2xl",
            htmlContainer: "!overflow-visible !m-0 !pt-2",
            confirmButton: "!rounded-xl !px-6 !py-3 !font-bold !text-sm !bg-emerald-600 hover:!bg-emerald-500 cursor-pointer",
            cancelButton: "!rounded-xl !px-6 !py-3 !font-semibold !text-sm !bg-slate-200 cursor-pointer",
          },
          html: `
            <div class="text-left text-sm space-y-4 pt-2">
              <p>Plan: <strong>${plan.name}</strong> (${formattedPrice})</p>
              <div>
                <label class="block font-semibold mb-1">Receipt / Voucher Ref #:</label>
                <input id="swal-cash-ref" class="form-input text-xs w-full py-2 rounded-lg border border-gray-300" placeholder="e.g. CASH-${Date.now().toString().slice(-6)}" value="CASH-${Date.now().toString().slice(-6)}" />
              </div>
              <div>
                <label class="block font-semibold mb-1">Notes / Remarks:</label>
                <input id="swal-cash-notes" class="form-input text-xs w-full py-2 rounded-lg border border-gray-300" placeholder="e.g. Paid cash for plan upgrade" />
              </div>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Confirm Cash Payment",
          confirmButtonColor: "#10b981",
          preConfirm: () => {
            const ref = (document.getElementById("swal-cash-ref") as HTMLInputElement)?.value;
            const notes = (document.getElementById("swal-cash-notes") as HTMLInputElement)?.value;
            return { reference: ref, notes };
          },
        });

        if (cashDetails) {
          Swal.fire({ title: "Recording Payment...", didOpen: () => Swal.showLoading() });
          const tenantSlug = data?.tenant?.slug || localStorage.getItem("active_tenant_slug") || "";
          const cashRes = await API.post("/subscription/public-cash-payment", {
            slug: tenantSlug,
            plan_code: plan.name.toLowerCase(),
            currency: plan.currency,
            amount_cents: payAmountCents,
            is_upgrade: isUpgrade,
            payer_name: data?.tenant?.name || "Admin",
            reference: cashDetails.reference,
            notes: cashDetails.notes,
          });

          if (cashRes.data && cashRes.data.success) {
            Swal.fire({
              icon: "success",
              title: isUpgrade ? "Plan Upgraded Successfully! 🎉" : "Cash Payment Recorded!",
              text: `Invoice: ${cashRes.data.data?.invoice_number || 'Generated'}. Your subscription is now upgraded!`,
              confirmButtonColor: "#10b981",
            });
            await loadBillingData();
          } else {
            throw new Error(cashRes.data?.message || "Failed to record cash payment");
          }
        }
        return;
      }

      setProcessingPlanId(plan.id);

      // 1. Initiate order creation
      const orderRes = await API.post("/subscription/create-order", {
        pricing_tier_id: plan.id,
        amount_cents: payAmountCents,
        currency: plan.currency,
        is_upgrade: isUpgrade,
      });

      const orderData = orderRes.data?.data;
      if (!orderData || !orderData.order_id) {
        throw new Error("Could not initialize payment order.");
      }

      const isMockOrder =
        !orderData.key_id ||
        orderData.key_id === "rzp_test_placeholder" ||
        String(orderData.order_id).startsWith("order_crm_") ||
        String(orderData.order_id).startsWith("order_mock_");

      // 2. Ensure Razorpay SDK is loaded when using live gateway keys
      if (!isMockOrder) {
        await loadRazorpayScript();
      }

      if (!isMockOrder && typeof (window as any).Razorpay === "function") {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CRM SaaS",
          description: isUpgrade
            ? `Upgrade to ${plan.name} Plan`
            : `Subscription: ${plan.name} Plan`,
          order_id: orderData.order_id,
          handler: async (response: any) => {
            try {
              await API.post("/subscription/verify-payment", {
                razorpay_order_id: response.razorpay_order_id || orderData.order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                pricing_tier_id: plan.id,
              });

              await Swal.fire({
                icon: "success",
                title: isUpgrade ? "Plan Upgraded!" : "Payment Successful!",
                text: `Your ${plan.name} subscription has been activated successfully.`,
                confirmButtonColor: "#4f46e5",
              });

              void loadBillingData();
            } catch (verifyErr: any) {
              await Swal.fire({
                icon: "error",
                title: "Verification Failed",
                text: verifyErr?.response?.data?.message || verifyErr.message || "Could not verify payment.",
              });
            }
          },
          prefill: {
            ...(data?.tenant?.name ? { name: data.tenant.name } : {}),
            ...((data?.tenant as any)?.email ? { email: (data?.tenant as any).email } : {}),
            ...((data?.tenant as any)?.phone && String((data?.tenant as any).phone).trim().length >= 10
              ? { contact: String((data?.tenant as any).phone).trim() }
              : {}),
          },
          theme: { color: "#4f46e5" },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (failRes: any) => {
          Swal.fire({
            icon: "error",
            title: "Payment Failed",
            text: failRes?.error?.description || "Payment could not be completed.",
          });
        });
        rzp.open();
      } else {
        // Fallback sandbox/mock confirmation if checkout.js is unavailable or keys are in test placeholder/mock mode
        const result = await Swal.fire({
          title: isUpgrade ? "Confirm Plan Upgrade" : "Complete Payment",
          html: `Confirm ${isUpgrade ? "upgrade" : "checkout"} for <strong>${plan.name}</strong> (${formattedPrice})?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: isUpgrade ? `Pay ${formattedPrice} & Upgrade` : "Confirm Payment",
          confirmButtonColor: "#4f46e5",
        });

        if (result.isConfirmed) {
          await API.post("/subscription/verify-payment", {
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: `sig_sim_${Date.now()}`,
            pricing_tier_id: plan.id,
          });

          await Swal.fire({
            icon: "success",
            title: isUpgrade ? "Plan Upgraded" : "Payment Verified",
            text: `Subscription updated to ${plan.name}.`,
          });
          void loadBillingData();
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Checkout Error",
        text: err?.response?.data?.message || err.message || "Failed to start checkout.",
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const subscription = data?.subscription;
  const plans = data?.plans || [];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Account</p>
            <h1 className="mt-1 text-2xl font-bold">Subscription &amp; Billing</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage your subscription plans, upgrade features, and view payment history via Razorpay.
            </p>
          </div>
          {subscription?.status === "active" && (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 sm:self-auto">
              <ShieldCheck className="h-4 w-4" /> Active Subscription
            </span>
          )}
        </header>

        {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading billing information…</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && data && (
          <>
            {/* Current Subscription Card */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Current Subscription</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{data.tenant.name}</p>
                </div>
                {subscription?.status && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    subscription.status === "active" ? "bg-emerald-50 text-emerald-700" :
                    subscription.status === "trialing" ? "bg-blue-50 text-blue-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>
                    {subscription.status}
                  </span>
                )}
              </div>

              {subscription ? (
                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Plan", subscription.tier_name || "—"],
                    ["Status", subscription.status],
                    ["Price", formatAmount(subscription.amount_cents, subscription.currency)],
                    ["Billing interval", subscription.billing_interval || "—"],
                    ["Starts", formatDate(subscription.starts_at)],
                    ["Renews / ends", formatDate(subscription.ends_at)],
                    ["Payment", subscription.payment_status || "—"],
                    ["Auto renew", subscription.auto_renew ? "On" : "Off"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-medium capitalize text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No subscription has been recorded for this organization.</p>
              )}
            </section>

            {/* Plans / Upgrades Section */}
            {plans.length > 0 && (
              <section className="mt-8">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Available Plans</h2>
                  <p className="text-sm text-slate-500">Upgrade or renew your organization subscription instantly.</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => {
                    const isCurrent = subscription?.pricing_tier_id === plan.id;
                    const isOrgActive = subscription?.status === "active";
                    const currentAmount = subscription?.amount_cents ? Number(subscription.amount_cents) : 0;
                    const planAmount = Number(plan.amount_cents || 0);
                    const isLowerPlan = isOrgActive && !isCurrent && planAmount < currentAmount;
                    const isUpgrade = isOrgActive && !isCurrent && planAmount > currentAmount;
                    const upgradeProrated = isUpgrade
                      ? calculateProratedUpgrade({
                          currentAmount: currentAmount / 100,
                          targetAmount: planAmount / 100,
                          startDate: subscription?.starts_at,
                          upgradeDate: new Date(),
                          currency: plan.currency,
                          currentPlanName: subscription?.tier_name || "Current Plan",
                          targetPlanName: plan.name,
                        })
                      : null;
                    const proratedPayableCents = upgradeProrated ? Math.round(upgradeProrated.payableUpgradeAmount * 100) : 0;

                    const parsedFeatures: string[] = Array.isArray(plan.features)
                      ? plan.features
                      : typeof plan.features === "string"
                      ? JSON.parse(plan.features || "[]")
                      : [];

                    return (
                      <div
                        key={plan.id}
                        className={`flex flex-col justify-between rounded-xl border bg-white p-6 shadow-sm transition-all ${
                          isCurrent
                            ? "border-indigo-600 ring-2 ring-indigo-600/20"
                            : isLowerPlan
                            ? "border-slate-200 bg-slate-50/60 opacity-80"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                            {isCurrent && (
                              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                Current Plan
                              </span>
                            )}
                            {isLowerPlan && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                Included in plan
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                          <div className="mt-4 flex items-baseline">
                            <span className="text-3xl font-extrabold text-slate-900">
                              {formatAmount(plan.amount_cents, plan.currency)}
                            </span>
                            <span className="ml-1 text-sm text-slate-500">
                              /{plan.billing_interval || "month"}
                            </span>
                          </div>

                          <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-4">
                            {parsedFeatures.map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6 pt-4">
                          <button
                            type="button"
                            disabled={isCurrent || isLowerPlan || processingPlanId === plan.id}
                            onClick={() => {
                              if (isLowerPlan) return;
                              void handleCheckout(plan);
                            }}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                              isLowerPlan
                                ? "cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200 shadow-none"
                                : isCurrent
                                ? "cursor-default bg-slate-100 text-slate-400"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            }`}
                          >
                            <Zap className="h-4 w-4" />
                            {processingPlanId === plan.id
                              ? "Processing…"
                              : isCurrent
                              ? "Current Plan"
                              : isLowerPlan
                              ? "Included in current plan"
                              : isUpgrade
                              ? `Upgrade (${formatAmount(proratedPayableCents, plan.currency)})`
                              : "Subscribe with Razorpay"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Payment History Section */}
            <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold">Payment History</h2>
              </div>
              {data.payments.length === 0 ? (
                <p className="p-5 text-sm text-slate-600">No payments have been recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Date</th>
                        <th className="px-5 py-3 font-semibold">Amount</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Method</th>
                        <th className="px-5 py-3 font-semibold">Payment Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-5 py-3 text-slate-600">{formatDate(payment.paid_at || payment.created_at)}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{formatAmount(payment.amount_cents, payment.currency)}</td>
                          <td className="px-5 py-3 capitalize text-slate-700">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                              payment.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                              payment.status === "failed" ? "bg-rose-50 text-rose-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {payment.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3 capitalize text-slate-600">{payment.method}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600">{payment.provider_payment_id || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default SubscriptionBillingPage;
