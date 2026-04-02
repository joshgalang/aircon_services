"use client";

import type { ReactNode } from "react";
import {
  buildMonthGrid,
  isoToLocalDateKey,
  localDateKey,
  type CalendarCell,
} from "@/lib/calendarMonth";
import {
  IconBtnChevronLeft,
  IconBtnChevronRight,
} from "@/components/ui/ButtonIcons";

export type CalendarAppointment = {
  id: number;
  scheduled_date: string;
  customer_name: string;
  service_type: string;
  status: string;
};

type Props = {
  appointments: CalendarAppointment[];
  monthAnchor: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDateKey: string | null;
  onSelectDateKey: (key: string | null) => void;
  /** Tighter layout for dense dashboards */
  compact?: boolean;
  /** Shown after the title (e.g. expand button) */
  headerAccessory?: ReactNode;
  /** Fires after a day is selected (not when clearing selection) */
  onDayCellActivated?: (dateKey: string) => void;
  /** Fires when the user clears the selected day (second click on same cell) */
  onSelectionCleared?: () => void;
  /** Hide “Job calendar” heading — use inside a modal that already has a title */
  embedded?: boolean;
  /** Grow with parent height (e.g. dashboard column beside taller cards) */
  fillAvailableHeight?: boolean;
  className?: string;
};

/** Calendar grid starts Sunday (column 0) — matches `buildMonthGrid` */
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function countByDate(appointments: CalendarAppointment[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of appointments) {
    const k = isoToLocalDateKey(a.scheduled_date);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function AppointmentMonthCalendar({
  appointments,
  monthAnchor,
  onPrevMonth,
  onNextMonth,
  selectedDateKey,
  onSelectDateKey,
  compact = false,
  headerAccessory,
  onDayCellActivated,
  onSelectionCleared,
  embedded = false,
  fillAvailableHeight = false,
  className = "",
}: Props) {
  const { cells, label } = buildMonthGrid(monthAnchor);
  const counts = countByDate(appointments);
  const todayKey = localDateKey(new Date());
  const weekRows = cells.length / 7;

  const renderDayCell = (cell: CalendarCell, i: number) => {
    const key = localDateKey(cell.date);
    const n = counts.get(key) ?? 0;
    const isToday = key === todayKey;
    const isSelected = key === selectedDateKey;
    const compactFill = compact && fillAvailableHeight;
    return (
      <button
        key={`${key}-${i}`}
        type="button"
        onClick={() => {
          if (isSelected) {
            onSelectDateKey(null);
            onSelectionCleared?.();
            return;
          }
          onSelectDateKey(key);
          onDayCellActivated?.(key);
        }}
        className={`bg-white transition hover:bg-brand-50/80 ${
          compact
            ? compactFill
              ? "flex h-full min-h-0 flex-col items-center justify-center py-0.5 text-[11px] leading-none"
              : "min-h-[1.35rem] py-0.5 text-[11px] leading-none sm:min-h-[1.5rem]"
            : "min-h-[2.75rem] py-1.5 text-sm sm:min-h-[3.25rem]"
        } ${
          !cell.inCurrentMonth ? "text-slate-300" : "text-slate-900"
        } ${isToday ? "ring-1 ring-inset ring-brand-400" : ""} ${
          isSelected ? "bg-brand-100 font-semibold text-brand-900" : ""
        }`}
      >
        <span className="block">{cell.date.getDate()}</span>
        {n > 0 && cell.inCurrentMonth && (
          <span
            className={`mt-0.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-brand-600 font-semibold text-white ${
              compact ? "px-0.5 text-[8px]" : "px-1 text-[10px]"
            }`}
          >
            {n}
          </span>
        )}
      </button>
    );
  };

  const gridChrome = `grid grid-cols-7 gap-px rounded-md bg-slate-200 text-center font-semibold text-slate-600 ${
    compact
      ? "mt-1.5 text-[7px] leading-tight sm:text-[8px]"
      : "mt-4 text-[11px] sm:text-xs"
  }`;
  const fillStackTop = compact ? "mt-1.5" : "mt-4";
  const weekdayLabelClass = compact
    ? "text-[7px] leading-tight sm:text-[8px]"
    : "text-[11px] sm:text-xs";

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${
        compact ? "p-2" : "p-4 shadow-sm sm:p-5"
      } ${fillAvailableHeight ? "flex h-full min-h-0 flex-col" : ""} ${className}`.trim()}
    >
      {embedded ? (
        <div
          className={`mb-2 flex items-center justify-center gap-2${
            fillAvailableHeight ? " shrink-0" : ""
          }`}
        >
          <button
            type="button"
            onClick={() => onPrevMonth()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <IconBtnChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-slate-800">
            {label}
          </span>
          <button
            type="button"
            onClick={() => onNextMonth()}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50"
            aria-label="Next month"
          >
            <IconBtnChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center justify-between gap-2${
            fillAvailableHeight ? " shrink-0" : ""
          }`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h2
              className={`font-semibold text-slate-900 ${
                compact ? "text-xs" : "text-lg"
              }`}
            >
              Job calendar
            </h2>
            {headerAccessory}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onPrevMonth()}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 ${
                compact ? "p-0.5" : "rounded-lg p-1.5"
              }`}
              aria-label="Previous month"
            >
              <IconBtnChevronLeft
                className={compact ? "h-3.5 w-3.5" : "h-5 w-5"}
              />
            </button>
            <span
              className={`text-center font-medium text-slate-800 ${
                compact
                  ? "min-w-[6.5rem] text-[11px]"
                  : "min-w-[10rem] text-sm"
              }`}
            >
              {label}
            </span>
            <button
              type="button"
              onClick={() => onNextMonth()}
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 ${
                compact ? "p-0.5" : "rounded-lg p-1.5"
              }`}
              aria-label="Next month"
            >
              <IconBtnChevronRight
                className={compact ? "h-3.5 w-3.5" : "h-5 w-5"}
              />
            </button>
          </div>
        </div>
      )}
      {!compact && !embedded && (
        <p
          className={`mt-1 text-xs text-slate-500${
            fillAvailableHeight ? " shrink-0" : ""
          }`}
        >
          Scheduled visits by day (branch). Select a day for details.
        </p>
      )}

      {fillAvailableHeight ? (
        <div
          className={`${fillStackTop} flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-md bg-slate-200`}
        >
          <div
            className={`grid shrink-0 grid-cols-7 gap-px text-center font-semibold text-slate-600 ${weekdayLabelClass}`}
          >
            {WEEKDAYS_LONG.map((d) => (
              <div
                key={d}
                className={`bg-slate-50 ${
                  compact ? "px-0.5 py-1" : "px-1 py-2"
                }`}
              >
                <span className="block hyphens-auto break-words">{d}</span>
              </div>
            ))}
          </div>
          <div
            className="grid min-h-0 flex-1 grid-cols-7 gap-px"
            style={{
              gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))`,
            }}
          >
            {cells.map((cell, i) => renderDayCell(cell, i))}
          </div>
        </div>
      ) : (
        <div className={gridChrome}>
          {WEEKDAYS_LONG.map((d) => (
            <div
              key={d}
              className={`bg-slate-50 ${
                compact ? "px-0.5 py-1" : "px-1 py-2"
              }`}
            >
              <span className="block hyphens-auto break-words">{d}</span>
            </div>
          ))}
          {cells.map((cell, i) => renderDayCell(cell, i))}
        </div>
      )}
    </div>
  );
}
