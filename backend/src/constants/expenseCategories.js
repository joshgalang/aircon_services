/** Aircon / field-service expense buckets for accounting roll-ups. */
export const EXPENSE_CATEGORIES = [
  { value: "refrigerant_supply", label: "Refrigerant & cylinder refills" },
  { value: "parts_inventory", label: "Parts & inventory purchases" },
  { value: "fuel_vehicle", label: "Fuel & vehicle running" },
  { value: "payroll_labor", label: "Payroll & technician labor" },
  { value: "rent_facility", label: "Rent & warehouse" },
  { value: "utilities", label: "Utilities (power, water)" },
  { value: "tools_equipment", label: "Tools & equipment" },
  { value: "permits_licenses", label: "Permits, licenses, EPA/accreditation" },
  { value: "subcontractor", label: "Subcontractor / outsource" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing & ads" },
  { value: "office_admin", label: "Office & admin supplies" },
  { value: "other", label: "Other" },
];

const SET = new Set(EXPENSE_CATEGORIES.map((c) => c.value));

export function normalizeExpenseCategory(input) {
  const v = typeof input === "string" ? input.trim() : "";
  if (SET.has(v)) return v;
  return "other";
}
