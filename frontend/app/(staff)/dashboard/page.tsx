"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "@/lib/api";
import { addMonths, isoToLocalDateKey, localDateKey } from "@/lib/calendarMonth";
import {
  AppointmentMonthCalendar,
  type CalendarAppointment,
} from "@/components/dashboard/AppointmentMonthCalendar";
import {
  IconDashArrowTrendUp,
  IconDashBanknotes,
  IconDashBriefcase,
  IconDashBuilding,
  IconDashCalendar,
  IconDashChart,
  IconDashChevronRight,
  IconDashClock,
  IconDashCube,
  IconDashDocument,
  IconDashExclamation,
  IconDashInquiry,
  IconDashPie,
  IconDashReceipt,
} from "@/components/dashboard/DashboardIcons";
import { useAuth } from "@/providers/AuthProvider";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { formatMoney } from "@/lib/accountingPresets";
import { IconBtnArrowPath, IconBtnXMark } from "@/components/ui/ButtonIcons";
import { useToast } from "@/providers/ToastProvider";

type AccountingSummary = {
  outstanding_total: string;
  unpaid_invoice_count: number;
  expenses_month_total: string;
  collected_month_total: string;
};

type Inquiry = {
  id: number;
  customer_name: string;
  contact_number: string;
  status: string;
  service_category: string;
  created_at: string;
};

type Appointment = {
  id: number;
  customer_name: string;
  contact_number: string;
  service_type: string;
  service_category: string;
  scheduled_date: string;
  status: string;
};

type InvItem = {
  id: number;
  item_name: string;
  quantity: number;
  unit: string | null;
};

const LOW_STOCK_MAX = 5;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatAsOf(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSelectedHeading(dateKey: string): string {
  const dt = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return dateKey;
  const todayKey = localDateKey(new Date());
  if (dateKey === todayKey) return `Today — ${dt.toLocaleDateString()}`;
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function jobStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "ongoing") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (s === "pending") return "bg-amber-100 text-amber-900 ring-amber-200";
  if (s === "completed" || s === "done")
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (s === "cancelled" || s === "canceled")
    return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function inquiryStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "pending") return "bg-amber-100 text-amber-900 ring-amber-200";
  if (s === "contacted" || s === "quoted")
    return "bg-sky-100 text-sky-800 ring-sky-200";
  if (s === "won" || s === "converted")
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (s === "lost" || s === "closed") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

const APPT_PIPELINE_KEYS = [
  "pending",
  "ongoing",
  "completed",
  "cancelled",
  "other",
] as const;
type ApptPipelineKey = (typeof APPT_PIPELINE_KEYS)[number];

const APPT_SEGMENT_CLASS: Record<ApptPipelineKey, string> = {
  pending: "bg-amber-400",
  ongoing: "bg-sky-500",
  completed: "bg-emerald-500",
  cancelled: "bg-slate-400",
  other: "bg-violet-400",
};

const APPT_SEGMENT_LABEL: Record<ApptPipelineKey, string> = {
  pending: "Pending",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  other: "Other",
};

function bucketAppointmentStatus(status: string): ApptPipelineKey {
  const s = status.toLowerCase().trim();
  if (s === "canceled") return "cancelled";
  if (s === "done" || s === "complete") return "completed";
  if (
    s === "pending" ||
    s === "ongoing" ||
    s === "completed" ||
    s === "cancelled"
  ) {
    return s;
  }
  return "other";
}

function parseMoneyAmount(raw: string | number): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

type JobCalendarModalProps = {
  open: boolean;
  onClose: () => void;
  monthAnchor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDateKey: string | null;
  onSelectDateKey: (key: string | null) => void;
  calAppointments: CalendarAppointment[];
  dayAppointments: Appointment[];
  labelFor: (cat: string) => string;
  /** Prefer the compact day-detail modal instead of inline list when a date is chosen */
  onPickDayForDetailModal?: () => void;
};

