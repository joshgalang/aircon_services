"use client";

import { useAuth } from "@/providers/AuthProvider";

export function HqOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "hq") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-medium">HQ access only</p>
        <p className="mt-2 text-amber-800/90">
          Branch setup, user management, multi-branch dashboards, the activity
          monitor, and consolidated reports are limited to the HQ role. Use the seeded
          account{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs text-slate-800">
            hq / hq123
          </code>{" "}
          after running{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">npx prisma db seed</code>
          , or set <code className="rounded bg-white px-1 text-xs">role = hq</code> on a
          user in the database.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
