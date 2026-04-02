import { useMemo } from "react";
import { matchesQuery } from "@/lib/matchesQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function useFilteredRows<T>(
  rows: T[],
  searchInput: string,
  getSearchableText: (row: T) => string,
  debounceMs = 120
): T[] {
  const debounced = useDebouncedValue(searchInput, debounceMs);
  return useMemo(() => {
    if (!debounced.trim()) return rows;
    return rows.filter((r) => matchesQuery(getSearchableText(r), debounced));
  }, [rows, debounced, getSearchableText]);
}
