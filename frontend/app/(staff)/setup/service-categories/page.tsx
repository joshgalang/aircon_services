"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { DEFAULT_SERVICE_CATEGORY } from "@/lib/serviceCategories";
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
  slug: string;
  label: string;
  sort_order: number;
};

type AddForm = {
  label: string;
  slug: string;
  sort_order: string;
};

export default function ServiceCategoriesSetupPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<AddForm>({
    defaultValues: { label: "", slug: "", sort_order: "" },
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ categories: Row[] }>("/service-categories");
      setRows(data.categories ?? []);
    } catch {
      toast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryRowText = useCallback(
    (r: Row) => [r.label, r.slug, String(r.sort_order), String(r.id)].join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, categoryRowText);

  const onAdd = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Add category?",
      message: `Save “${v.label.trim()}” as a new service category?`,
    });
    if (!ok) return;
    try {
      await api.post("/service-categories", {
        label: v.label.trim(),
        slug: v.slug.trim() || undefined,
        sort_order: v.sort_order.trim() ? Number(v.sort_order) : undefined,
      });
      reset();
      toast.success("Category added.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not add category."));
    }
  });

  async function saveRow(id: number, patch: { label?: string; sort_order?: number }) {
    const ok = await confirm({
      title: "Save changes?",
      message: "Update this category’s label or sort order?",
    });
    if (!ok) return;
    try {
      await api.put(`/service-categories/${id}`, patch);
      toast.success("Category updated.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Update failed."));
    }
  }

  async function removeRow(id: number, slug: string) {
    if (slug === DEFAULT_SERVICE_CATEGORY) return;
    const ok = await confirm({
      title: "Remove category?",
      message:
        "Remove this category from the list? Past inquiries keep the stored code.",
      danger: true,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await api.delete(`/service-categories/${id}`);
      toast.success("Category removed.");
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
          <Link href="/inquiries" className="text-brand-600 hover:underline">
            Inquiries
          </Link>
          {" · "}
          <Link href="/appointments" className="text-brand-600 hover:underline">
            Appointments
          </Link>
          {" "}
          use these options.
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Service categories</h1>
        <p className="text-sm text-slate-600">
          Define the job types your team selects on inquiries and appointments. The
          stored code (slug) should stay stable; change the label for wording updates.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add category</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={onAdd}>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Label *</label>
            <input
              required
              placeholder="e.g. Ducted service"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("label", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Slug (optional)</label>
            <input
              placeholder="auto from label"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              {...register("slug")}
            />
            <p className="mt-1 text-xs text-slate-500">Lowercase, letters, numbers, _</p>
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
          <div className="sm:col-span-2 lg:col-span-4">
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
            placeholder="Search label or slug…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {filteredRows.length} of {rows.length}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Slug (code)</th>
              <th className="px-3 py-2 font-medium">Sort</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  No categories.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <CategoryEditorRow
                  key={r.id}
                  row={r}
                  onSave={saveRow}
                  onDelete={() => removeRow(r.id, r.slug)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryEditorRow({
  row,
  onSave,
  onDelete,
}: {
  row: Row;
  onSave: (id: number, patch: { label?: string; sort_order?: number }) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [sort, setSort] = useState(String(row.sort_order));

  useEffect(() => {
    setLabel(row.label);
    setSort(String(row.sort_order));
  }, [row.label, row.sort_order]);

  const dirty =
    label.trim() !== row.label || Number(sort) !== row.sort_order;

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-3 py-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full min-w-[12rem] rounded-md border border-slate-200 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-3 py-2 font-mono text-xs text-slate-700">{row.slug}</td>
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
            disabled={!dirty}
            onClick={() =>
              onSave(row.id, {
                label: label.trim(),
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
            disabled={row.slug === DEFAULT_SERVICE_CATEGORY}
            onClick={onDelete}
            className="inline-flex items-center gap-0.5 rounded border border-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
          >
            <IconBtnTrash className="h-3 w-3" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
