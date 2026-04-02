"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnArrowPath,
  IconBtnCheck,
  IconBtnMinus,
  IconBtnPlus,
  IconBtnTrash,
  IconBtnXMark,
} from "@/components/ui/ButtonIcons";
import {
  formatMoney,
  labelInvoiceStatus,
  labelPaymentMethod,
  PAYMENT_METHOD_OPTIONS,
} from "@/lib/accountingPresets";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";

type Payment = {
  id: number;
  amount: string | number;
  method: string;
  reference: string | null;
  paid_at: string;
};

type Invoice = {
  id: number;
  invoice_number: string;
  customer_name: string;
  contact_number: string | null;
  job_description: string | null;
  subtotal: string | number;
  tax_amount: string | number;
  total: string | number;
  status: string;
  due_date: string | null;
  issued_at: string;
  balance_due: string;
  amount_paid: string;
  payments: Payment[];
  appointment: { id: number; service_type: string } | null;
  inquiry: { id: number; customer_name: string } | null;
};

type AppointmentOpt = { id: number; customer_name: string; service_type: string };
type InquiryOpt = { id: number; customer_name: string };

type CreateForm = {
  customer_name: string;
  contact_number: string;
  appointment_id: string;
  inquiry_id: string;
  job_description: string;
  subtotal: string;
  tax_amount: string;
  due_date: string;
  status: string;
  notes: string;
};

