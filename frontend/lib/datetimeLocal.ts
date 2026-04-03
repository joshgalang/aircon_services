/**
 * `<input type="datetime-local">` → API body for `scheduled_date` / similar naive timestamps.
 *
 * PostgreSQL `timestamp without time zone` is serialized with a trailing `Z`, but the numbers
 * are **branch wall time**, not a real UTC instant. We keep that contract: copy Y-M-D H:m:s into
 * an ISO string with `Z` and **do not** shift by the browser timezone (so DB stays e.g. 06:00).
 */
export function datetimeLocalValueToUtcIso(value: string): string {
  const trimmed = value.trim();
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (!m) {
    throw new Error("Invalid datetime-local value");
  }
  const y = m[1];
  const mo = m[2];
  const d = m[3];
  const h = m[4];
  const mi = m[5];
  const sec = (m[6] ?? "00").padStart(2, "0");
  const monthN = Number(mo);
  const dayN = Number(d);
  const hourN = Number(h);
  const minN = Number(mi);
  const secN = Number(sec);
  if (
    monthN < 1 ||
    monthN > 12 ||
    dayN < 1 ||
    dayN > 31 ||
    hourN > 23 ||
    minN > 59 ||
    secN > 59
  ) {
    throw new Error("Invalid datetime-local value");
  }
  return `${y}-${mo}-${d}T${h}:${mi}:${sec}.000Z`;
}

/**
 * Format API `scheduled_date` for the UI. Same naive-`Z` contract: show the stored clock using
 * UTC fields so it matches the database / Supabase table (avoids +8h shift in PH).
 */
export function formatScheduledDateTimeForDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Time-of-day only (same naive-`Z` / UTC-field rules). */
export function formatScheduledTimeForDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
