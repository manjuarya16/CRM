import { FormEvent, useEffect, useState } from "react";
import { superAdminApi } from "@/helpers/api/superAdmin";
import { X, Copy, ExternalLink, Check } from "lucide-react";
import Swal from "sweetalert2";

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Payment link copied to clipboard!",
      showConfirmButton: false,
      timer: 2000,
    });
  };

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
      const responseMessage = payload.message || "Payment link created successfully.";
      const linkUrl = payload.data?.payment_link_url || "";
      setPaymentUrl(linkUrl);

      if (payload.email_sent === false || payload.data?.email_sent === false) {
        setError(responseMessage);
        Swal.fire({
          icon: "warning",
          title: "Payment Link Generated 🔗",
          html: `<p class="text-sm">${responseMessage}</p><p class="text-xs text-gray-500 mt-2">You can copy or open the direct link below.</p>`,
          confirmButtonColor: "#4f46e5",
        });
      } else {
        setMessage(responseMessage);
        Swal.fire({
          icon: "success",
          title: "Payment Link Sent! ✉️",
          text: responseMessage,
          confirmButtonColor: "#059669",
        });
      }
      onComplete();
    } catch (requestError: unknown) {
      const errMsg = requestErrorMessage(requestError);
      setError(errMsg);
      Swal.fire({
        icon: "error",
        title: "Could Not Send Payment Link",
        text: errMsg,
        confirmButtonColor: "#e11d48",
      });
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
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="payment-link-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span>Send Hosted Payment Link</span>
            </h2>
            <p className="mt-1 text-sm text-slate-300 font-medium">{tenantName}</p>
          </div>
          <button type="button" onClick={onClose} className="super-admin-action-icon text-slate-400 hover:text-white" aria-label="Close dialog" title="Close">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        {Boolean(currentPlan) && (
          <div className="mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 flex items-start gap-2">
            <span className="text-sm">ℹ️</span>
            <div>
              <strong>Active Plan: {currentPlan}</strong>
              <p className="mt-0.5 text-amber-300/80">Generating a new payment link allows this organization to renew early or upgrade to a higher tier.</p>
            </div>
          </div>
        )}

        <form onSubmit={(event) => void sendPaymentLink(event)}>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-300">
            Target Pricing Plan
            <select
              value={selectedPlanId}
              onChange={(event) => setSelectedPlanId(event.target.value)}
              disabled={loadingPlans || sending || plans.length === 0}
              required
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">{loadingPlans ? "Loading plans…" : "Select a plan"}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — {plan.currency} {(Number(plan.amount_cents) / 100).toFixed(2)} / {plan.billing_interval}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-slate-400">The customer completes secure payment on the hosted checkout page. The subscription activates automatically once confirmed.</p>

          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 font-medium">{message}</p>}

          {paymentUrl && (
            <div className="mt-4 p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 space-y-2">
              <span className="text-xs font-bold text-indigo-300 block uppercase tracking-wider">Payment Link Generated</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={paymentUrl}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 transition"
                  title="Copy link to clipboard"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shrink-0 transition"
                  title="Open payment link in new tab"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              {message || error ? "Done" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loadingPlans || sending || plans.length === 0 || !selectedPlanId}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending Link…" : "Generate & Email Link ✉️"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PaymentLinkDialog;
