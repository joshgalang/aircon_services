"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { HqOnly } from "@/components/admin/HqOnly";
import { formatMoney, labelPaymentMethod } from "@/lib/accountingPresets";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnPlay,
  IconBtnPrinter,
} from "@/components/ui/ButtonIcons";
import { useToast } from "@/providers/ToastProvider";

type Report = {
  from: string;
  to: string;
  branches: {
    branch_id: number;
    branch_name: string;
    inquiries: number;
    appointments: number;
    invoices_issued: number;
    collections: string;
    expenses: string;
    cashbook_in: string;
    cashbook_out: string;
  }[];
  totals: {
    inquiries: number;
    appointments: number;
    invoices_issued: number;
    collections: string;
    expenses: string;
    cashbook_in: string;
    cashbook_out: string;
  };
  detail_lines: {
    source: string;
    id: number;
    branch_name: string;
    at: string;
    amount: number | null;
    direction: string | null;
    method: string | null;
    reference: string | null;
    counterparty: string | null;
    description: string;
  }[];
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

export default function ReportsPage() {
  const initial = useMemo(() => monthRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [detailSearch, setDetailSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params: Record<string, string | number> = { from, to, detail_limit: 60 };
      if (branchId) params.branch_id = Number(branchId);
      const { data: res } = await api.get<Report>("/hq/report", { params });
      setData(res);
    } catch {
      setError("Could not build report.");
    } finally {
      setLoading(false);
    }
  }, [from, to, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const branchRowText = useCallback(
    (b: Report["branches"][number]) =>
      [b.branch_name, String(b.branch_id), String(b.inquiries), String(b.appointments)].join(
        " "
      ),
    []
  );
  const filteredBranches = useFilteredRows(
    data?.branches ?? [],
    branchSearch,
    branchRowText
  );

  const detailText = useCallback(
    (r: Report["detail_lines"][number]) =>
      [
        r.branch_name,
        r.source,
        r.counterparty,
        r.description,
        r.method,
        r.amount != null ? String(r.amount) : "",
      ]
        .filter(Boolean)
        .join(" "),
    []
  );
  const filteredDetailLines = useFilteredRows(
    data?.detail_lines ?? [],
    detailSearch,
    detailText
  );

  async function printReport() {
    const ok = await confirm({
      title: "Print report?",
      message: "Open the browser print dialog for this page?",
    });
    if (!ok) return;
    window.print();
  }

  return (
    <HqOnly>
      <div className="space-y-6 print:space-y-4">
        {confirmDialog}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Consolidated report</h1>
            <p className="text-sm text-slate-600">
              Print or save as PDF from your browser for compliance and accounting
              reviews.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-slate-600">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Branch ID</label>
              <input
                type="number"
                placeholder="All"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-1 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              <IconBtnPlay className="h-4 w-4" />
              Run
            </button>
            <button
              type="button"
              onClick={() => printReport()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              <IconBtnPrinter className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {loading && <p className="text-slate-500 print:hidden">Building report…</p>}

        {data && !loading && (
          <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
            <header className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Operations &amp; cash summary
              </h2>
              <p className="text-sm text-slate-600">
                {new Date(data.from).toLocaleDateString()} —{" "}
                {new Date(data.to).toLocaleDateString()}
                {branchId ? ` · Branch ${branchId}` : " · All branches"}
              </p>
            </header>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800">Totals</h3>
              <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <li>Inquiries: {data.totals.inquiries}</li>
                <li>Appointments (in range): {data.totals.appointments}</li>
                <li>Invoices issued: {data.totals.invoices_issued}</li>
                <li>Collections: {formatMoney(data.totals.collections)}</li>
                <li>Expenses: {formatMoney(data.totals.expenses)}</li>
                <li>Cashbook in: {formatMoney(data.totals.cashbook_in)}</li>
                <li>Cashbook out: {formatMoney(data.totals.cashbook_out)}</li>
              </ul>
            </section>

            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">By branch</h3>
                <TableSearchInput
                  value={branchSearch}
                  onChange={setBranchSearch}
                  placeholder="Search branches…"
                  className="max-w-xs print:hidden"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 print:hidden">
                Showing {filteredBranches.length} of {data.branches.length}
              </p>
              <table className="mt-2 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-2 pr-2">Branch</th>
                    <th className="py-2 pr-2">Inq</th>
                    <th className="py-2 pr-2">Appt</th>
                    <th className="py-2 pr-2">Inv</th>
                    <th className="py-2 pr-2">Collect</th>
                    <th className="py-2 pr-2">Exp</th>
                    <th className="py-2">CB in/out</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 print:hidden">
                        No branches match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((b) => (
                      <tr key={b.branch_id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-medium">{b.branch_name}</td>
                        <td className="py-2 pr-2 tabular-nums">{b.inquiries}</td>
                        <td className="py-2 pr-2 tabular-nums">{b.appointments}</td>
                        <td className="py-2 pr-2 tabular-nums">{b.invoices_issued}</td>
                        <td className="py-2 pr-2 tabular-nums">
                          {formatMoney(b.collections)}
                        </td>
                        <td className="py-2 pr-2 tabular-nums">
                          {formatMoney(b.expenses)}
                        </td>
                        <td className="py-2 tabular-nums text-xs">
                          {formatMoney(b.cashbook_in)} / {formatMoney(b.cashbook_out)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="mt-10 break-inside-avoid">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">
                  Recent cash &amp; ledger lines (sample)
                </h3>
                <TableSearchInput
                  value={detailSearch}
                  onChange={setDetailSearch}
                  placeholder="Search detail lines…"
                  className="max-w-xs print:hidden"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 print:hidden">
                Showing {filteredDetailLines.length} of {data.detail_lines.length}
              </p>
              <table className="mt-2 w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600">
                    <th className="py-1 pr-2">When</th>
                    <th className="py-1 pr-2">Branch</th>
                    <th className="py-1 pr-2">Type</th>
                    <th className="py-1 pr-2">Party</th>
                    <th className="py-1 pr-2">Detail</th>
                    <th className="py-1">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 print:hidden">
                        No lines match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredDetailLines.slice(0, 40).map((r, i) => (
                      <tr key={`${r.source}-${r.id}-${i}`} className="border-b border-slate-50">
                        <td className="py-1 pr-2 whitespace-nowrap">
                          {new Date(r.at).toLocaleString()}
                        </td>
                        <td className="py-1 pr-2">{r.branch_name}</td>
                        <td className="py-1 pr-2">{r.source}</td>
                        <td className="py-1 pr-2">{r.counterparty || "—"}</td>
                        <td className="py-1 pr-2 max-w-[14rem] truncate">{r.description}</td>
                        <td className="py-1 tabular-nums">
                          {r.amount != null
                            ? `${r.direction === "out" ? "-" : ""}${formatMoney(r.amount)}`
                            : "—"}
                          {r.method && (
                            <div className="text-slate-500">
                              {labelPaymentMethod(r.method)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>
    </HqOnly>
  );
}
