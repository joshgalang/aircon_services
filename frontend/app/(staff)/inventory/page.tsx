"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnArrowPath,
  IconBtnMinus,
  IconBtnPencil,
  IconBtnPlus,
  IconBtnXMark,
} from "@/components/ui/ButtonIcons";
import {
  COMMON_UNITS,
  DEFAULT_INVENTORY_CATEGORY,
  INVENTORY_CATEGORY_OPTIONS,
  formatCapacityHp,
  formatWeightKg,
  inventoryCategoryLabel,
  REFRIGERANT_SUGGESTIONS,
  VOLTAGE_SUGGESTIONS,
  type InventoryCategoryValue,
} from "@/lib/inventoryPresets";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";

type InventoryLog = {
  id: number;
  type: string;
  quantity: number;
  created_at: string;
};

type Item = {
  id: number;
  branch_id: number;
  item_name: string;
  category: string | null;
  brand: string | null;
  model_number: string | null;
  part_number: string | null;
  capacity_hp: string | number | null;
  weight_kg: string | number | null;
  refrigerant: string | null;
  voltage: string | null;
  notes: string | null;
  quantity: number;
  unit: string | null;
  price: string | number | null;
  created_at: string;
  logs: InventoryLog[];
};

type CreateForm = {
  item_name: string;
  brand: string;
  model_number: string;
  part_number: string;
  capacity_hp: string;
  weight_kg: string;
  refrigerant: string;
  voltage: string;
  notes: string;
  category: InventoryCategoryValue;
  unit: string;
  quantity: string;
  price: string;
};

type StockForm = { quantity: string };

type InventoryBrandRow = { id: number; name: string; sort_order: number };