function JobCalendarModal({
  open,
  onClose,
  monthAnchor,
  onPrevMonth,
  onNextMonth,
  selectedDateKey,
  onSelectDateKey,
  calAppointments,
  dayAppointments,
  labelFor,
  onPickDayForDetailModal,
}: JobCalendarModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center sm:py-8">
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close calendar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-cal-modal-title"
        className="relative z-10 my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:max-w-xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2
              id="job-cal-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Job calendar
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {onPickDayForDetailModal
                ? "Choose a date to open appointment details, or use the link below for the full list."
                : "Browse the month, pick a day for full visit details, or open the appointments list."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
          >
            <IconBtnXMark className="h-5 w-5" />
          </button>
        </div>

        <AppointmentMonthCalendar
          embedded
          appointments={calAppointments}
          monthAnchor={monthAnchor}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={onSelectDateKey}
          onDayCellActivated={
            onPickDayForDetailModal
              ? () => onPickDayForDetailModal()
              : undefined
          }
        />

        {selectedDateKey && !onPickDayForDetailModal && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/90 p-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {formatSelectedHeading(selectedDateKey)}
            </h3>
            {dayAppointments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No appointments on this day.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {dayAppointments.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    <div className="font-medium text-slate-900">
                      {a.customer_name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      {new Date(a.scheduled_date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {labelFor(a.service_category)} · {a.service_type}
                    </div>
                    {a.contact_number && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {a.contact_number}
                      </div>
                    )}
                    <span
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${jobStatusClass(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
          <Link
            href="/appointments"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Open appointments page →
          </Link>
        </div>
      </div>
    </div>
  );
}

type DayAppointmentsModalProps = {
  open: boolean;
  onClose: () => void;
  dateKey: string | null;
  appointments: Appointment[];
  labelFor: (cat: string) => string;
  onOpenFullCalendar: () => void;
};

function DayAppointmentsModal({
  open,
  onClose,
  dateKey,
  appointments,
  labelFor,
  onOpenFullCalendar,
}: DayAppointmentsModalProps) {
  const dayList = useMemo(() => {
    if (!dateKey) return [];
    return appointments.filter(
      (a) => isoToLocalDateKey(a.scheduled_date) === dateKey
    );
  }, [appointments, dateKey]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !dateKey) return null;

  return (
    <div className="fixed inset-0 z-[106] flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center sm:py-8">
      <button
        type="button"
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-appts-modal-title"
        className="relative z-10 my-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2
              id="day-appts-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Appointments
            </h2>
            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {formatSelectedHeading(dateKey)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {dayList.length === 0
                ? "No visits booked for this date."
                : `${dayList.length} visit${dayList.length !== 1 ? "s" : ""} scheduled.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Close"
          >
            <IconBtnXMark className="h-5 w-5" />
          </button>
        </div>

        {dayList.length > 0 && (
          <ul className="mt-4 max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto pr-0.5">
            {dayList.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm shadow-sm"
              >
                <div className="font-semibold text-slate-900">
                  {a.customer_name}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {new Date(a.scheduled_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {labelFor(a.service_category)} · {a.service_type}
                </div>
                {a.contact_number && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {a.contact_number}
                  </div>
                )}
                <span
                  className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${jobStatusClass(a.status)}`}
                >
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullCalendar();
            }}
            className="text-left text-sm font-medium text-slate-700 hover:underline sm:text-right"
          >
            Open full month calendar →
          </button>
          <Link
            href="/appointments"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Go to appointments →
          </Link>
        </div>
      </div>
    </div>
  );
}

type StatAccent = "sky" | "violet" | "emerald" | "amber";

const STAT_ACCENT: Record<StatAccent, { bar: string; iconWrap: string }> = {
  sky: {
    bar: "border-l-sky-500",
    iconWrap: "bg-sky-100 text-sky-700",
  },
  violet: {
    bar: "border-l-violet-500",
    iconWrap: "bg-violet-100 text-violet-700",
  },
  emerald: {
    bar: "border-l-emerald-500",
    iconWrap: "bg-emerald-100 text-emerald-700",
  },
  amber: {
    bar: "border-l-amber-500",
    iconWrap: "bg-amber-100 text-amber-800",
  },
};

type MoneyAccent = "rose" | "slate" | "emerald" | "orange";

const MONEY_ACCENT: Record<
  MoneyAccent,
  { bar: string; iconWrap: string }
> = {
  rose: { bar: "border-l-rose-500", iconWrap: "bg-rose-100 text-rose-700" },
  slate: { bar: "border-l-slate-500", iconWrap: "bg-slate-200 text-slate-700" },
  emerald: {
    bar: "border-l-emerald-500",
    iconWrap: "bg-emerald-100 text-emerald-700",
  },
  orange: {
    bar: "border-l-orange-500",
    iconWrap: "bg-orange-100 text-orange-800",
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { labelFor } = useServiceCategories();
  const toast = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [inventory, setInventory] = useState<InvItem[]>([]);
  const [accountingSummary, setAccountingSummary] =
    useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() =>
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [dayAppointmentsModalOpen, setDayAppointmentsModalOpen] =
    useState(false);

  const load = useCallback(
    async (opts?: { announceSuccess?: boolean }) => {
      try {
        const [inq, ap, inv] = await Promise.all([
          api.get<Inquiry[]>("/inquiries"),
          api.get<Appointment[]>("/appointments"),
          api.get<InvItem[]>("/inventory"),
        ]);
        setInquiries(inq.data);
        setAppointments(ap.data);
        setInventory(inv.data);
        try {
          const sum = await api.get<AccountingSummary>("/accounting/summary");
          setAccountingSummary(sum.data);
        } catch {
          setAccountingSummary(null);
        }
        setLastLoadedAt(new Date());
        if (opts?.announceSuccess) {
          toast.success("Dashboard refreshed.");
        }
      } catch {
        toast.error("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedDateKey) setDayAppointmentsModalOpen(false);
  }, [selectedDateKey]);

  const monthAppointments = useMemo(() => {
    const y = monthAnchor.getFullYear();
    const m = monthAnchor.getMonth();
    return appointments.filter((a) => {
      const d = new Date(a.scheduled_date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [appointments, monthAnchor]);

  const stats = useMemo(() => {
    const pendingInq = inquiries.filter((i) => i.status === "pending").length;
    const openJobs = appointments.filter(
      (a) => a.status === "pending" || a.status === "ongoing"
    ).length;
    const today = startOfToday();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeek = appointments.filter((a) => {
      const t = new Date(a.scheduled_date);
      return t >= today && t < weekEnd;
    }).length;
    const lowStock = inventory.filter((i) => i.quantity <= LOW_STOCK_MAX).length;
    return { pendingInq, openJobs, thisWeek, lowStock };
  }, [inquiries, appointments, inventory]);

  const attentionBreakdown = useMemo(() => {
    const unpaid = accountingSummary?.unpaid_invoice_count ?? 0;
    return {
      pendingInquiries: stats.pendingInq,
      unpaidInvoices: unpaid,
      lowStockSkus: stats.lowStock,
      total: stats.pendingInq + unpaid + stats.lowStock,
    };
  }, [stats, accountingSummary]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return [...appointments]
      .filter((a) => new Date(a.scheduled_date) >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      )
      .slice(0, 4);
  }, [appointments]);

  const recentInquiries = useMemo(() => {
    return [...inquiries]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 4);
  }, [inquiries]);

  const lowStockItems = useMemo(() => {
    return inventory
      .filter((i) => i.quantity <= LOW_STOCK_MAX)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);
  }, [inventory]);

  const categoryMix = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of inquiries) {
      const k = i.service_category || "other";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [inquiries]);

  const dayAppointments = selectedDateKey
    ? appointments.filter(
        (a) => isoToLocalDateKey(a.scheduled_date) === selectedDateKey
      )
    : [];

  const calAppts: CalendarAppointment[] = useMemo(
    () =>
      monthAppointments.map((a) => ({
        id: a.id,
        scheduled_date: a.scheduled_date,
        customer_name: a.customer_name,
        service_type: a.service_type,
        status: a.status,
      })),
    [monthAppointments]
  );

  const maxMix = categoryMix[0]?.[1] ?? 1;
  const inquiryTotal = inquiries.length;

  const distinctJobDaysThisMonth = useMemo(() => {
    const s = new Set<string>();
    for (const a of monthAppointments) {
      s.add(isoToLocalDateKey(a.scheduled_date));
    }
    return s.size;
  }, [monthAppointments]);

  const appointmentPipeline = useMemo(() => {
    const counts: Record<ApptPipelineKey, number> = {
      pending: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      other: 0,
    };
    for (const a of appointments) {
      counts[bucketAppointmentStatus(a.status || "other")] += 1;
    }
    const total = appointments.length;
    const denom = total || 1;
    const segments = APPT_PIPELINE_KEYS.map((key) => ({
      key,
      n: counts[key],
      label: APPT_SEGMENT_LABEL[key],
      className: APPT_SEGMENT_CLASS[key],
      pct: Math.round((counts[key] / denom) * 100),
    }));
    return { counts, total, segments };
  }, [appointments]);

  const fieldDemandByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      const k = a.service_category || "other";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [appointments]);
  const maxFieldDemand = fieldDemandByCategory[0]?.[1] ?? 1;

  const accountingFlowBars = useMemo(() => {
    if (!accountingSummary) return null;
    const collected = parseMoneyAmount(accountingSummary.collected_month_total);
    const expenses = parseMoneyAmount(accountingSummary.expenses_month_total);
    const outstanding = parseMoneyAmount(accountingSummary.outstanding_total);
    const maxVal = Math.max(collected, expenses, outstanding, 1);
    const net = collected - expenses;
    return {
      rows: [
        {
          key: "collected" as const,
          label: "Collected (MTD)",
          value: collected,
          display: formatMoney(accountingSummary.collected_month_total),
          barClass: "bg-emerald-500",
        },
        {
          key: "expenses" as const,
          label: "Expenses (MTD)",
          value: expenses,
          display: formatMoney(accountingSummary.expenses_month_total),
          barClass: "bg-orange-500",
        },
        {
          key: "ar" as const,
          label: "Outstanding AR",
          value: outstanding,
          display: formatMoney(accountingSummary.outstanding_total),
          barClass: "bg-rose-500",
        },
      ],
      maxVal,
      net,
      netDisplay: formatMoney(net),
    };
  }, [accountingSummary]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-3">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-7 w-20 rounded bg-slate-200" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 xl:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
        <p className="text-center text-xs text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconDashChart className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-bold leading-tight text-slate-900 sm:text-base">
              Branch dashboard
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-slate-500 sm:text-[11px]">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <IconDashBuilding className="h-3 w-3 shrink-0" />
                Branch {user?.branch_id ?? "—"}
              </span>
              {lastLoadedAt && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1">
                    <IconDashClock className="h-3 w-3 shrink-0" />
                    {formatAsOf(lastLoadedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load({ announceSuccess: true })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          <IconBtnArrowPath className="h-3.5 w-3.5 opacity-90" />
          Refresh
        </button>
      </header>

      {attentionBreakdown.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50/90 px-2.5 py-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-amber-100 text-amber-800">
            <IconDashExclamation className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-[11px] font-semibold text-amber-950">
            Attention ({attentionBreakdown.total})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {attentionBreakdown.pendingInquiries > 0 && (
              <AttentionPill
                href="/inquiries"
                label={`${attentionBreakdown.pendingInquiries} pending inq.`}
              />
            )}
            {attentionBreakdown.unpaidInvoices > 0 && (
              <AttentionPill
                href="/billing"
                label={`${attentionBreakdown.unpaidInvoices} unpaid inv.`}
              />
            )}
            {attentionBreakdown.lowStockSkus > 0 && (
              <AttentionPill
                href="/inventory"
                label={`${attentionBreakdown.lowStockSkus} low stock`}
              />
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Key metrics · operations &amp; billing
      </p>
      <div
        className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${
          accountingSummary ? "xl:grid-cols-8" : "xl:grid-cols-4"
        }`}
      >
        <StatCard
          title="Pending inquiries"
          value={stats.pendingInq}
          href="/inquiries"
          accent="sky"
          icon={<IconDashInquiry className="h-3.5 w-3.5" />}
        />
        <StatCard
          title="Open jobs"
          value={stats.openJobs}
          href="/appointments"
          accent="violet"
          icon={<IconDashBriefcase className="h-3.5 w-3.5" />}
        />
        <StatCard
          title="Visits (7d)"
          value={stats.thisWeek}
          href="/appointments"
          accent="emerald"
          icon={<IconDashCalendar className="h-3.5 w-3.5" />}
        />
        <StatCard
          title="Low stock"
          value={stats.lowStock}
          href="/inventory"
          accent="amber"
          icon={<IconDashCube className="h-3.5 w-3.5" />}
        />
        {accountingSummary && (
          <>
            <MoneyStatCard
              title="Outstanding AR"
              value={formatMoney(accountingSummary.outstanding_total)}
              href="/billing"
              accent="rose"
              icon={<IconDashBanknotes className="h-3.5 w-3.5" />}
            />
            <MoneyStatCard
              title="Unpaid inv."
              value={String(accountingSummary.unpaid_invoice_count)}
              href="/billing"
              accent="slate"
              icon={<IconDashDocument className="h-3.5 w-3.5" />}
            />
            <MoneyStatCard
              title="Collected MTD"
              value={formatMoney(accountingSummary.collected_month_total)}
              href="/billing"
              accent="emerald"
              icon={<IconDashArrowTrendUp className="h-3.5 w-3.5" />}
            />
            <MoneyStatCard
              title="Expenses MTD"
              value={formatMoney(accountingSummary.expenses_month_total)}
              href="/expenses"
              accent="orange"
              icon={<IconDashReceipt className="h-3.5 w-3.5" />}
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-[10px] text-slate-600">
        <span>
          <span className="font-semibold text-slate-700">Inquiries:</span>{" "}
          {inquiryTotal} total
        </span>
        <span>
          <span className="font-semibold text-slate-700">Appointments:</span>{" "}
          {appointments.length} in branch
        </span>
        <span>
          <span className="font-semibold text-slate-700">Inventory:</span>{" "}
          {inventory.length} SKUs
        </span>
        {accountingSummary && (
          <span>
            <span className="font-semibold text-slate-700">Unpaid AR:</span>{" "}
            {formatMoney(accountingSummary.outstanding_total)}
          </span>
        )}
      </div>

      <div className="grid gap-1.5 lg:grid-cols-12 lg:items-stretch">
        <div className="flex min-h-0 flex-col gap-1.5 lg:col-span-7 lg:h-full">
          <div className="flex min-h-0 flex-1 flex-col">
            <AppointmentMonthCalendar
              className="min-h-0 flex-1"
              fillAvailableHeight
              compact
              appointments={calAppts}
              monthAnchor={monthAnchor}
              onPrevMonth={() => setMonthAnchor((d) => addMonths(d, -1))}
              onNextMonth={() => setMonthAnchor((d) => addMonths(d, 1))}
              selectedDateKey={selectedDateKey}
              onSelectDateKey={setSelectedDateKey}
              onDayCellActivated={() => setDayAppointmentsModalOpen(true)}
              onSelectionCleared={() => setDayAppointmentsModalOpen(false)}
              headerAccessory={
                <button
                  type="button"
                  className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800 hover:bg-brand-100"
                  onClick={() => setCalendarModalOpen(true)}
                >
                  Expand
                </button>
              }
            />
          </div>
          <p className="shrink-0 text-[10px] leading-snug text-slate-500">
            <span className="font-medium text-slate-600">
              {monthAppointments.length} visit
              {monthAppointments.length !== 1 ? "s" : ""}
            </span>{" "}
            this month across{" "}
            <span className="font-medium text-slate-600">
              {distinctJobDaysThisMonth}
            </span>{" "}
            day{distinctJobDaysThisMonth !== 1 ? "s" : ""} · Click a date or{" "}
            <button
              type="button"
              className="font-semibold text-brand-600 hover:underline"
              onClick={() => setCalendarModalOpen(true)}
            >
              Expand
            </button>{" "}
            for the full calendar and visit list.
          </p>
        </div>

        <aside className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
          <InsightPanel
            icon={<IconDashCalendar className="h-3.5 w-3.5" />}
            title="Upcoming"
            subtitle="Next visits with job context"
            action={
              <Link
                href="/appointments"
                className="text-[10px] font-semibold text-brand-600 hover:underline"
              >
                All →
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <p className="text-[11px] text-slate-500">None scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-slate-100 bg-slate-50/80 px-1.5 py-1 text-[11px] leading-tight"
                  >
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <IconDashCalendar className="h-3 w-3 shrink-0 text-brand-600" />
                      {new Date(a.scheduled_date).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-0.5 font-medium text-slate-900">
                      {a.customer_name}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {labelFor(a.service_category)} · {a.service_type}
                    </div>
                    {a.contact_number && (
                      <div className="text-[10px] text-slate-500">
                        {a.contact_number}
                      </div>
                    )}
                    <span
                      className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ring-1 ${jobStatusClass(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </InsightPanel>

          <InsightPanel
            icon={<IconDashInquiry className="h-3.5 w-3.5" />}
            title="Recent inq."
            subtitle="Latest leads & pipeline stage"
            action={
              <Link
                href="/inquiries"
                className="text-[10px] font-semibold text-brand-600 hover:underline"
              >
                All →
              </Link>
            }
          >
            {recentInquiries.length === 0 ? (
              <p className="text-[11px] text-slate-500">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentInquiries.map((i) => (
                  <li
                    key={i.id}
                    className="rounded-md border border-slate-100 bg-slate-50/80 px-1.5 py-1 text-[11px] leading-tight"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <span className="font-semibold text-slate-900">
                        #{i.id} {i.customer_name}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ring-1 ${inquiryStatusClass(i.status)}`}
                      >
                        {i.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {labelFor(i.service_category)}
                    </div>
                    {i.contact_number && (
                      <div className="text-[10px] text-slate-500">
                        {i.contact_number}
                      </div>
                    )}
                    <div className="text-[9px] text-slate-400">
                      Logged{" "}
                      {new Date(i.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InsightPanel>

          <InsightPanel
            icon={<IconDashCube className="h-3.5 w-3.5" />}
            title="Low stock"
            subtitle={
              stats.lowStock === 0
                ? `All SKUs above ${LOW_STOCK_MAX} units · ${inventory.length} items tracked`
                : `${stats.lowStock} SKU(s) at ≤${LOW_STOCK_MAX} · ${inventory.length} line items`
            }
            action={
              <Link
                href="/inventory"
                className="text-[10px] font-semibold text-brand-600 hover:underline"
              >
                Inv. →
              </Link>
            }
          >
            {lowStockItems.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Levels healthy for shown SKUs.
              </p>
            ) : (
              <ul className="space-y-1">
                {lowStockItems.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-1 text-[11px] leading-tight"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      {i.item_name}
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-amber-800">
                      {i.quantity}
                      {i.unit ? ` ${i.unit}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </InsightPanel>

          <InsightPanel
            icon={<IconDashPie className="h-3.5 w-3.5" />}
            title="Inquiry mix"
            subtitle={
              inquiryTotal
                ? `${inquiryTotal} inquiries · % of pipeline by category`
                : "No inquiries yet"
            }
          >
            {categoryMix.length === 0 ? (
              <p className="text-[11px] text-slate-500">No data.</p>
            ) : (
              <ul className="space-y-1.5">
                {categoryMix.map(([cat, n]) => {
                  const pct = inquiryTotal
                    ? Math.round((n / inquiryTotal) * 100)
                    : 0;
                  return (
                    <li key={cat}>
                      <div className="flex justify-between gap-1 text-[10px] text-slate-700">
                        <span className="min-w-0 truncate font-medium">
                          {labelFor(cat)}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          <span className="font-semibold text-slate-900">
                            {n}
                          </span>
                          <span className="text-slate-500"> ({pct}%)</span>
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-400"
                          style={{
                            width: `${Math.max(6, (n / maxMix) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </InsightPanel>
        </aside>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Service operations &amp; accounting charts
      </p>
      <div className="grid gap-1.5 lg:grid-cols-3">
        <InsightPanel
          icon={<IconDashBriefcase className="h-3.5 w-3.5" />}
          title="Job pipeline"
          subtitle="Branch appointments by work status"
          action={
            <Link
              href="/appointments"
              className="text-[10px] font-semibold text-brand-600 hover:underline"
            >
              Jobs →
            </Link>
          }
        >
          {appointmentPipeline.total === 0 ? (
            <p className="text-[11px] text-slate-500">
              No jobs yet—pipeline chart will fill as you schedule work.
            </p>
          ) : (
            <>
              <div
                className="flex h-5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/80"
                title="Share of jobs by status"
              >
                {appointmentPipeline.segments
                  .filter((s) => s.n > 0)
                  .map((s) => (
                    <div
                      key={s.key}
                      className={`${s.className} min-w-[3px] shrink-0`}
                      style={{
                        width: `${(s.n / (appointmentPipeline.total || 1)) * 100}%`,
                      }}
                      title={`${s.label}: ${s.n}`}
                    />
                  ))}
              </div>
              <ul className="mt-2 space-y-1">
                {appointmentPipeline.segments.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between gap-2 text-[10px]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-700">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-sm ${s.className}`}
                      />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      <span className="font-semibold text-slate-900">{s.n}</span>
                      <span className="text-slate-400"> ({s.pct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </InsightPanel>

        <InsightPanel
          icon={<IconDashChart className="h-3.5 w-3.5" />}
          title="Field demand"
          subtitle="Jobs booked by service category (cooling, install, etc.)"
          action={
            <Link
              href="/appointments"
              className="text-[10px] font-semibold text-brand-600 hover:underline"
            >
              Jobs →
            </Link>
          }
        >
          {fieldDemandByCategory.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No categorized jobs—categories appear from appointment records.
            </p>
          ) : (
            <ul className="space-y-2">
              {fieldDemandByCategory.map(([cat, n]) => {
                const pct = appointmentPipeline.total
                  ? Math.round((n / appointmentPipeline.total) * 100)
                  : 0;
                return (
                  <li key={cat}>
                    <div className="flex justify-between gap-1 text-[10px] text-slate-700">
                      <span className="min-w-0 truncate font-medium">
                        {labelFor(cat)}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold text-slate-900">{n}</span>
                        <span className="text-slate-500"> ({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-brand-600"
                        style={{
                          width: `${Math.max(8, (n / maxFieldDemand) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </InsightPanel>

        {accountingFlowBars ? (
          <InsightPanel
            icon={<IconDashBanknotes className="h-3.5 w-3.5" />}
            title="Cash &amp; AR snapshot"
            subtitle="MTD cash vs spend vs open receivables (same scale)"
            action={
              <Link
                href="/billing"
                className="text-[10px] font-semibold text-brand-600 hover:underline"
              >
                Billing →
              </Link>
            }
          >
            <ul className="space-y-2.5">
              {accountingFlowBars.rows.map((row) => (
                <li key={row.key}>
                  <div className="flex justify-between gap-2 text-[10px] text-slate-600">
                    <span className="min-w-0 truncate font-medium text-slate-700">
                      {row.label}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {row.display}
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${row.barClass}`}
                      style={{
                        width: `${Math.min(100, (row.value / accountingFlowBars.maxVal) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div
              className={`mt-3 rounded-md border px-2 py-1.5 text-[10px] ${
                accountingFlowBars.net >= 0
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : "border-amber-200 bg-amber-50/80 text-amber-950"
              }`}
            >
              <span className="font-semibold">Net (collected − expenses): </span>
              {accountingFlowBars.netDisplay}
              <span className="text-slate-600">
                {" "}
                · {accountingSummary?.unpaid_invoice_count ?? 0} unpaid invoice
                {(accountingSummary?.unpaid_invoice_count ?? 0) !== 1
                  ? "s"
                  : ""}
              </span>
            </div>
          </InsightPanel>
        ) : (
          <InsightPanel
            icon={<IconDashReceipt className="h-3.5 w-3.5" />}
            title="Cash &amp; AR snapshot"
            subtitle="Billing totals for this branch"
            action={
              <Link
                href="/billing"
                className="text-[10px] font-semibold text-brand-600 hover:underline"
              >
                Billing →
              </Link>
            }
          >
            <p className="text-[11px] leading-snug text-slate-500">
              Accounting summary isn’t available (permissions or no billing
              activity). Open billing to record invoices and payments—charts
              will appear here automatically.
            </p>
          </InsightPanel>
        )}
      </div>

      <DayAppointmentsModal
        open={dayAppointmentsModalOpen}
        onClose={() => setDayAppointmentsModalOpen(false)}
        dateKey={selectedDateKey}
        appointments={appointments}
        labelFor={labelFor}
        onOpenFullCalendar={() => setCalendarModalOpen(true)}
      />

      <JobCalendarModal
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        monthAnchor={monthAnchor}
        onPrevMonth={() => setMonthAnchor((d) => addMonths(d, -1))}
        onNextMonth={() => setMonthAnchor((d) => addMonths(d, 1))}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={setSelectedDateKey}
        calAppointments={calAppts}
        dayAppointments={dayAppointments}
        labelFor={labelFor}
        onPickDayForDetailModal={() => {
          setCalendarModalOpen(false);
          setDayAppointmentsModalOpen(true);
        }}
      />
    </div>
  );
}

function AttentionPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300/70 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-950 hover:bg-amber-50/80"
    >
      {label}
      <IconDashChevronRight className="h-2.5 w-2.5 opacity-60" />
    </Link>
  );
}

function InsightPanel({
  icon,
  title,
  subtitle,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border border-slate-200/90 bg-white p-2 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            {icon}
          </span>
          <h2 className="truncate text-[11px] font-bold text-slate-900">
            {title}
          </h2>
        </div>
        {action}
      </div>
      {subtitle && <p className="pt-1 text-[9px] text-slate-500">{subtitle}</p>}
      <div className="pt-1.5">{children}</div>
    </section>
  );
}

function StatCard({
  title,
  value,
  href,
  accent,
  icon,
}: {
  title: string;
  value: number;
  href: string;
  accent: StatAccent;
  icon: ReactNode;
}) {
  const a = STAT_ACCENT[accent];
  return (
    <Link
      href={href}
      title={title}
      className={`block rounded-lg border border-slate-200/90 bg-white p-2 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow ${a.bar} border-l-[3px] pl-2`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 min-h-[2rem] text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500">
          {title}
        </p>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${a.iconWrap}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-0.5 text-xl font-bold tabular-nums leading-none text-slate-900 sm:text-2xl">
        {value}
      </p>
    </Link>
  );
}

function MoneyStatCard({
  title,
  value,
  href,
  accent,
  icon,
}: {
  title: string;
  value: string;
  href: string;
  accent: MoneyAccent;
  icon: ReactNode;
}) {
  const a = MONEY_ACCENT[accent];
  return (
    <Link
      href={href}
      title={`${title}: ${value}`}
      className={`block rounded-lg border border-slate-200/90 bg-white p-2 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow ${a.bar} border-l-[3px] pl-2`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 min-h-[2rem] text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-500">
          {title}
        </p>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${a.iconWrap}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-0.5 break-all text-sm font-bold tabular-nums leading-tight text-slate-900 sm:text-base">
        {value}
      </p>
    </Link>
  );
}
