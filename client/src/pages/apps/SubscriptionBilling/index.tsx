import { useEffect, useState } from "react";
import { API } from "@/config";

type Subscription = {
  id: number;
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
  tenant: { name: string };
  subscription: Subscription | null;
  payments: Payment[];
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    API.get("/subscription/current")
      .then((response) => {
        const payload = response.data as { success?: boolean; data?: BillingData; message?: string };
        if (!payload.success || !payload.data) {
          throw new Error(payload.message || "Billing information could not be loaded.");
        }
        if (active) setData(payload.data);
      })
      .catch((requestError: unknown) => {
        const message = requestError instanceof Error ? requestError.message : "Billing information could not be loaded.";
        if (active) setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const subscription = data?.subscription;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Account</p>
          <h1 className="mt-1 text-2xl font-bold">Subscription &amp; Billing</h1>
          <p className="mt-2 text-sm text-slate-600">
            View your organization&apos;s subscription status and payment history. Payments are completed through secure links sent by your CRM provider.
          </p>
        </header>

        {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading billing information…</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        {!loading && !error && data && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Current subscription</h2>
              <p className="mt-1 text-sm text-slate-500">{data.tenant.name}</p>
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

            <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold">Payment history</h2>
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
                        <th className="px-5 py-3 font-semibold">Payment reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-5 py-3 text-slate-600">{formatDate(payment.paid_at || payment.created_at)}</td>
                          <td className="px-5 py-3 font-medium text-slate-900">{formatAmount(payment.amount_cents, payment.currency)}</td>
                          <td className="px-5 py-3 capitalize text-slate-700">{payment.status.replace(/_/g, " ")}</td>
                          <td className="px-5 py-3 capitalize text-slate-600">{payment.method}</td>
                          <td className="px-5 py-3 text-slate-600">{payment.provider_payment_id || "—"}</td>
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
