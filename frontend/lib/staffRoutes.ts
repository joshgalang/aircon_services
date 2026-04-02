/** URL prefixes for the staff app (sidebar layout). */
export const STAFF_APP_PATHS = [
  "/dashboard",
  "/inquiries",
  "/appointments",
  "/inventory",
  "/billing",
  "/expenses",
  "/setup",
] as const;

export function isStaffAppPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return STAFF_APP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
