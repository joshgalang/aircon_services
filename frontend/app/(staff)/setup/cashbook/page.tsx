"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnArrowPath,
  IconBtnCheck,
} from "@/components/ui/ButtonIcons";
import {
  formatMoney,
  labelPaymentMethod,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/accountingPresets";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { datetimeLocalValueToUtcIso } from "@/lib/datetimeLocal";
import { useToast } from "@/providers/ToastProvider";

type Branch = { id: number; branch_name: string };

type LedgerRow = {
  id: number;
  branch_id: number;
  direction: string;
  amount: string | number;
  method: string;
  reference: string | null;
  counterparty_name: string | null;
  purpose: string;
  paid_at: string;
  notes: string | null;
  branch: { branch_name: string };
};

type Form = {
  branch_id: string;
  direction: "in" | "out";
  amount: string;
  method: string;
  reference: string;
  counterparty_name: string;
  purpose: string;
  paid_at: string;
  notes: string;
};

export default function CashbookPage() {
  const { user } = useAuth();
  const isHq = user?.role === "hq";
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<Form>({
    defaultValues: {
      branch_id: "",
      direction: "in",
      method: "cash",
      amount: "",
      reference: "",
      counterparty_name: "",
      purpose: "",
      paid_at: "",
      notes: "",
    },
  });

  const loadBranches = useCallback(async () => {
    if (!isHq) return;
    try {
      const { data } = await api.get<Branch[]>("/hq/branches");
      setBranches(data);
    } catch {
      setBranches([]);
    }
  }, [isHq]);

  const loadLedger = useCallback(async () => {
    try {
      const { data } = await api.get<LedgerRow[]>("/ledger", {
        params: { limit: 150 },
      });
      setRows(data);
    } catch {
      toast.error("Failed to load cashbook.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const ledgerRowText = useCallback(
    (r: LedgerRow) =>
      [
        r.branch.branch_name,
        r.direction,
        String(r.amount),
        r.method,
        labelPaymentMethod(r.method),
        r.counterparty_name,
        r.purpose,
        r.reference,
        r.notes,
        String(r.id),
      ]
        .filter(Boolean)
        .join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, ledgerRowText);

  const onSave = handleSubmit(async (v) => {
    const amt = Number(v.amount);
    const ok = await confirm({
      title: "Save cashbook entry?",
      message: `Record ${formatMoney(amt)} ${v.direction === "in" ? "IN" : "OUT"} — ${v.purpose.trim().slice(0, 60)}?`,
      danger: v.direction === "out",
    });
    if (!ok) return;
    try {
      let paidAtIso: string | undefined;
      if (v.paid_at?.trim()) {
        try {
          paidAtIso = datetimeLocalValueToUtcIso(v.paid_at);
        } catch {
          toast.error("Invalid date/time.");
          return;
        }
      }
      const body: Record<string, unknown> = {
        direction: v.direction,
        amount: Number(v.amount),
        method: v.method,
        purpose: v.purpose.trim(),
        reference: v.reference.trim() || undefined,
        counterparty_name: v.counterparty_name.trim() || undefined,
        notes: v.notes.trim() || undefined,
        paid_at: paidAtIso,
      };
      if (isHq) {
        if (!v.branch_id) {
          toast.error("Choose a branch.");
          return;
        }
        body.branch_id = Number(v.branch_id);
      }
      await api.post("/ledger", body);
      reset({
        branch_id: "",
        direction: "in",
        method: "cash",
        amount: "",
        reference: "",
        counterparty_name: "",
        purpose: "",
        paid_at: "",
        notes: "",
      });
      toast.success("Cashbook entry saved.");
      await loadLedger();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not save entry."));
    }
  });

  return (
    <div className="space-y-8">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cashbook</h1>
        <p className="text-sm text-slate-600">
          Record money in or out that is not tied to a customer invoice—petty cash,
          inter-branch transfers, owner draws, or other KYC-relevant movements. Invoice
          collections still belong under{" "}
          <a href="/billing" className="text-brand-600 hover:underline">
            Billing
          </a>
          .
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">New entry</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={onSave}
        >
          {isHq && (
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium text-slate-700">Branch *</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("branch_id")}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Direction *</label>
            <select
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("direction", { required: true })}
            >
              <option value="in">Money in</option>
              <option value="out">Money out</option>
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
          <div>
            <label className="text-sm font-medium text-slate-700">Method *</label>
            <select
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("method", { required: true })}
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">Purpose *</label>
            <input
              required
              placeholder="e.g. Owner advance, Bank transfer from HQ, Petty cash top-up"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("purpose", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Counterparty (KYC)
            </label>
            <input
              placeholder="Person or company name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("counterparty_name")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Reference</label>
            <input
              placeholder="OR / ref #"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("reference")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("paid_at")}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("notes")}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={isHq && branches.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
            >
              <IconBtnCheck className="h-4 w-4" />
              Save entry
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
          <h2 className="font-semibold text-slate-900">Recent entries</h2>
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search branch, purpose, amount…"
            className="ml-auto max-w-xs"
          />
          <span className="text-xs text-slate-500">
            {loading ? "…" : `${filteredRows.length} of ${rows.length}`}
          </span>
          <button
            type="button"
            onClick={() => loadLedger()}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            <IconBtnArrowPath className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Dir</th>
              <th className="px-3 py-2 font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Method</th>
              <th className="px-3 py-2 font-medium">Counterparty</th>
              <th className="px-3 py-2 font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No cashbook entries yet.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {new Date(r.paid_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.branch.branch_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.direction === "in"
                          ? "text-emerald-700"
                          : "text-amber-800"
                      }
                    >
                      {r.direction === "in" ? "In" : "Out"}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {formatMoney(r.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {labelPaymentMethod(r.method)}
                  </td>
                  <td className="max-w-[8rem] px-3 py-2 text-xs text-slate-700">
                    {r.counterparty_name || "—"}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-slate-700">
                    {r.purpose}
                    {r.reference && (
                      <div className="text-xs text-slate-500">Ref: {r.reference}</div>
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
