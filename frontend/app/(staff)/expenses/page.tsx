"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import { IconBtnArrowPath, IconBtnCheck } from "@/components/ui/ButtonIcons";
import {
  EXPENSE_CATEGORY_OPTIONS,
  formatMoney,
  labelExpenseCategory,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/accountingPresets";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";

type Expense = {
  id: number;
  category: string;
  description: string;
  amount: string | number;
  vendor: string | null;
  expense_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
};

type CreateForm = {
  category: string;
  description: string;
  amount: string;
  vendor: string;
  expense_date: string;
  payment_method: string;
  reference: string;
  notes: string;
};

export default function ExpensesPage() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<CreateForm>({
    defaultValues: { category: "other", payment_method: "cash" },
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Expense[]>("/expenses");
      setRows(data);
    } catch {
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const expenseRowText = useCallback(
    (r: Expense) =>
      [
        r.category,
        labelExpenseCategory(r.category),
        r.description,
        r.vendor,
        r.reference,
        r.notes,
        String(r.amount),
        String(r.id),
      ]
        .filter(Boolean)
        .join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, expenseRowText);

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Save expense?",
      message: `Log ${formatMoney(Number(v.amount))} — ${v.description.trim().slice(0, 80)}${v.description.trim().length > 80 ? "…" : ""}?`,
    });
    if (!ok) return;
    try {
      await api.post("/expenses", {
        category: v.category,
        description: v.description.trim(),
        amount: Number(v.amount),
        vendor: v.vendor.trim() || undefined,
        expense_date: v.expense_date || undefined,
        payment_method: v.payment_method || undefined,
        reference: v.reference.trim() || undefined,
        notes: v.notes.trim() || undefined,
      });
      reset({ category: "other", payment_method: "cash" });
      toast.success("Expense saved.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not save expense."));
    }
  });

  const monthTotal = rows
    .filter((r) => {
      const d = new Date(r.expense_date);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    })
    .reduce((s, r) => s + Number(r.amount), 0);

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
        <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
        <p className="text-sm text-slate-600">
          Operating costs for your aircon business: gas, parts buys, rent,
          refrigerant purchases, and subs. Categorize consistently for P&amp;L and
          tax prep.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-800">
          This month (running total):{" "}
          <span className="tabular-nums text-brand-700">
            {formatMoney(monthTotal)}
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Log expense</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <div>
            <label className="text-sm font-medium text-slate-700">Category *</label>
            <select
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("category", { required: true })}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Amount *</label>
            <input
              required
              type="number"
              step="0.01"
              min={0.01}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("amount", { required: true })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description *</label>
            <textarea
              required
              rows={2}
              placeholder="e.g. R410A refill from supplier X, March van fuel"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("description", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Vendor / payee</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("vendor")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("expense_date")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Paid how</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("payment_method")}
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Reference</label>
            <input
              placeholder="OR, receipt #"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("reference")}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("notes")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              <IconBtnCheck className="h-4 w-4" />
              Save expense
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <h2 className="font-semibold text-slate-900">History</h2>
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search description, vendor, category…"
            className="ml-auto max-w-xs"
          />
          <span className="text-xs text-slate-500">
            {filteredRows.length} of {rows.length}
          </span>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            <IconBtnArrowPath className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Vendor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No expenses logged.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(r.expense_date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {labelExpenseCategory(r.category)}
                  </td>
                  <td className="max-w-xs px-3 py-2 text-slate-800">
                    {r.description}
                    {r.reference && (
                      <div className="text-xs text-slate-500">Ref: {r.reference}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {formatMoney(r.amount)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.vendor || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
