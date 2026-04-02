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
  IconBtnMinus,
  IconBtnPlus,
  IconBtnXMark,
} from "@/components/ui/ButtonIcons";
import {
  formatPhilippinePhoneDisplay,
  normalizePhilippinePhone,
} from "@/lib/phPhone";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";

type Inquiry = {
  id: number;
  branch_id: number;
  customer_name: string;
  contact_number: string;
  email: string | null;
  address: string | null;
  message: string | null;
  service_category: string;
  status: string;
  created_at: string;
};

const STATUSES = ["pending", "contacted", "done"] as const;

type NewInquiryForm = {
  customer_name: string;
  contact_number: string;
  email: string;
  address: string;
  message: string;
  service_category: string;
};

export default function InquiriesPage() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const {
    options: categoryOptions,
    defaultSlug,
    loading: categoriesLoading,
    error: categoriesError,
    labelFor,
  } = useServiceCategories();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<NewInquiryForm>({
    defaultValues: {
      customer_name: "",
      contact_number: "",
      email: "",
      address: "",
      message: "",
      service_category: DEFAULT_SERVICE_CATEGORY,
    },
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Inquiry[]>("/inquiries");
      setRows(data);
    } catch {
      toast.error("Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const inquiryRowText = useCallback(
    (r: Inquiry) =>
      [
        r.customer_name,
        r.email,
        r.contact_number,
        r.status,
        r.service_category,
        labelFor(r.service_category),
        r.address,
        r.message,
        String(r.id),
      ]
        .filter(Boolean)
        .join(" "),
    [labelFor]
  );
  const filteredRows = useFilteredRows(rows, tableSearch, inquiryRowText);

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

  async function setStatus(id: number, status: string) {
    const row = rows.find((x) => x.id === id);
    const ok = await confirm({
      title: "Update inquiry status?",
      message: `Set inquiry #${id}${row ? ` (${row.customer_name})` : ""} to “${status}”?`,
    });
    if (!ok) return;
    try {
      await api.put(`/inquiries/${id}`, { status });
      toast.success(
        `Saved: inquiry #${id} is now “${status}”.`
      );
      await load();
    } catch {
      toast.error("Could not update status.");
    }
  }

  const onCreateInquiry = handleSubmit(async (values) => {
    const ok = await confirm({
      title: "Save inquiry?",
      message: "This will create a new inquiry under your branch.",
    });
    if (!ok) return;
    const phone = normalizePhilippinePhone(values.contact_number);
    if (!phone.ok) {
      toast.error(phone.error);
      return;
    }
    try {
      await api.post<Inquiry>("/inquiries", {
        customer_name: values.customer_name.trim(),
        contact_number: phone.e164,
        email: values.email.trim() || undefined,
        address: values.address.trim() || undefined,
        message: values.message.trim() || undefined,
        service_category: values.service_category,
      });
      reset({
        customer_name: "",
        contact_number: "",
        email: "",
        address: "",
        message: "",
        service_category: defaultSlug,
      });
      toast.success(
        `Inquiry saved for your branch — ${values.customer_name.trim() || "new lead"}.`
      );
      await load();
    } catch (e: unknown) {
      toast.error(
        apiErrorMessage(
          e,
          "Could not save inquiry. Check required fields and try again."
        )
      );
    }
  });

  return (
    <div>
      {confirmDialog}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inquiries</h1>
          <p className="text-sm text-slate-600">
            Scoped to your branch from JWT. Add walk-in or phone leads, then
            track status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900 hover:bg-brand-100"
          >
            {formOpen ? (
              <>
                <IconBtnMinus className="h-4 w-4" />
                Hide form
              </>
            ) : (
              <>
                <IconBtnPlus className="h-4 w-4" />
                Add inquiry
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

      {formOpen && (
        <section
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="new-inquiry-heading"
        >
          <h2
            id="new-inquiry-heading"
            className="text-lg font-semibold text-slate-900"
          >
            New customer inquiry (aircon)
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Record someone who called, walked in, or messaged off-channel. Saves
            under your current branch. Phone numbers are stored in PH format (+63).
            Manage dropdown options under{" "}
            <a
              href="/setup/service-categories"
              className="font-medium text-brand-600 hover:underline"
            >
              Service setup
            </a>
            .
          </p>
          {categoriesError && (
            <p className="mt-2 text-sm text-amber-800">{categoriesError}</p>
          )}
          <form className="mt-4 space-y-4" onSubmit={onCreateInquiry}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-inq-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Customer name <span className="text-red-500">*</span>
                </label>
                <input
                  id="staff-inq-name"
                  required
                  autoComplete="name"
                  placeholder="Customer or site contact"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  {...register("customer_name", { required: true })}
                />
              </div>
              <div>
                <label
                  htmlFor="staff-inq-phone"
                  className="text-sm font-medium text-slate-700"
                >
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="staff-inq-phone"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="0917 123 4567 or 02 8123 4567"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  {...register("contact_number", { required: true })}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="staff-inq-category"
                  className="text-sm font-medium text-slate-700"
                >
                  Service category <span className="text-red-500">*</span>
                </label>
                <select
                  id="staff-inq-category"
                  required
                  disabled={categoriesLoading || categoryOptions.length === 0}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
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
            </div>
            <div>
              <label
                htmlFor="staff-inq-email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="staff-inq-email"
                type="email"
                autoComplete="email"
                placeholder="Optional"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                {...register("email")}
              />
            </div>
            <div>
              <label
                htmlFor="staff-inq-address"
                className="text-sm font-medium text-slate-700"
              >
                Service location
              </label>
              <textarea
                id="staff-inq-address"
                rows={2}
                placeholder="Building, unit, street, city (where the AC is)"
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                {...register("address")}
              />
            </div>
            <div>
              <label
                htmlFor="staff-inq-message"
                className="text-sm font-medium text-slate-700"
              >
                Service needed
              </label>
              <textarea
                id="staff-inq-message"
                rows={3}
                placeholder="e.g. Split-type cleaning, window unit not cooling, new install 1.5 HP, gas top-up, leak, odd noise…"
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                {...register("message")}
              />
              <p className="mt-1 text-xs text-slate-500">
                Typical jobs: cleaning, repair, installation, inverter service,
                refrigerant / leak check, ducted or cassette units.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={
                  isSubmitting || categoriesLoading || categoryOptions.length === 0
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
              >
                <IconBtnCheck className="h-4 w-4" />
                {isSubmitting ? "Saving…" : "Save inquiry"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const v = getValues();
                  const has = Object.values(v).some(
                    (x) => String(x ?? "").trim() !== ""
                  );
                  if (has) {
                    const ok = await confirm({
                      title: "Clear form?",
                      message: "Discard all entered values?",
                      danger: true,
                      confirmLabel: "Clear",
                    });
                    if (!ok) return;
                  }
                  reset({
                    customer_name: "",
                    contact_number: "",
                    email: "",
                    address: "",
                    message: "",
                    service_category: defaultSlug,
                  });
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <IconBtnXMark className="h-4 w-4" />
                Clear form
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <TableSearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search name, phone, status…"
            className="max-w-md"
          />
          <span className="text-xs text-slate-500">
            {loading ? "…" : `${filteredRows.length} of ${rows.length}`}
          </span>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Customer</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No inquiries yet.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No rows match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {r.customer_name}
                    <div className="text-xs font-normal text-slate-500">
                      {r.email || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700 tabular-nums">
                    {formatPhilippinePhoneDisplay(r.contact_number)}
                  </td>
                  <td className="max-w-[200px] px-3 py-2 text-xs text-slate-700">
                    {labelFor(r.service_category)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
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
