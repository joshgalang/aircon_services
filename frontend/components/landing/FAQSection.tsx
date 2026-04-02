"use client";

import { useId, useState } from "react";

const items = [
  {
    q: "How does multi-branch / multi-tenant work?",
    a: "Every record is tied to a branch_id. Staff sign in with a JWT that carries their branch, so lists and updates never leak across branches. When you add more locations, you add branches—not a new database.",
  },
  {
    q: "Is our company data separate from other subscribers?",
    a: "Yes. The product is designed so each tenant’s operations are scoped by branch. Other customers never see your inquiries, jobs, or stock as long as auth and API rules stay enforced (the default in this codebase).",
  },
  {
    q: "Can we use our own logo and name in the header?",
    a: "For white-label demos, set NEXT_PUBLIC_WHITELABEL_LOGO_URL to a hosted image and optionally NEXT_PUBLIC_WHITELABEL_NAME. The nav shows your logo slot + name; replace assets per tenant when you host separate builds or add runtime theming later.",
  },
  {
    q: "Where do customer inquiries go?",
    a: "The public form posts to your API and stores rows under the default branch (branch 1) unless you extend routing. Staff on that branch see them in the Inquiries screen and can move status from pending to done.",
  },
  {
    q: "Do you charge per user or per branch?",
    a: "That’s a business decision—this UI shows example tiers (Starter / Growth / Scale). The app structure supports per-branch billing when you connect a payment provider and entitlements.",
  },
] as const;

export function FAQSection() {
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="scroll-mt-24" aria-labelledby="faq-heading">
      <div className="text-center">
        <h2
          id="faq-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Straight answers for operators evaluating the product—or your own
          tenants reading the marketing site.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-2 shadow-sm">
        {items.map((item, i) => {
          const expanded = open === i;
          const panelId = `${baseId}-panel-${i}`;
          const buttonId = `${baseId}-btn-${i}`;
          return (
            <div key={item.q} className="px-4 py-1">
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-slate-900 sm:text-base"
                  onClick={() => setOpen(expanded ? null : i)}
                >
                  {item.q}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition ${
                      expanded ? "bg-brand-50 text-brand-700" : "bg-slate-50"
                    }`}
                    aria-hidden
                  >
                    {expanded ? "−" : "+"}
                  </span>
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!expanded}
                className="pb-4"
              >
                <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                  {item.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
