import { FormEvent, useEffect, useState } from "react";
import { superAdminApi } from "@/helpers/api/superAdmin";
import { X } from "lucide-react";

type Plan = {
  id: number;
  name: string;
  amount_cents: number | string;
  currency: string;
  billing_interval: string;
};

type Props = {
  tenantId: number;
  tenantName: string;
  currentPlan?: string | null;
  onClose: () => void;
  onComplete: () => void;
};

const requestErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const request = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    return request.response?.data?.message || request.message || "Could not send the payment link.";
  }
  return "Could not send the payment link.";
};

const PaymentLinkDialog = ({ tenantId, tenantName, currentPlan, onClose, onComplete }: Props) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");

  useEffect(() => {
    let active = true;
    superAdminApi.getSubscriptionPlans()
      .then((response) => {
        const payload = response.data as { data?: Plan[]; message?: string };
        const availablePlans = Array.isArray(payload.data) ? payload.data : [];
        if (!active) return;
        setPlans(availablePlans);
        const matchingPlan = availablePlans.find(
          (plan) => plan.name.toLowerCase() === currentPlan?.trim().toLowerCase()
        );
        if (matchingPlan) setSelectedPlanId(String(matchingPlan.id));
        if (availablePlans.length === 0) setError(payload.message || "There are no active pricing plans available.");
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => {
      active = false;
    };
  }, [currentPlan]);

  const sendPaymentLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlanId) {
      setError("Select a pricing plan before sending the payment link.");
      return;
    }
    setSending(true);
    setError("");
    setMessage("");
    setPaymentUrl("");
    try {
      const response = await superAdminApi.createTenantPaymentLink(tenantId, Number(selectedPlanId));
      const payload = response.data as {
        success?: boolean;
        message?: string;
        email_sent?: boolean;
        data?: { email_sent?: boolean; payment_link_url?: string };
      };
      const responseMessage = payload.message || "Payment link created.";
      if (payload.email_sent === false || payload.data?.email_sent === false) {
        setError(responseMessage);
        setPaymentUrl(payload.data?.payment_link_url || "");
      } else {
        setMessage(responseMessage);
        setPaymentUrl(payload.data?.payment_link_url || "");
      }
      onComplete();
    } catch (requestError: unknown) {
      setError(requestErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-link-title"
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="payment-link-title" className="text-lg font-semibold text-white">Send hosted payment link</h2>
            <p className="mt-1 text-sm text-slate-400">{tenantName}</p>
          </div>
          <button type="button" onClick={onClose} className="super-admin-action-icon" aria-label="Close dialog">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <form onSubmit={(event) => void sendPaymentLink(event)}>
          <label className="mt-5 block text-sm font-medium text-slate-300">
            Pricing plan
            <select
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              disabled={loadingPlans || sending || plans.length === 0}
              required
              className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white disabled:opacity-60"
            >
              <option value="">{loadingPlans ? "Loading plans…" : "Select a plan"}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.currency} {(Number(plan.amount_cents) / 100).toFixed(2)} / {plan.billing_interval}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-500">The customer completes payment on Razorpay’s hosted page. The subscription activates after Razorpay confirms payment.</p>

          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
          {paymentUrl && (
            <a href={paymentUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-indigo-300 underline">
              Open Razorpay payment link
            </a>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              {message || error ? "Close" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loadingPlans || sending || plans.length === 0 || !selectedPlanId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Create and email link"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PaymentLinkDialog;
