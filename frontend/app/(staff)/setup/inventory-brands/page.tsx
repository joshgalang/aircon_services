"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnCheck,
  IconBtnPlus,
  IconBtnTrash,
} from "@/components/ui/ButtonIcons";

type Row = {
  id: number;
  name: string;
  sort_order: number;
};

type AddForm = {
  name: string;
  sort_order: string;
};

export default function InventoryBrandsSetupPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<AddForm>({
    defaultValues: { name: "", sort_order: "" },
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ brands: Row[] }>("/inventory-brands");
      setRows(data.brands ?? []);
    } catch {
      toast.error("Failed to load inventory brands.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const rowText = useCallback(
    (r: Row) => [r.name, String(r.sort_order), String(r.id)].join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, rowText);

  const onAdd = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Add brand?",
      message: `Save “${v.name.trim()}” to your branch brand list?`,
    });
    if (!ok) return;
    try {
      await api.post("/inventory-brands", {
        name: v.name.trim(),
        sort_order: v.sort_order.trim() ? Number(v.sort_order) : undefined,
      });
      reset();
      toast.success("Brand added.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not add brand."));
    }
  });

  async function saveRow(id: number, patch: { name?: string; sort_order?: number }) {
    const ok = await confirm({
      title: "Save changes?",
      message: "Update this brand name or sort order?",
    });
    if (!ok) return;
    try {
      await api.put(`/inventory-brands/${id}`, patch);
      toast.success("Brand updated.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Update failed."));
    }
  }

  async function removeRow(id: number, name: string) {
    const ok = await confirm({
      title: "Remove brand?",
      message: `Remove “${name}” from the pick list? Existing inventory rows keep their stored text.`,
      danger: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await api.delete(`/inventory-brands/${id}`);
      toast.success("Brand removed.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Delete failed."));
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      <div>
        <p className="text-sm text-slate-500">
          <Link href="/inventory" className="text-brand-600 hover:underline">
            Inventory
          </Link>{" "}
          uses this list for the brand field (datalist suggestions).
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Inventory brands</h1>
        <p className="text-sm text-slate-600">
          Manage brand names per branch. Staff can still type any brand; this list
          speeds up consistent spelling. New branches start from a default set you
          can edit here.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add brand</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onAdd}>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Brand name *</label>
            <input
              required
              placeholder="e.g. Gree, Toshiba"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("name", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Sort #</label>
            <input
              type="number"
              placeholder="append"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("sort_order")}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              <IconBtnPlus className="h-4 w-4" />
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search brand name…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {filteredRows.length} of {rows.length}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Brand name</th>
              <th className="px-3 py-2 font-medium">Sort</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                  No brands.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <BrandEditorRow
                  key={r.id}
                  row={r}
                  onSave={saveRow}
                  onDelete={() => removeRow(r.id, r.name)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandEditorRow({
  row,
  onSave,
  onDelete,
}: {
  row: Row;
  onSave: (id: number, patch: { name?: string; sort_order?: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(row.name);
  const [sort, setSort] = useState(String(row.sort_order));

  useEffect(() => {
    setName(row.name);
    setSort(String(row.sort_order));
  }, [row.name, row.sort_order]);

  const dirty =
    name.trim() !== row.name || Number(sort) !== row.sort_order;

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-3 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full min-w-[12rem] rounded-md border border-slate-200 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!dirty || !name.trim()}
            onClick={() =>
              onSave(row.id, {
                name: name.trim(),
                sort_order: Number(sort),
              })
            }
            className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
          >
            <IconBtnCheck className="h-3 w-3" />
            Save
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-0.5 rounded border border-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
          >
            <IconBtnTrash className="h-3 w-3" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
