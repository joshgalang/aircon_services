/**
 * White-label hook: set NEXT_PUBLIC_WHITELABEL_LOGO_URL to a public image URL.
 * Optional NEXT_PUBLIC_WHITELABEL_NAME overrides the wordmark next to the logo.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  const logoUrl = process.env.NEXT_PUBLIC_WHITELABEL_LOGO_URL;
  const name = process.env.NEXT_PUBLIC_WHITELABEL_NAME ?? "Aircon CMS";

  if (logoUrl) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          width={120}
          height={32}
          className="h-8 w-auto max-w-[140px] object-contain object-left"
        />
        <span className="font-semibold text-brand-900">{name}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      title="White-label: set NEXT_PUBLIC_WHITELABEL_LOGO_URL (and optionally NEXT_PUBLIC_WHITELABEL_NAME)"
    >
      <span className="flex h-9 w-[72px] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Your logo
      </span>
      <span className="font-semibold text-brand-900">{name}</span>
    </span>
  );
}
