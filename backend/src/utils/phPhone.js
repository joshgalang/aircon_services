/**
 * Normalize Philippine mobile and common landline input to E.164 (+63…).
 * Mobile: national number is 10 digits starting with 9 (after trunk 0).
 */

export function normalizePhilippinePhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: "Phone number is required" };

  let d = s.replace(/\D/g, "");
  if (d.startsWith("63")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);

  if (d.length === 10 && d[0] === "9") {
    return { ok: true, e164: "+63" + d };
  }

  if (d.length >= 9 && d.length <= 11 && /^[2-8]/.test(d)) {
    return { ok: true, e164: "+63" + d };
  }

  return {
    ok: false,
    error:
      "Use a valid PH number (e.g. mobile 0917 123 4567 or landline 02 8123 4567).",
  };
}

export function assertPhilippinePhone(raw) {
  const r = normalizePhilippinePhone(raw);
  if (!r.ok) throw new Error(r.error);
  return r.e164;
}
