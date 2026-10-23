export type ProductContext = "happycash" | "happycashagenda";

// Preserve the paid plan identifiers used by the original shared module.
const PAID_PLAN_IDS = new Set(["fiado", "completo", "pro"]);

export const normalizeProductContext = (
  value?: string | null,
): ProductContext | null => {
  const context = value?.trim().toLowerCase();
  return context === "happycash" || context === "happycashagenda" ? context : null;
};

export const isPaidPlanAllowedForProductContext = (
  productContext: ProductContext,
  planId?: string | null,
) => {
  if (!normalizeProductContext(productContext)) return false;
  return PAID_PLAN_IDS.has((planId ?? "").trim().toLowerCase());
};
