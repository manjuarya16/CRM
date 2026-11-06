/**
 * Prorated Upgrade Calculation Helper
 */

export interface ProratedUpgradeInfo {
  isUpgrade: boolean;
  currentPlanName: string;
  currentPlanAmount: number;
  targetPlanName: string;
  targetPlanAmount: number;
  startDate: string;
  upgradeDate: string;
  daysUsed: number;
  dailyRate: number;
  usedAmount: number;
  remainingCredit: number;
  payableUpgradeAmount: number;
  currency: string;
  newStartDate: string;
  newExpiryDate: string;
}

export function calculateProratedUpgrade({
  currentAmount,
  targetAmount,
  startDate,
  upgradeDate = new Date(),
  currency = "INR",
  currentPlanName = "Current Plan",
  targetPlanName = "Upgraded Plan",
}: {
  currentAmount: number;
  targetAmount: number;
  startDate: Date | string | null | undefined;
  upgradeDate?: Date | string;
  currency?: string;
  currentPlanName?: string;
  targetPlanName?: string;
}): ProratedUpgradeInfo {
  const upDate = upgradeDate ? new Date(upgradeDate) : new Date();
  const stDate = startDate ? new Date(startDate) : upDate;

  // Calculate difference in calendar days between subscription start date and upgrade date
  const stCal = new Date(stDate.getFullYear(), stDate.getMonth(), stDate.getDate());
  const upCal = new Date(upDate.getFullYear(), upDate.getMonth(), upDate.getDate());
  const daysUsed = Math.min(365, Math.max(0, Math.round((upCal.getTime() - stCal.getTime()) / (1000 * 60 * 60 * 24))));

  // Daily rate: ₹Current ÷ 365 days = ₹Per Day
  const dailyRate = currentAmount > 0 ? Number((currentAmount / 365).toFixed(2)) : 0;

  // Used amount: days used * daily rate (capped at currentAmount)
  const usedAmount = Math.min(
    currentAmount,
    Number((daysUsed * (currentAmount / 365)).toFixed(2))
  );

  // Remaining credit: current amount minus used amount
  const remainingCredit = Math.max(
    0,
    Number((currentAmount - usedAmount).toFixed(2))
  );

  // Net payable difference: new plan amount minus remaining credit
  const payableUpgradeAmount = Math.max(
    0,
    Number((targetAmount - remainingCredit).toFixed(2))
  );

  // New subscription validity: 1 full year from update date (ends 1 year minus 1 day from start)
  const newStartDate = new Date(upDate);
  const newExpiryDate = new Date(upDate);
  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
  newExpiryDate.setDate(newExpiryDate.getDate() - 1);

  return {
    isUpgrade: targetAmount > currentAmount,
    currentPlanName,
    currentPlanAmount: currentAmount,
    targetPlanName,
    targetPlanAmount: targetAmount,
    startDate: stDate.toISOString(),
    upgradeDate: upDate.toISOString(),
    daysUsed,
    dailyRate,
    usedAmount,
    remainingCredit,
    payableUpgradeAmount,
    currency,
    newStartDate: newStartDate.toISOString(),
    newExpiryDate: newExpiryDate.toISOString(),
  };
}
