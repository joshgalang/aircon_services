"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { DEFAULT_SERVICE_CATEGORY } from "@/lib/serviceCategories";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { normalizePhilippinePhone } from "@/lib/phPhone";

const PUBLIC_BRANCH_ID = Number(
  process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "1"
);

type InquiryForm = {
  customer_name: string;
  contact_number: string;
  email: string;
  address: string;
  message: string;
  service_category: string;
};

function IconInbox({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 0 0 2.012-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.218a2.25 2.25 0 0 1 2.013 1.244l.256.512a2.25 2.25 0 0 0 2.012 1.244H21.75M5.25 5.25h13.5m-13.5 0a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V8.25a3 3 0 0 0-3-3m-13.5 0v4.5m0-4.5h13.5v4.5"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5"
      />
    </svg>
  );
}

function IconCube({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008zm0 3h.008v.008H17.25v-.008z"
      />
    </svg>
  );
}

const features = [
  {
    title: "Inquiry pipeline",
    body: "Capture leads from your site, triage by status, and keep every conversation tied to the right branch.",
    icon: IconInbox,
  },
  {
    title: "Job scheduling",
    body: "Plan installs and service visits with clear statuses—from booked to completed—without spreadsheet chaos.",
    icon: IconCalendar,
  },
  {
    title: "Parts & stock",
    body: "Track quantity, units, and movement logs so each location knows what is on hand before the van rolls out.",
    icon: IconCube,
  },
] as const;

