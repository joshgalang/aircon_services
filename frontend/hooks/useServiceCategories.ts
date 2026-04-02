"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import {
  DEFAULT_SERVICE_CATEGORY,
  fallbackServiceCategoryLabel,
} from "@/lib/serviceCategories";

export type ServiceCategoryRow = {
  id: number;
  slug: string;
  label: string;
  sort_order: number;
};

type ApiResponse = {
  categories: ServiceCategoryRow[];
  default_slug: string;
};

/**
 * Staff: omit `publicBranchId` so the JWT branch is used.
 * Public/marketing: pass `publicBranchId` as query (takes priority over JWT on the API).
 */
export function useServiceCategories(opts?: { publicBranchId?: number }) {
  const [categories, setCategories] = useState<ServiceCategoryRow[]>([]);
  const [defaultSlug, setDefaultSlug] = useState(DEFAULT_SERVICE_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: Record<string, number> = {};
    if (opts?.publicBranchId != null) {
      params.branch_id = opts.publicBranchId;
    }
    api
      .get<ApiResponse>("/service-categories", { params })
      .then((res) => {
        if (cancelled) return;
        setCategories(res.data.categories ?? []);
        setDefaultSlug(res.data.default_slug || DEFAULT_SERVICE_CATEGORY);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load service categories.");
          setCategories([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts?.publicBranchId]);

  const options = useMemo(
    () => categories.map((c) => ({ value: c.slug, label: c.label })),
    [categories]
  );

  const labelFor = useCallback(
    (slug: string | null | undefined) => {
      if (!slug) return "—";
      const row = categories.find((c) => c.slug === slug);
      return row?.label ?? fallbackServiceCategoryLabel(slug);
    },
    [categories]
  );

  return {
    loading,
    error,
    categories,
    options,
    defaultSlug,
    labelFor,
  };
}
