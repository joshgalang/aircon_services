/** Labels for billing & expenses (keep aligned with backend constants). */

export const INVOICE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent / unpaid" },
  { value: "partial", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
] as const;

export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
] as const;

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "refrigerant_supply", label: "Refrigerant & cylinder refills" },
  { value: "parts_inventory", label: "Parts & inventory purchases" },
  { value: "fuel_vehicle", label: "Fuel & vehicle running" },
  { value: "payroll_labor", label: "Payroll & technician labor" },
  { value: "rent_facility", label: "Rent & warehouse" },
  { value: "utilities", label: "Utilities" },
  { value: "tools_equipment", label: "Tools & equipment" },
  { value: "permits_licenses", label: "Permits & licenses" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "insurance", label: "Insurance" },
  { value: "marketing", label: "Marketing" },
  { value: "office_admin", label: "Office & admin" },
  { value: "other", label: "Other" },
] as const;

export function labelInvoiceStatus(v: string): string {
  return INVOICE_STATUS_OPTIONS.find((x) => x.value === v)?.label ?? v;
}

export function labelPaymentMethod(v: string): string {
  return PAYMENT_METHOD_OPTIONS.find((x) => x.value === v)?.label ?? v;
}

export function labelExpenseCategory(v: string): string {
  return EXPENSE_CATEGORY_OPTIONS.find((x) => x.value === v)?.label ?? v;
}

export function formatMoney(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
