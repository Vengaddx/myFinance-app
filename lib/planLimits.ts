export type PlanType = "free" | "premium";

export const FREE_LIMITS = {
  assets: 15,
  liabilities: 10,
  expensesPerMonth: 30,
  scenarios: 1,
} as const;

export const PREMIUM_LIMITS = {
  assets: 100,
  liabilities: 50,
  expensesPerMonth: 100,
  scenarios: 15,
} as const;

export type PlanLimits = {
  assets: number;
  liabilities: number;
  expensesPerMonth: number;
  scenarios: number;
};

export function getLimits(planType: PlanType | null | undefined): PlanLimits {
  return planType === "premium" ? PREMIUM_LIMITS : FREE_LIMITS;
}

export function isPremium(planType: PlanType | null | undefined): boolean {
  return planType === "premium";
}
