import { useEffect, useState } from "react";
import { API } from "@/config";
import Swal from "sweetalert2";
import { Check, ShieldCheck, Zap } from "lucide-react";

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
  tenant: { name: string; slug?: string };
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
      setProcessingPlanId(plan.id);

      // 1. Initiate order creation
      const orderRes = await API.post("/subscription/create-order", {
        pricing_tier_id: plan.id,
        currency: plan.currency,
      });

      const orderData = orderRes.data?.data;
      if (!orderData || !orderData.order_id) {
        throw new Error("Could not initialize payment order.");
      }

      // 2. Check if Razorpay SDK is loaded
      if (typeof (window as any).Razorpay === "function") {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CRM SaaS",
          description: `Subscription: ${plan.name} Plan`,
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
                title: "Payment Successful!",
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
            name: data?.tenant?.name || "Organization Admin",
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
        // Fallback demo/sandbox confirmation if checkout.js is offline or mock mode
        const result = await Swal.fire({
          title: "Complete Payment",
          html: `Simulate checkout for <strong>${plan.name}</strong> (${formatAmount(plan.amount_cents, plan.currency)})?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Confirm Payment",
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
            title: "Payment Verified",
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
                            disabled={isCurrent || processingPlanId === plan.id}
                            onClick={() => void handleCheckout(plan)}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                              isCurrent
                                ? "cursor-default bg-slate-100 text-slate-400"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            }`}
                          >
                            <Zap className="h-4 w-4" />
                            {processingPlanId === plan.id
                              ? "Processing…"
                              : isCurrent
                              ? "Current Plan"
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