type PayForm = { amount: string; method: string; reference: string };

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [appointments, setAppointments] = useState<AppointmentOpt[]>([]);
  const [inquiries, setInquiries] = useState<InquiryOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [payForId, setPayForId] = useState<number | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();

  const { register, handleSubmit, reset, watch } = useForm<CreateForm>({
    defaultValues: {
      status: "draft",
      tax_amount: "0",
      subtotal: "",
    },
  });
  const sub = Number(watch("subtotal") || 0);
  const tax = Number(watch("tax_amount") || 0);
  const previewTotal = (Number.isFinite(sub) ? sub : 0) + (Number.isFinite(tax) ? tax : 0);

  const payForm = useForm<PayForm>({
    defaultValues: { method: "cash", amount: "", reference: "" },
  });

  const load = useCallback(async () => {
    try {
      const [inv, ap, inq] = await Promise.all([
        api.get<Invoice[]>("/invoices"),
        api.get<AppointmentOpt[]>("/appointments"),
        api.get<InquiryOpt[]>("/inquiries"),
      ]);
      setInvoices(inv.data);
      setAppointments(ap.data);
      setInquiries(inq.data);
    } catch {
      toast.error("Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const invoiceRowText = useCallback((inv: Invoice) => {
    return [
      inv.invoice_number,
      inv.customer_name,
      inv.contact_number ?? "",
      inv.status,
      labelInvoiceStatus(inv.status),
      inv.job_description ?? "",
      String(inv.id),
    ]
      .filter(Boolean)
      .join(" ");
  }, []);
  const filteredInvoices = useFilteredRows(
    invoices,
    tableSearch,
    invoiceRowText
  );

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Create invoice?",
      message: `Save invoice for ${v.customer_name.trim()}?`,
    });
    if (!ok) return;
    try {
      const body: Record<string, unknown> = {
        customer_name: v.customer_name.trim(),
        contact_number: v.contact_number.trim() || undefined,
        job_description: v.job_description.trim() || undefined,
        subtotal: Number(v.subtotal),
        tax_amount: v.tax_amount ? Number(v.tax_amount) : 0,
        status: v.status,
        notes: v.notes.trim() || undefined,
      };
      if (v.due_date) body.due_date = v.due_date;
      if (v.appointment_id) body.appointment_id = Number(v.appointment_id);
      if (v.inquiry_id) body.inquiry_id = Number(v.inquiry_id);
      await api.post("/invoices", body);
      reset();
      setShowCreate(false);
      toast.success("Invoice created.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not create invoice."));
    }
  });

  async function sendInvoice(id: number) {
    const inv = invoices.find((i) => i.id === id);
    const ok = await confirm({
      title: "Mark invoice as sent?",
      message: inv
        ? `Customer will see ${inv.invoice_number} as billed. Continue?`
        : "Mark this invoice as sent to the customer?",
    });
    if (!ok) return;
    try {
      await api.put(`/invoices/${id}`, { status: "sent" });
      toast.success("Invoice marked as sent.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Request failed."));
    }
  }

  async function voidInvoice(id: number) {
    const ok = await confirm({
      title: "Void invoice?",
      message:
        "Only allowed if no payments are recorded. This cannot be undone from the UI.",
      danger: true,
      confirmLabel: "Void",
    });
    if (!ok) return;
    try {
      await api.put(`/invoices/${id}`, { status: "void" });
      setPayForId(null);
      toast.success("Invoice voided.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Request failed."));
    }
  }

  const onPay = payForm.handleSubmit(async (v) => {
    if (!payForId) return;
    const inv = invoices.find((i) => i.id === payForId);
    const ok = await confirm({
      title: "Record payment?",
      message: `Log ${formatMoney(Number(v.amount))} for ${
        inv?.invoice_number ?? "invoice"
      } (${inv?.customer_name ?? "customer"})?`,
    });
    if (!ok) return;
    try {
      await api.post(`/invoices/${payForId}/payments`, {
        amount: Number(v.amount),
        method: v.method,
        reference: v.reference.trim() || undefined,
      });
      payForm.reset({ method: "cash", amount: "", reference: "" });
      setPayForId(null);
      toast.success("Payment recorded.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Request failed."));
    }
  });

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & payments</h1>
          <p className="text-sm text-slate-600">
            Invoices for completed or scheduled aircon jobs. Record GCash, bank
            transfer, cash, and other tenders. Export to your accounting system
            from these totals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900"
          >
            {showCreate ? (
              <>
                <IconBtnMinus className="h-4 w-4" />
                Hide form
              </>
            ) : (
              <>
                <IconBtnPlus className="h-4 w-4" />
                New invoice
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <IconBtnArrowPath className="h-4 w-4 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {showCreate && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Create invoice</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer *</label>
              <input
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("customer_name", { required: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("contact_number")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Link appointment (optional)
              </label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("appointment_id")}
              >
                <option value="">—</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} {a.customer_name} · {a.service_type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Link inquiry (optional)
              </label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("inquiry_id")}
              >
                <option value="">—</option>
                {inquiries.map((q) => (
                  <option key={q.id} value={q.id}>
                    #{q.id} {q.customer_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Job / line description
              </label>
              <textarea
                rows={2}
                placeholder="e.g. 2HP split cleaning + gas top-up, warranty labor"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("job_description")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Subtotal *</label>
              <input
                required
                type="number"
                step="0.01"
                min={0}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("subtotal", { required: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Tax / VAT</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("tax_amount")}
              />
            </div>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <strong>Total preview:</strong> {formatMoney(previewTotal)}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("due_date")}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Initial status</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("status")}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent (bill customer)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes (internal)</label>
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
                Save invoice
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search invoice #, customer, status…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {filteredInvoices.length} of {invoices.length}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Invoice</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Balance</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <Fragment key={inv.id}>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs font-medium text-slate-900">
                      {inv.invoice_number}
                      <div className="font-sans text-xs font-normal text-slate-500">
                        {new Date(inv.issued_at).toLocaleDateString()}
                        {inv.due_date &&
                          ` · due ${new Date(inv.due_date).toLocaleDateString()}`}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{inv.customer_name}</div>
                      <div className="text-xs text-slate-500">
                        {inv.contact_number || "—"}
                        {inv.appointment && (
                          <span>
                            {" "}
                            · <Link href="/appointments" className="text-brand-600">Job #{inv.appointment.id}</Link>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(inv.total)}</td>
                    <td className="px-3 py-2 tabular-nums font-medium text-slate-900">
                      {formatMoney(inv.balance_due)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {labelInvoiceStatus(inv.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {inv.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => sendInvoice(inv.id)}
                            className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50"
                          >
                            <IconBtnCheck className="h-3 w-3" />
                            Mark sent
                          </button>
                        )}
                        {inv.status !== "void" &&
                          inv.status !== "paid" &&
                          Number(inv.balance_due) > 0.005 && (
                            <button
                              type="button"
                              onClick={() =>
                                setPayForId(payForId === inv.id ? null : inv.id)
                              }
                              className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-2 py-0.5 text-xs text-white"
                            >
                              <IconBtnPlus className="h-3 w-3" />
                              Pay
                            </button>
                          )}
                        {inv.status !== "void" &&
                          inv.payments.length === 0 &&
                          (inv.status === "draft" || inv.status === "sent") && (
                            <button
                              type="button"
                              onClick={() => voidInvoice(inv.id)}
                              className="inline-flex items-center gap-0.5 rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                            >
                              <IconBtnTrash className="h-3 w-3" />
                              Void
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                  {payForId === inv.id && (
                    <tr className="border-b border-slate-100 bg-emerald-50/40">
                      <td colSpan={6} className="px-3 py-3">
                        <form className="flex flex-wrap items-end gap-3" onSubmit={onPay}>
                          <div>
                            <label className="text-xs font-medium text-slate-600">
                              Amount
                            </label>
                            <input
                              required
                              type="number"
                              step="0.01"
                              min={0.01}
                              max={Number(inv.balance_due)}
                              className="mt-0.5 block w-28 rounded border border-slate-300 px-2 py-1 text-sm"
                              {...payForm.register("amount", { required: true })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600">
                              Method
                            </label>
                            <select
                              className="mt-0.5 block rounded border border-slate-300 px-2 py-1 text-sm"
                              {...payForm.register("method")}
                            >
                              {PAYMENT_METHOD_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-slate-600">
                              Reference
                            </label>
                            <input
                              placeholder="Ref #"
                              className="mt-0.5 block w-36 rounded border border-slate-300 px-2 py-1 text-sm"
                              {...payForm.register("reference")}
                            />
                          </div>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-sm text-white"
                          >
                            <IconBtnCheck className="h-4 w-4" />
                            Record payment
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayForId(null)}
                            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                          >
                            <IconBtnXMark className="h-4 w-4" />
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                  {inv.payments.length > 0 && (
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <td colSpan={6} className="px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium text-slate-700">Payments:</span>{" "}
                        {inv.payments.map((p) => (
                          <span key={p.id} className="mr-3 inline-block">
                            {formatMoney(p.amount)} {labelPaymentMethod(p.method)}
                            {p.reference ? ` (${p.reference})` : ""} ·{" "}
                            {new Date(p.paid_at).toLocaleString()}
                          </span>
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Tip: Use <strong>Expenses</strong> for supplier receipts and overhead; this
        page is for money <strong>in</strong> from customers. Your accountant can map
        statuses and payment methods to their chart of accounts.
      </p>
    </div>
  );
}
