/** PH mobile (+639XXXXXXXXX) and common landline → E.164 (+63…). */

export function normalizePhilippinePhone(
  raw: string
): { ok: true; e164: string } | { ok: false; error: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: "Phone number is required" };

  let d = s.replace(/\D/g, "");
  if (d.startsWith("63")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);

  if (d.length === 10 && d[0] === "9") {
    return { ok: true, e164: `+63${d}` };
  }

  if (d.length >= 9 && d.length <= 11 && /^[2-8]/.test(d)) {
    return { ok: true, e164: `+63${d}` };
  }

  return {
    ok: false,
    error:
      "Use a valid PH number (e.g. mobile 0917 123 4567 or landline 02 8123 4567).",
  };
}

/** Display mobile as 09XX XXX XXXX; landlines as +632… */
export function formatPhilippinePhoneDisplay(
  stored: string | null | undefined
): string {
  if (!stored || !stored.startsWith("+63")) return stored?.trim() || "—";
  const rest = stored.slice(3);
  if (rest.length === 10 && rest[0] === "9") {
    return `0${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
  }
  return stored;
}
