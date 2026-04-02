/** Common aircon service categories (value stored in DB). */
export const SERVICE_CATEGORY_OPTIONS = [
  { value: "cleaning", label: "General cleaning / wash" },
  { value: "installation", label: "New installation" },
  { value: "repair", label: "Repair / not cooling / noise" },
  { value: "refrigerant", label: "Gas charging / refrigerant top-up" },
  { value: "leak", label: "Leak check / repair" },
  { value: "maintenance", label: "Preventive maintenance (PM)" },
  { value: "relocation", label: "Dismantle / relocate" },
  { value: "other", label: "Other / not sure" },
];

export const DEFAULT_SERVICE_CATEGORY = "other";

const SET = new Set(SERVICE_CATEGORY_OPTIONS.map((o) => o.value));

export function normalizeServiceCategory(input) {
  const v = typeof input === "string" ? input.trim() : "";
  if (SET.has(v)) return v;
  return DEFAULT_SERVICE_CATEGORY;
}

export function assertServiceCategory(input) {
  const v = typeof input === "string" ? input.trim() : "";
  if (!SET.has(v)) throw new Error("Invalid service_category");
  return v;
}
