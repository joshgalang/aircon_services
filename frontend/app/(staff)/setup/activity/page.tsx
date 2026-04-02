"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { HqOnly } from "@/components/admin/HqOnly";
import { formatMoney, labelPaymentMethod } from "@/lib/accountingPresets";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import { IconBtnPlay } from "@/components/ui/ButtonIcons";
import { useToast } from "@/providers/ToastProvider";

type Line = {
  source: string;
  id: number;
  branch_id: number;
  branch_name: string;
  at: string;
  amount: number | null;
  direction: string | null;
  method: string | null;
  reference: string | null;
  counterparty: string | null;
  description: string;
};

function monthRange() {
  const n = new Date();
  const from = new Date(n.getFullYear(), n.getMonth(), 1);
  const to = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function sourceLabel(s: string) {
  const m: Record<string, string> = {
    invoice_payment: "Invoice payment",
    expense: "Expense",
    cashbook_in: "Cashbook in",
    cashbook_out: "Cashbook out",
    inquiry: "Inquiry",
    appointment: "Appointment",
  };
  return m[s] ?? s;
}

export default function ActivityPage() {
  const initial = useMemo(() => monthRange(), []);
  const toast = useToast();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [branchId, setBranchId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { from, to, limit: 250 };
      if (branchId) params.branch_id = Number(branchId);
      const { data } = await api.get<{ lines: Line[] }>("/hq/activity", { params });
      setLines(data.lines ?? []);
    } catch {
      toast.error("Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const lineText = useCallback(
    (r: Line) =>
      [
        r.branch_name,
        sourceLabel(r.source),
        r.source,
        r.counterparty,
        r.description,
        r.reference,
        r.method,
        r.direction,
        r.amount != null ? String(r.amount) : "",
      ]
        .filter(Boolean)
        .join(" "),
    []
  );
  const filteredLines = useFilteredRows(lines, tableSearch, lineText);

  return (
    <HqOnly>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All activity</h1>
          <p className="text-sm text-slate-600">
            Unified timeline across branches: customer payments, expenses, cashbook
            entries, inquiries, and appointments—useful for KYC reviews and audits.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="text-xs font-medium text-slate-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Branch</label>
            <input
              type="number"
              min={1}
              placeholder="All"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="mt-1 w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            <IconBtnPlay className="h-4 w-4" />
            Apply
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
            <TableSearchInput
              value={tableSearch}
              onChange={setTableSearch}
              placeholder="Filter loaded rows…"
              className="max-w-md"
            />
            <span className="text-xs text-slate-500">
              {loading ? "…" : `${filteredLines.length} of ${lines.length}`}
            </span>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Counterparty</th>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="px-3 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No rows in this range.
                  </td>
                </tr>
              ) : filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                filteredLines.map((r, i) => (
                  <tr key={`${r.source}-${r.id}-${i}`} className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {new Date(r.at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-800">{r.branch_name}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {sourceLabel(r.source)}
                      {r.method && (
                        <div className="text-slate-500">
                          {labelPaymentMethod(r.method)}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[10rem] px-3 py-2 text-xs">
                      {r.counterparty || "—"}
                    </td>
                    <td className="max-w-[18rem] px-3 py-2 text-slate-700">
                      {r.description}
                      {r.reference && (
                        <div className="text-xs text-slate-500">Ref: {r.reference}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                      {r.amount != null ? (
                        <span
                          className={
                            r.direction === "out"
                              ? "text-amber-800"
                              : r.direction === "in"
                                ? "text-emerald-800"
                                : ""
                          }
                        >
                          {r.direction === "out" ? "−" : r.direction === "in" ? "+" : ""}
                          {formatMoney(r.amount)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </HqOnly>
  );
}
