import Link from "next/link";

const tiers = [
  {
    name: "Starter",
    price: "Free",
    period: "during MVP / beta",
    description: "One branch, full core modules—ideal to pilot with your crew.",
    features: [
      "Inquiries, appointments, inventory",
      "Branch-scoped data from day one",
      "Public request form + staff login",
    ],
    cta: "Request service",
    href: "/#request-service",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "Custom",
    period: "per month, per branch",
    description: "For shops adding locations, dispatch rules, and tighter ops.",
    features: [
      "Everything in Starter",
      "Multi-branch switching (roadmap)",
      "Inventory transfers between branches (roadmap)",
      "Email / chat support (TBD)",
    ],
    cta: "Talk to us",
    href: "/for-business",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "Enterprise",
    period: "annual agreements",
    description: "Franchise groups and regional chains that need governance.",
    features: [
      "Custom SLAs & onboarding",
      "SSO / audit expectations (roadmap)",
      "Dedicated success contact (TBD)",
    ],
    cta: "View for teams",
    href: "/for-business",
    highlighted: false,
  },
] as const;

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24"
      aria-labelledby="pricing-heading"
    >
      <div className="text-center">
        <h2
          id="pricing-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Simple pricing you can grow into
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Illustrative tiers for a multi-tenant SaaS rollout—adjust numbers and
          contracts when you go to market. Architecture is already
          branch-aware.
        </p>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
              tier.highlighted
                ? "border-brand-300 bg-gradient-to-b from-brand-50/80 to-white ring-2 ring-brand-500/20"
                : "border-slate-200 bg-white"
            }`}
          >
            {tier.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">
                Popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {tier.price}
              </span>
            </p>
            <p className="text-sm text-slate-500">{tier.period}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {tier.description}
            </p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-700">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                    aria-hidden
                  />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={tier.href}
              className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                tier.highlighted
                  ? "bg-brand-600 text-white hover:bg-brand-900"
                  : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tier.cta}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">
        Taxes, currency, and contract terms are not final—this block is for
        positioning and demos.
      </p>
    </section>
  );
}
