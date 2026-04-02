"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { isStaffAppPath } from "@/lib/staffRoutes";
import {
  IconBanknotes,
  IconCalendar,
  IconCube,
  IconDocumentText,
  IconInbox,
  IconSquares2X2,
} from "@/components/admin/AdminNavIcons";

const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard", icon: IconSquares2X2 },
  { href: "/inquiries", label: "Inquiries", icon: IconInbox },
  { href: "/appointments", label: "Appointments", icon: IconCalendar },
  { href: "/inventory", label: "Inventory", icon: IconCube },
  { href: "/billing", label: "Billing", icon: IconDocumentText },
  { href: "/expenses", label: "Expenses", icon: IconBanknotes },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (user && isStaffAppPath(pathname)) {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <Link href="/" className="min-w-0 shrink-0">
            <BrandLogo />
          </Link>
          {!user && (
            <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
              <Link
                href="/for-business"
                className={`rounded-md px-2 py-1.5 ${
                  pathname === "/for-business"
                    ? "bg-brand-100 text-brand-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                For business
              </Link>
              <Link
                href="/#pricing"
                className="rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100"
              >
                Pricing
              </Link>
              <Link
                href="/#faq"
                className="rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100"
              >
                FAQ
              </Link>
            </nav>
          )}
          {user && (
            <nav className="hidden items-center gap-1 sm:flex">
              {dashboardLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
                    pathname === href
                      ? "bg-brand-100 text-brand-900"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {user ? (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {user.username}{" "}
              <span className="text-slate-400">· branch {user.branch_id}</span>
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-900"
          >
            Staff login
          </Link>
        )}
      </div>
      {!user && (
        <nav className="flex flex-wrap gap-1 border-t border-slate-100 px-4 py-2 md:hidden">
          <Link
            href="/for-business"
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              pathname === "/for-business"
                ? "bg-brand-100 text-brand-900"
                : "text-slate-600"
            }`}
          >
            For business
          </Link>
          <Link
            href="/#pricing"
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-600"
          >
            FAQ
          </Link>
        </nav>
      )}
      {user && (
        <nav className="flex gap-1 border-t border-slate-100 px-4 py-2 sm:hidden">
          {dashboardLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                pathname === href
                  ? "bg-brand-100 text-brand-900"
                  : "text-slate-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
