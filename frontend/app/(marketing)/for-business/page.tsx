import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For aircon businesses | Aircon CMS",
  description:
    "Run inquiries, scheduling, and inventory per branch. Built for service companies that want SaaS-style operations without rebuilding later.",
};

const highlights = [
  {
    title: "Tenant-ready by design",
    body: "branch_id on core tables means you can onboard many shops without forked code—only access rules and UI need to grow.",
  },
  {
    title: "Customer-facing + back office",
    body: "Keep a public request path for homeowners while your staff work authenticated lists with JWT-scoped data.",
  },
  {
    title: "White-label friendly",
    body: "Drop in your logo and display name via environment variables today; swap to per-tenant themes when you are ready.",
  },
] as const;

export default function ForBusinessPage() {
  return (
    <div className="space-y-16 pb-16 sm:space-y-20 sm:pb-20">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 px-6 py-14 text-white sm:px-10 sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">
            B2B · operations
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            The same product for every aircon company you serve
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Whether you sell this as packaged software or run it as your own
            multi-branch brand, the structure is SaaS-first: isolated branch
            data, simple auth, and modules that match how HVAC teams actually
            work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Sign in to workspace
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              View example pricing
            </Link>
            <Link
              href="/"
              className="text-center text-sm font-medium text-brand-200 underline-offset-4 hover:text-white hover:underline sm:text-left"
            >
              ← Customer request form
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-heading">
        <h2
          id="why-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Why operators pick this shape
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          You are not buying a frozen website form—you are getting a backbone
          that stays coherent as you add branches, billing, and branding.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {highlights.map((h) => (
            <li
              key={h.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {h.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-slate-900">
          Roadmap you can sell against
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Today: inquiries, appointments, inventory, JWT + branch context.
          Next waves typically include branch switchers for power users,
          stock transfers, technician assignment, and tenant-level billing—not
          a rewrite of the schema.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/#faq"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Read FAQ
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Open admin
          </Link>
        </div>
      </section>
    </div>
  );
}
