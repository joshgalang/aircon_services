"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { DEFAULT_SERVICE_CATEGORY } from "@/lib/serviceCategories";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnArrowPath,
  IconBtnCheck,
} from "@/components/ui/ButtonIcons";
import {
  formatPhilippinePhoneDisplay,
  normalizePhilippinePhone,
} from "@/lib/phPhone";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import {
  datetimeLocalValueToUtcIso,
  formatScheduledDateTimeForDisplay,
} from "@/lib/datetimeLocal";
import { useToast } from "@/providers/ToastProvider";

type Inquiry = {
  id: number;
  customer_name: string;
  contact_number: string;
  service_category: string;
};
type Appointment = {
  id: number;
  branch_id: number;
  inquiry_id: number | null;
  customer_name: string;
  contact_number: string;
  service_category: string;
  service_type: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  inquiry: { id: number; customer_name: string } | null;
};

const STATUSES = ["pending", "ongoing", "completed", "cancelled"] as const;

type CreateForm = {
  customer_name: string;
  contact_number: string;
  service_category: string;
  service_type: string;
  scheduled_date: string;
  notes: string;
  inquiry_id: string;
};

export default function AppointmentsPage() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const {
    options: categoryOptions,
    defaultSlug,
    loading: categoriesLoading,
    labelFor,
  } = useServiceCategories();
  const { register, handleSubmit, reset, setValue, watch, getValues } =
    useForm<CreateForm>({
    defaultValues: {
      inquiry_id: "",
      service_category: DEFAULT_SERVICE_CATEGORY,
      customer_name: "",
      contact_number: "",
      service_type: "",
      scheduled_date: "",
      notes: "",
    },
  });
  const linkedInquiryId = watch("inquiry_id");

  const load = useCallback(async () => {
    try {
      const [apRes, inqRes] = await Promise.all([
        api.get<Appointment[]>("/appointments"),
        api.get<Inquiry[]>("/inquiries"),
      ]);
      setRows(apRes.data);
      setInquiries(inqRes.data);
    } catch {
      toast.error("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const appointmentRowText = useCallback(
    (r: Appointment) =>
      [
        r.customer_name,
        r.contact_number,
        r.service_type,
        r.status,
        r.service_category,
        labelFor(r.service_category),
        r.notes,
        String(r.id),
        r.inquiry ? `inquiry ${r.inquiry.id}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    [labelFor]
  );
  const filteredRows = useFilteredRows(rows, tableSearch, appointmentRowText);

  useEffect(() => {
    if (!linkedInquiryId) return;
    const q = inquiries.find((x) => String(x.id) === linkedInquiryId);
    if (!q) return;
    if (q.service_category) {
      setValue("service_category", q.service_category);
    }
    setValue("customer_name", q.customer_name ?? "");
    const disp = formatPhilippinePhoneDisplay(q.contact_number);
    setValue("contact_number", disp === "—" ? (q.contact_number ?? "") : disp);
  }, [linkedInquiryId, inquiries, setValue]);

  useEffect(() => {
    if (categoriesLoading || categoryOptions.length === 0) return;
    const cur = getValues("service_category");
    if (!categoryOptions.some((o) => o.value === cur)) {
      setValue("service_category", defaultSlug);
    }
  }, [
    categoriesLoading,
    categoryOptions,
    defaultSlug,
    getValues,
    setValue,
  ]);

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Create appointment?",
      message: "Save this job to the schedule for your branch?",
    });
    if (!ok) return;
    const phone = normalizePhilippinePhone(v.contact_number);
    if (!phone.ok) {
      toast.error(phone.error);
      return;
    }
    try {
      let scheduledIso: string;
      try {
        scheduledIso = datetimeLocalValueToUtcIso(v.scheduled_date);
      } catch {
        toast.error("Invalid scheduled date.");
        return;
      }
      const body: Record<string, unknown> = {
        customer_name: v.customer_name,
        contact_number: phone.e164,
        service_type: v.service_type,
        scheduled_date: scheduledIso,
        notes: v.notes || undefined,
        service_category: v.service_category,
      };
      if (v.inquiry_id) body.inquiry_id = Number(v.inquiry_id);
      await api.post("/appointments", body);
      reset({
        inquiry_id: "",
        service_category: defaultSlug,
        customer_name: "",
        contact_number: "",
        service_type: "",
        scheduled_date: "",
        notes: "",
      });
      toast.success("Appointment created.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not create appointment."));
    }
  });

  async function setStatus(id: number, status: string) {
    const row = rows.find((x) => x.id === id);
    const ok = await confirm({
      title: "Update appointment status?",
      message: `Set job #${id}${row ? ` (${row.customer_name})` : ""} to “${status}”?`,
    });
    if (!ok) return;
    try {
      await api.put(`/appointments/${id}`, { status });
      toast.success("Appointment status updated.");
      await load();
    } catch {
      toast.error("Could not update status.");
    }
  }

  return (
    <div className="space-y-8">
      {confirmDialog}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-600">
            Create jobs and optionally link an inquiry from the same branch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          <IconBtnArrowPath className="h-4 w-4 text-slate-500" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">New appointment</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Link inquiry (optional)
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("inquiry_id")}
            >
              <option value="">— None —</option>
              {inquiries.map((q) => (
                <option key={q.id} value={q.id}>
                  #{q.id} {q.customer_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Linking an inquiry fills customer name, phone, and service category from
              that record; you can edit any field before saving.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Service category *
            </label>
            <select
              required
              disabled={categoriesLoading || categoryOptions.length === 0}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
              {...register("service_category", { required: true })}
            >
              {categoriesLoading ? (
                <option value={DEFAULT_SERVICE_CATEGORY}>
                  Loading categories…
                </option>
              ) : (
                categoryOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Customer *</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("customer_name", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Phone *</label>
            <input
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="0917 123 4567"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("contact_number", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Service *</label>
            <input
              required
              placeholder="e.g. Cleaning, refill gas"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("service_type", { required: true })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              Scheduled (local) *
            </label>
            <input
              required
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              {...register("scheduled_date", { required: true })}
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
              disabled={categoriesLoading || categoryOptions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
            >
              <IconBtnCheck className="h-4 w-4" />
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search customer, service, status…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {loading ? "…" : `${filteredRows.length} of ${rows.length}`}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Service detail</th>
              <th className="px-3 py-2 font-medium">Inquiry</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
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
                  No appointments.
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
                  <td className="px-3 py-2 text-slate-700">
                    {formatScheduledDateTimeForDisplay(r.scheduled_date)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{r.customer_name}</div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {formatPhilippinePhoneDisplay(r.contact_number)}
                    </div>
                  </td>
                  <td className="max-w-[160px] px-3 py-2 text-xs text-slate-700">
                    {labelFor(r.service_category)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{r.service_type}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.inquiry ? `#${r.inquiry.id}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-[200px] flex-wrap gap-1">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={r.status === s}
                          onClick={() => setStatus(r.id, s)}
                          className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-0.5 text-xs capitalize hover:bg-slate-50 disabled:opacity-40"
                        >
                          <IconBtnCheck className="h-3 w-3 opacity-70" />
                          {s}
                        </button>
                      ))}
                    </div>
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
