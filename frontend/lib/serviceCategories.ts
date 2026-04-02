/**
 * Default labels for legacy slugs when the API list is not loaded.
 * Live categories come from GET /api/service-categories (per branch).
 */

export const DEFAULT_SERVICE_CATEGORY = "other";

const FALLBACK_LABELS: Record<string, string> = {
  cleaning: "General cleaning / wash",
  installation: "New installation",
  repair: "Repair / not cooling / noise",
  refrigerant: "Gas charging / refrigerant top-up",
  leak: "Leak check / repair",
  maintenance: "Preventive maintenance (PM)",
  relocation: "Dismantle / relocate",
  other: "Other / not sure",
};

export function fallbackServiceCategoryLabel(
  value: string | null | undefined
): string {
  if (!value) return "—";
  return FALLBACK_LABELS[value] ?? value;
}