function formatPrice(p: string | number | null | undefined) {
  if (p === null || p === undefined || p === "") return "—";
  return String(p);
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [brands, setBrands] = useState<InventoryBrandRow[]>([]);
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<CreateForm>({
    defaultValues: {
      category: DEFAULT_INVENTORY_CATEGORY,
      brand: "",
      model_number: "",
      part_number: "",
      capacity_hp: "",
      weight_kg: "",
      refrigerant: "",
      voltage: "",
      notes: "",
    },
  });
  const stockForm = useForm<StockForm>();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Item[]>("/inventory");
      setRows(data);
    } catch {
      toast.error("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadBrands = useCallback(async () => {
    try {
      const { data } = await api.get<{ brands: InventoryBrandRow[] }>(
        "/inventory-brands"
      );
      setBrands(data.brands ?? []);
    } catch {
      toast.error("Failed to load brand list.");
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const inventoryRowText = useCallback(
    (r: Item) =>
      [
        r.item_name,
        r.brand,
        r.model_number,
        r.part_number,
        r.category,
        r.refrigerant,
        r.voltage,
        r.notes,
        r.unit,
        String(r.quantity),
        String(r.id),
      ]
        .filter(Boolean)
        .join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, inventoryRowText);

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Add inventory item?",
      message: `Save “${v.item_name.trim()}” to your branch stock?`,
    });
    if (!ok) return;
    try {
      await api.post("/inventory", {
        item_name: v.item_name.trim(),
        brand: v.brand.trim() || undefined,
        model_number: v.model_number.trim() || undefined,
        part_number: v.part_number.trim() || undefined,
        capacity_hp: v.capacity_hp.trim() || undefined,
        weight_kg: v.weight_kg.trim() || undefined,
        refrigerant: v.refrigerant.trim() || undefined,
        voltage: v.voltage.trim() || undefined,
        notes: v.notes.trim() || undefined,
        category: v.category,
        unit: v.unit.trim() || undefined,
        quantity: v.quantity ? Number(v.quantity) : 0,
        price: v.price || undefined,
      });
      reset();
      toast.success("Item added to inventory.");
      await load();
      await loadBrands();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not create item."));
    }
  });

  async function applyStock(id: number, type: "IN" | "OUT") {
    const q = Number(stockForm.getValues("quantity"));
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a positive quantity for stock movement.");
      return;
    }
    const item = rows.find((x) => x.id === id);
    const ok = await confirm({
      title: type === "OUT" ? "Remove stock?" : "Add stock?",
      message:
        type === "OUT"
          ? `Record ${q} unit(s) OUT for “${item?.item_name ?? "item"}”?`
          : `Record ${q} unit(s) IN for “${item?.item_name ?? "item"}”?`,
      danger: type === "OUT",
      confirmLabel: type === "OUT" ? "Remove" : "Add",
    });
    if (!ok) return;
    try {
      await api.put(`/inventory/${id}`, { movement: { type, quantity: q } });
      stockForm.reset();
      setEditing(null);
      toast.success(
        type === "IN" ? "Stock added (IN)." : "Stock removed (OUT)."
      );
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Stock update failed."));
    }
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-600">
            Branch-scoped parts and supplies for aircon work. Use consistent
            categories for reporting; log every IN/OUT so van stock matches the
            system.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
            void loadBrands();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <IconBtnArrowPath className="h-4 w-4 text-slate-500" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add item</h2>
        <p className="mt-1 text-xs text-slate-500">
          For spare parts and stocked units, set <strong className="font-medium">brand</strong>,{" "}
          <strong className="font-medium">model</strong>, and{" "}
          <strong className="font-medium">OEM part #</strong> when you have them—easier for
          warranty and re-ordering. Item name stays the main label your team searches (e.g.
          &quot;Outdoor 2.5HP R32 Daikin&quot; or &quot;PCB main indoor FTKC series&quot;).
        </p>
        <datalist id="inventory-units-common">
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <datalist id="inventory-aircon-brands">
          {brands.map((b) => (
            <option key={b.id} value={b.name} />
          ))}
        </datalist>
        <datalist id="inventory-refrigerants">
          {REFRIGERANT_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <datalist id="inventory-voltage">
          {VOLTAGE_SUGGESTIONS.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onCreate}>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-slate-700">Item name *</label>
            <input
              required
              placeholder="e.g. Outdoor unit 2HP R32, Capacitor 45µF 440V, R410A 11.3kg"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("item_name", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Brand</label>
            <input
              list="inventory-aircon-brands"
              placeholder="Type or pick from your branch list"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("brand")}
            />
            <p className="mt-1 text-xs text-slate-500">
              Manage options under{" "}
              <Link
                href="/setup/inventory-brands"
                className="font-medium text-brand-600 hover:underline"
              >
                Settings → Inventory brands
              </Link>
              . You can still type any name.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Model #</label>
            <input
              placeholder="e.g. FTKC35TV16S, CS/CU-PU9WKQ"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("model_number")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">OEM / part #</label>
            <input
              placeholder="Supplier or factory part code"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("part_number")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Capacity (HP)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="e.g. 2, 2.5"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("capacity_hp")}
            />
            <p className="mt-1 text-xs text-slate-500">Nominal HP for units &amp; assemblies.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Weight (kg)</label>
            <input
              type="number"
              step="0.001"
              min={0}
              placeholder="e.g. 11.3 cylinder, 32 outdoor"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("weight_kg")}
            />
            <p className="mt-1 text-xs text-slate-500">Net weight per piece or charge size.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Refrigerant</label>
            <input
              list="inventory-refrigerants"
              placeholder="R32, R410A…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("refrigerant")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Voltage / supply</label>
            <input
              list="inventory-voltage"
              placeholder="220V single-phase…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("voltage")}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-slate-700">Other notes</label>
            <textarea
              rows={2}
              placeholder="Bin / shelf, batch or serial notes, BTU if no HP, anything else…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("notes")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Stock category *
            </label>
            <select
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("category", { required: true })}
            >
              {INVENTORY_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} title={o.hint}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Use &quot;AC units &amp; major assemblies&quot; for new indoor/outdoor stock;
              parts and consumables fit the other groups. Refrigerant needs your own compliance
              tracking.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Initial qty</label>
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("quantity")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Unit</label>
            <input
              list="inventory-units-common"
              placeholder="Type or pick: pcs, bottle, m…"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("unit")}
            />
            <p className="mt-1 text-xs text-slate-500">
              Suggested units appear as you type; you can enter any unit.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Reference price (optional)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Cost or list price"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("price")}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              <IconBtnPlus className="h-4 w-4" />
              Add item
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search item, brand, model, part #…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {loading ? "…" : `${filteredRows.length} of ${rows.length}`}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Brand</th>
              <th className="px-3 py-2 font-medium">Model #</th>
              <th className="px-3 py-2 font-medium">Part #</th>
              <th className="px-3 py-2 font-medium">HP</th>
              <th className="px-3 py-2 font-medium">kg</th>
              <th className="px-3 py-2 font-medium">Gas</th>
              <th className="px-3 py-2 font-medium">Voltage</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Unit / price</th>
              <th className="px-3 py-2 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  No items yet.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top">
                  <td className="max-w-[14rem] px-3 py-2">
                    <div className="font-medium text-slate-900">{r.item_name}</div>
                    {r.notes && (
                      <p className="mt-1 text-xs leading-snug text-slate-500">{r.notes}</p>
                    )}
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer text-brand-600">
                        Recent logs
                      </summary>
                      <ul className="mt-1 space-y-0.5 pl-2">
                        {r.logs?.length ? (
                          r.logs.map((l) => (
                            <li key={l.id}>
                              {l.type} {l.quantity} ·{" "}
                              {new Date(l.created_at).toLocaleString()}
                            </li>
                          ))
                        ) : (
                          <li>No logs</li>
                        )}
                      </ul>
                    </details>
                  </td>
                  <td className="max-w-[7rem] px-3 py-2 text-sm text-slate-800">
                    {r.brand || "—"}
                  </td>
                  <td className="max-w-[8rem] px-3 py-2 font-mono text-xs text-slate-800">
                    {r.model_number || "—"}
                  </td>
                  <td className="max-w-[8rem] px-3 py-2 font-mono text-xs text-slate-800">
                    {r.part_number || "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-sm text-slate-800">
                    {formatCapacityHp(r.capacity_hp)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-sm text-slate-800">
                    {formatWeightKg(r.weight_kg)}
                  </td>
                  <td className="max-w-[6rem] px-3 py-2 text-xs text-slate-800">
                    {r.refrigerant || "—"}
                  </td>
                  <td className="max-w-[7rem] px-3 py-2 text-xs text-slate-700">
                    {r.voltage || "—"}
                  </td>
                  <td className="max-w-[10rem] px-3 py-2 text-xs text-slate-700">
                    {inventoryCategoryLabel(r.category)}
                  </td>
                  <td
                    className={`px-3 py-2 tabular-nums ${
                      r.quantity <= 5 ? "font-semibold text-amber-800" : "text-slate-800"
                    }`}
                  >
                    {r.quantity}
                    {r.quantity <= 5 && (
                      <span className="ml-1 text-[10px] font-normal uppercase text-amber-600">
                        low
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.unit || "—"}
                    <div className="text-xs">{formatPrice(r.price)}</div>
                  </td>
                  <td className="px-3 py-2">
                    {editing === r.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
                          {...stockForm.register("quantity")}
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => applyStock(r.id, "IN")}
                            className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                          >
                            <IconBtnPlus className="h-3 w-3" />
                            IN
                          </button>
                          <button
                            type="button"
                            onClick={() => applyStock(r.id, "OUT")}
                            className="inline-flex items-center gap-0.5 rounded bg-amber-600 px-2 py-1 text-xs text-white"
                          >
                            <IconBtnMinus className="h-3 w-3" />
                            OUT
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-xs"
                          >
                            <IconBtnXMark className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(r.id);
                          stockForm.reset({ quantity: "" });
                        }}
                        className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        <IconBtnPencil className="h-3 w-3" />
                        Adjust stock
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
