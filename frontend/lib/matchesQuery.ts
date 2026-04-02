export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const h = haystack.toLowerCase();
  for (const part of q.split(/\s+/).filter(Boolean)) {
    if (!h.includes(part)) return false;
  }
  return true;
}
