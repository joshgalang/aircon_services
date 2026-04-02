"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { BrandLogo } from "@/components/BrandLogo";
import {
  IconArrowRightOnRectangle,
  IconArrowsRightLeft,
  IconBanknotes,
  IconBars3,
  IconCalendar,
  IconChartBar,
  IconClipboardList,
  IconCog6Tooth,
  IconCube,
  IconDocumentText,
  IconGlobeAlt,
  IconHome,
  IconInbox,
  IconBuildingOffice2,
  IconUsers,
  IconSquares2X2,
  IconXMark,
} from "@/components/admin/AdminNavIcons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
};

function buildStaffNavSections(role: string | undefined): NavSection[] {
  const sections: NavSection[] = [
    {
      id: "overview",
      title: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: IconSquares2X2 },
      ],
    },
    {
      id: "customers",
      title: "Customers & jobs",
      items: [
        { href: "/inquiries", label: "Inquiries", icon: IconInbox },
        { href: "/appointments", label: "Appointments", icon: IconCalendar },
      ],
    },
    {
      id: "stock",
      title: "Stock & materials",
      items: [{ href: "/inventory", label: "Inventory", icon: IconCube }],
    },
    {
      id: "accounting",
      title: "Accounting & billing",
      items: [
        { href: "/billing", label: "Billing", icon: IconDocumentText },
        { href: "/expenses", label: "Expenses", icon: IconBanknotes },
        {
          href: "/setup/cashbook",
          label: "Cashbook",
          icon: IconArrowsRightLeft,
        },
      ],
    },
  ];

  if (role === "hq") {
    sections.push({
      id: "hq",
      title: "Head office",
      items: [
        { href: "/setup/hq", label: "Multi-branch HQ", icon: IconGlobeAlt },
        {
          href: "/setup/branches",
          label: "Branches",
          icon: IconBuildingOffice2,
        },
        { href: "/setup/users", label: "Users", icon: IconUsers },
        {
          href: "/setup/activity",
          label: "All activity",
          icon: IconClipboardList,
        },
        { href: "/setup/reports", label: "Reports", icon: IconChartBar },
      ],
    });
  }

  sections.push({
    id: "settings",
    title: "Settings",
    items: [
      {
        href: "/setup/service-categories",
        label: "Service setup",
        icon: IconCog6Tooth,
      },
      {
        href: "/setup/inventory-brands",
        label: "Inventory brands",
        icon: IconClipboardList,
      },
    ],
  });

  return sections;
}

function flattenNavItems(sections: NavSection[]): NavItem[] {
  return sections.flatMap((s) => s.items);
}

function navPageTitle(pathname: string, sections: NavSection[]): string {
  const items = flattenNavItems(sections);
  const match = [...items]
    .filter(
      (n) => pathname === n.href || pathname.startsWith(`${n.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Staff";
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, ready } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const navSections = useMemo(
    () => buildStaffNavSections(user?.role),
    [user?.role]
  );

  const [confirmDialog, confirm] = useConfirmDialog();

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        <p className="text-sm">Loading workspace…</p>
      </div>
    );
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav
      className="flex flex-1 flex-col overflow-y-auto px-3 py-3"
      aria-label="Staff"
    >
      {navSections.map((section, idx) => (
        <div
          key={section.id}
          className={
            idx > 0 ? "mt-4 border-t border-slate-100 pt-4" : ""
          }
        >
          <p
            className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            id={`nav-section-${section.id}`}
          >
            {section.title}
          </p>
          <ul
            className="flex flex-col gap-0.5"
            aria-labelledby={`nav-section-${section.id}`}
          >
            {section.items.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <IconHome className="h-5 w-5 shrink-0" />
          Customer site
        </Link>
      </div>
    </nav>
  );

  return (
    <ToastProvider>
    <div className="flex min-h-screen bg-slate-100/80">
      {confirmDialog}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        id="staff-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%-3rem,17.5rem)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Staff navigation"
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-100 px-4 lg:h-16">
          <Link
            href="/dashboard"
            className="min-w-0"
            onClick={closeMobile}
          >
            <BrandLogo className="scale-95" />
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={closeMobile}
            aria-label="Close sidebar"
          >
            <IconXMark className="h-5 w-5" />
          </button>
        </div>

        <NavLinks onNavigate={closeMobile} />

        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
            <p className="truncate font-medium text-slate-900">{user?.username}</p>
            <p className="text-xs text-slate-500">
              Branch {user?.branch_id}
              {user?.role === "hq" && (
                <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-900">
                  HQ
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              closeMobile();
              const ok = await confirm({
                title: "Log out?",
                message: "You will need to sign in again to access staff tools.",
                confirmLabel: "Log out",
              });
              if (!ok) return;
              logout();
            }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <IconArrowRightOnRectangle className="h-5 w-5 text-slate-500" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="staff-sidebar"
            aria-label="Open menu"
          >
            <IconBars3 className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {navPageTitle(pathname, navSections)}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.username} · branch {user?.branch_id}
            </p>
          </div>
        </header>

        <main
          id="staff-main"
          className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8"
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
