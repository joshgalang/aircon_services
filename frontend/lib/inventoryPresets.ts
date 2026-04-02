/**
 * Typical stock groupings for aircon / HVAC field service.
 * Stored as `category` on items; keep labels in sync with ops training.
 */

export type InventoryCategoryValue =
  | "equipment_units"
  | "refrigerant"
  | "filters_media"
  | "electrical"
  | "copper_piping"
  | "insulation_tapes"
  | "compressor_motor"
  | "drain_condensate"
  | "mounting_hardware"
  | "consumables"
  | "tools_ppe"
  | "other";

export const INVENTORY_CATEGORY_OPTIONS: {
  value: InventoryCategoryValue;
  label: string;
  hint?: string;
}[] = [
  {
    value: "equipment_units",
    label: "AC units & major assemblies",
    hint: "New indoor/outdoor stock, cassette shells, condensing units",
  },
  {
    value: "refrigerant",
    label: "Refrigerant & gases",
    hint: "R32, R410A, cylinders (track compliance locally)",
  },
  {
    value: "filters_media",
    label: "Filters & air media",
    hint: "Panel, HEPA-style, carbon pads",
  },
  {
    value: "electrical",
    label: "Electrical parts",
    hint: "Contactors, caps, breakers, wire",
  },
  {
    value: "copper_piping",
    label: "Copper, piping & fittings",
    hint: "Linesets, elbows, flares, valves",
  },
  {
    value: "insulation_tapes",
    label: "Insulation, tapes & sealants",
    hint: "Armaflex, foil tape, putty",
  },
  {
    value: "compressor_motor",
    label: "Compressor & fan motor",
    hint: "Spares for swap jobs",
  },
  {
    value: "drain_condensate",
    label: "Drain & condensate",
    hint: "Pumps, hose, traps",
  },
  {
    value: "mounting_hardware",
    label: "Mounting & brackets",
    hint: "Wall brackets, anchors, vibration pads",
  },
  {
    value: "consumables",
    label: "Consumables",
    hint: "Cleaner spray, fin comb, rags",
  },
  {
    value: "tools_ppe",
    label: "Tools & PPE",
    hint: "Gauges, vac pump parts, gloves",
  },
  { value: "other", label: "Other / misc" },
];

export const DEFAULT_INVENTORY_CATEGORY: InventoryCategoryValue = "other";

export function inventoryCategoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const o = INVENTORY_CATEGORY_OPTIONS.find((x) => x.value === value);
  return o?.label ?? value;
}

export function formatCapacityHp(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const s = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  return `${s} HP`;
}

export function formatWeightKg(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })} kg`;
}

/** Suggested units — use with <datalist> for faster, consistent entry. */
export const COMMON_UNITS = [
  "pcs",
  "set",
  "box",
  "bottle",
  "can",
  "kg",
  "L",
  "m",
  "roll",
  "pair",
  "kit",
] as const;

/** Suggested brands — use with <datalist>; free text allowed. */
/** Common refrigerants — datalist; free text allowed. */
export const REFRIGERANT_SUGGESTIONS = [
  "R32",
  "R410A",
  "R22",
  "R134a",
  "R404A",
  "R407C",
  "R290",
  "R600a",
  "Blend / other",
] as const;

/** Supply / equipment voltage — datalist; free text allowed. */
export const VOLTAGE_SUGGESTIONS = [
  "220V single-phase",
  "110V",
  "230V",
  "380V three-phase",
  "208V",
  "DC inverter (see model)",
  "N/A",
] as const;

/** Brand pick-list is per branch: `GET/POST /api/inventory-brands` and Settings → Inventory brands. */
