"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { HqOnly } from "@/components/admin/HqOnly";
import { formatMoney } from "@/lib/accountingPresets";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import { IconBtnPlay } from "@/components/ui/ButtonIcons";
import { useToast } from "@/providers/ToastProvider";

type Branch = {
  id: number;
  branch_name: string;
  address: string | null;
};

type Summary = {
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

export default function HqOverviewPage() {
  const initial = useMemo(() => monthRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get<Branch[]>("/hq/branches"),
        api.get<Summary>("/hq/summary", { params: { from, to } }),
      ]);
      setBranches(bRes.data);
      setSummary(sRes.data);
    } catch {
      setError("Could not load HQ data.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const branchText = useCallback(
    (b: Branch) => [String(b.id), b.branch_name, b.address ?? ""].filter(Boolean).join(" "),
    []
  );
  const filteredBranches = useFilteredRows(branches, branchSearch, branchText);

  return (
    <HqOnly>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Multi-branch HQ</h1>
          <p className="text-sm text-slate-600">
            Snapshot across all branches for the selected period. Configure locations
            under{" "}
            <a href="/setup/branches" className="text-brand-600 hover:underline">
              Branches
            </a>{" "}
            and staff under{" "}
            <a href="/setup/users" className="text-brand-600 hover:underline">
              Users
            </a>
            . Use{" "}
            <a href="/setup/activity" className="text-brand-600 hover:underline">
              All activity
            </a>{" "}
            for a KYC-style trail and{" "}
            <a href="/setup/reports" className="text-brand-600 hover:underline">
              Reports
            </a>{" "}
            for a printable summary.
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
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            <IconBtnPlay className="h-4 w-4" />
            Apply
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Branches</h2>
            <TableSearchInput
              value={branchSearch}
              onChange={setBranchSearch}
              placeholder="Search branches…"
              className="max-w-xs"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {filteredBranches.length} of {branches.length} shown
          </p>
          {loading ? (
            <p className="mt-4 text-slate-500">Loading…</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {filteredBranches.length === 0 ? (
                <li className="py-4 text-center text-slate-500">
                  No branches match your search.
                </li>
              ) : (
                filteredBranches.map((b) => (
                  <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium text-slate-900">{b.branch_name}</span>
                    <span className="text-xs text-slate-500">ID {b.id}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {summary && !loading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat title="Inquiries (period)" value={String(summary.totals.inquiries)} />
              <Stat
                title="Appointments (scheduled)"
                value={String(summary.totals.appointments)}
              />
              <Stat
                title="Invoices issued"
                value={String(summary.totals.invoices_issued)}
              />
              <Stat
                title="Collections (payments)"
                value={formatMoney(summary.totals.collections)}
              />
              <Stat title="Expenses" value={formatMoney(summary.totals.expenses)} />
              <Stat
                title="Cashbook in"
                value={formatMoney(summary.totals.cashbook_in)}
              />
              <Stat
                title="Cashbook out"
                value={formatMoney(summary.totals.cashbook_out)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Branch</th>
                    <th className="px-3 py-2 font-medium">Inq</th>
                    <th className="px-3 py-2 font-medium">Appt</th>
                    <th className="px-3 py-2 font-medium">Inv</th>
                    <th className="px-3 py-2 font-medium">Collect</th>
                    <th className="px-3 py-2 font-medium">Exp</th>
                    <th className="px-3 py-2 font-medium">CB in</th>
                    <th className="px-3 py-2 font-medium">CB out</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.branches.map((r) => (
                    <tr key={r.branch_id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {r.branch_name}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.inquiries}</td>
                      <td className="px-3 py-2 tabular-nums">{r.appointments}</td>
                      <td className="px-3 py-2 tabular-nums">{r.invoices_issued}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMoney(r.collections)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMoney(r.expenses)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-emerald-800">
                        {formatMoney(r.cashbook_in)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-amber-800">
                        {formatMoney(r.cashbook_out)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </HqOnly>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
