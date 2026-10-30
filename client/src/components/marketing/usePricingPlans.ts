import { useCallback, useEffect, useState } from "react";
import API from "@/config";

export type PublicPricingPlan = {
  id: number;
  name: string;
  description: string | null;
  amount_cents: number | string;
  currency: string;
  billing_interval: "monthly" | "yearly" | "one_time";
  features: string[];
};

export function formatPricingAmount(amountCents: number | string, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amountCents) / 100);
}

export function usePricingPlans() {
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.get<{ success: boolean; data: PublicPricingPlan[] }>("/public/pricing");
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error("Pricing plans could not be loaded.");
      }
      setPlans(response.data.data);
    } catch {
      setError("Pricing plans are temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  return { plans, loading, error, reload: loadPlans };
}

export function billingIntervalLabel(interval: PublicPricingPlan["billing_interval"]) {
  if (interval === "yearly") return "per year";
  if (interval === "monthly") return "per month";
  return "one-time";
}
