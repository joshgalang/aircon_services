/** Local calendar date key YYYY-MM-DD (no timezone shift for "day" bucketing). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

/** ISO datetime string → local date key for appointment display. */
export function isoToLocalDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

export type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

/** 6-row × 7-col grid for the month containing `anchor`. */
export function buildMonthGrid(anchor: Date): {
  cells: CalendarCell[];
  year: number;
  monthIndex: number;
  label: string;
} {
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: CalendarCell[] = [];

  const prevMonthLast = new Date(year, monthIndex, 0).getDate();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthLast - i);
    cells.push({ date: d, inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, monthIndex, day),
      inCurrentMonth: true,
    });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate() + 1
    );
    cells.push({ date: next, inCurrentMonth: false });
  }

  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(first);

  return { cells, year, monthIndex, label };
}

export function addMonths(anchor: Date, delta: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
}