export default function HomePage() {
  const { user } = useAuth();
  const [sent, setSent] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const {
    options: categoryOptions,
    defaultSlug,
    loading: catLoading,
    error: catErr,
  } = useServiceCategories({ publicBranchId: PUBLIC_BRANCH_ID });
  const { register, handleSubmit, reset, setValue, getValues } =
    useForm<InquiryForm>({
      defaultValues: { service_category: DEFAULT_SERVICE_CATEGORY },
    });

  useEffect(() => {
    if (catLoading || categoryOptions.length === 0) return;
    const cur = getValues("service_category");
    if (!categoryOptions.some((o) => o.value === cur)) {
      setValue("service_category", defaultSlug);
    }
  }, [catLoading, categoryOptions, defaultSlug, getValues, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setErr(null);
    setSent(null);
    const phone = normalizePhilippinePhone(values.contact_number);
    if (!phone.ok) {
      setErr(phone.error);
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        customer_name: values.customer_name,
        contact_number: phone.e164,
        email: values.email || undefined,
        address: values.address || undefined,
        message: values.message || undefined,
        service_category: values.service_category,
        branch_id: PUBLIC_BRANCH_ID,
      };
      await api.post("/inquiries", payload);
      setSent("Thanks — we received your inquiry.");
      reset({
        ...values,
        customer_name: "",
        contact_number: "",
        message: "",
        service_category: defaultSlug,
      });
    } catch {
      setErr("Could not send inquiry. Please try again.");
    }
  });

  return (
    <div className="space-y-20 pb-16 sm:space-y-24 sm:pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-10 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12 lg:px-14 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-900">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              SaaS · multi-branch ready
            </p>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
              Operations software built for{" "}
              <span className="bg-gradient-to-r from-brand-600 to-sky-600 bg-clip-text text-transparent">
                aircon service teams
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              One platform for the business on the road and the office behind it.
              Each company works in its own branch context—so data stays
              separated today and scales when you open the next site tomorrow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#request-service"
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Request service
              </a>
              {!user ? (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Sign in to your workspace
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Open dashboard
                </Link>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              <Link
                href="/for-business"
                className="font-medium text-brand-600 underline-offset-4 hover:text-brand-800 hover:underline"
              >
                Running a service company? See the B2B overview →
              </Link>
            </p>
            <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-100 pt-8 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tenancy model
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  Branch-scoped data
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Public + staff
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  Forms & admin tools
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Your stack
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  Web app, secure login
                </dd>
              </div>
            </dl>
          </div>
          <div className="relative rounded-2xl border border-slate-100 bg-slate-50/80 p-6 shadow-inner backdrop-blur-sm sm:p-8">
            <div className="flex items-start gap-3 rounded-xl border border-white bg-white/90 p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <IconBuilding className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Built for many businesses, not one spreadsheet
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Whether you run a single van or a network of branches, the
                  same product adapts: customers submit requests here; your team
                  signs in and only sees what belongs to their branch.
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Isolated inquiries, appointments, and stock per branch
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Room to add branch switching, transfers, and tech assignment later
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Simple MVP today—extend without rewriting your data model
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading">
        <div className="text-center">
          <h2
            id="features-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Everything a service company needs to stay organized
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Three core modules work together so front desk, dispatch, and
            warehouse stay aligned—no matter how many teams you onboard onto the
            product.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, body, icon: Icon }) => (
            <article
              key={title}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition group-hover:bg-brand-100">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <PricingSection />

      <FAQSection />

      {/* Inquiry form */}
      <section
        id="request-service"
        className="scroll-mt-24 rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-10 lg:p-12"
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Request a service
            </h2>
            <p className="mt-3 text-slate-600">
              Customers use this form to reach your team. Submissions are stored
              under the default service branch so routing stays consistent until
              you add more locations.
            </p>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Are you a partner business?</p>
              <p className="mt-1">
                Use{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand-600 hover:text-brand-800"
                >
                  staff sign-in
                </Link>{" "}
                or read the{" "}
                <Link
                  href="/for-business"
                  className="font-semibold text-brand-600 hover:text-brand-800"
                >
                  for-business
                </Link>{" "}
                page for how teams adopt the product.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Public form
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  Send us your details
                </p>
              </div>
              <span className="hidden shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
                No account needed to request service
              </span>
            </div>
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label
                    htmlFor="customer_name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer_name"
                    required
                    autoComplete="name"
                    placeholder="Juan Dela Cruz"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    {...register("customer_name", { required: true })}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label
                    htmlFor="contact_number"
                    className="text-sm font-medium text-slate-700"
                  >
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact_number"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="0917 123 4567"
                    className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                    {...register("contact_number", { required: true })}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="service_category"
                  className="text-sm font-medium text-slate-700"
                >
                  Service type <span className="text-red-500">*</span>
                </label>
                {catErr && (
                  <p className="mb-2 text-xs text-amber-800">{catErr}</p>
                )}
                <select
                  id="service_category"
                  required
                  disabled={catLoading || categoryOptions.length === 0}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  {...register("service_category", { required: true })}
                >
                  {catLoading ? (
                    <option value={DEFAULT_SERVICE_CATEGORY}>
                      Loading…
                    </option>
                  ) : (
                    categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  {...register("email")}
                />
              </div>
              <div>
                <label
                  htmlFor="address"
                  className="text-sm font-medium text-slate-700"
                >
                  Service address
                </label>
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Building, street, city"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  {...register("address")}
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="text-sm font-medium text-slate-700"
                >
                  How can we help?
                </label>
                <textarea
                  id="message"
                  rows={3}
                  placeholder="e.g. Split-type cleaning, leak, not cooling…"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  {...register("message")}
                />
              </div>
              {err && (
                <p
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {err}
                </p>
              )}
              {sent && (
                <p
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                  role="status"
                >
                  {sent}
                </p>
              )}
              <button
                type="submit"
                disabled={catLoading || categoryOptions.length === 0}
                className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60"
              >
                Submit inquiry
              </button>
              <p className="text-center text-xs text-slate-500">
                By submitting, you agree to be contacted about your service
                request.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-slate-200 pt-10 text-center text-sm text-slate-500">
        <p>
          <span className="font-medium text-slate-700">Aircon CMS</span> — shared
          product, isolated per branch. Built for teams that outgrow chat groups
          and spreadsheets.
        </p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/for-business" className="text-brand-600 hover:underline">
            For business
          </Link>
          <Link href="/#pricing" className="text-brand-600 hover:underline">
            Pricing
          </Link>
          <Link href="/#faq" className="text-brand-600 hover:underline">
            FAQ
          </Link>
        </p>
      </footer>
    </div>
  );
}
