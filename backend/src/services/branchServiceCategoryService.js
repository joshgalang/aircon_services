import { prisma } from "../lib/prisma.js";
import {
  DEFAULT_SERVICE_CATEGORY,
  SERVICE_CATEGORY_OPTIONS,
} from "../constants/serviceCategories.js";

const SLUG_RE = /^[a-z][a-z0-9_]{0,47}$/;

export async function ensureDefaultCategories(branchId) {
  const count = await prisma.branchServiceCategory.count({
    where: { branch_id: branchId },
  });
  if (count > 0) return;
  await prisma.branchServiceCategory.createMany({
    data: SERVICE_CATEGORY_OPTIONS.map((o, i) => ({
      branch_id: branchId,
      slug: o.value,
      label: o.label,
      sort_order: i,
    })),
    skipDuplicates: true,
  });
}

export async function listCategories(branchId) {
  await ensureDefaultCategories(branchId);
  return prisma.branchServiceCategory.findMany({
    where: { branch_id: branchId },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });
}

function slugifyLabel(label) {
  const s = String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return s || "category";
}

export async function createCategory(branchId, data) {
  let slug = String(data.slug ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (!slug) slug = slugifyLabel(data.label);
  if (!SLUG_RE.test(slug)) {
    slug = ("c_" + slug.replace(/[^a-z0-9_]/g, "")).slice(0, 48);
  }
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "Invalid slug: use lowercase letters, numbers, underscore; start with a letter"
    );
  }
  const label = String(data.label ?? "").trim();
  if (!label) throw new Error("label required");

  let sort_order;
  if (data.sort_order !== undefined && data.sort_order !== "") {
    sort_order = Number(data.sort_order);
  } else {
    const agg = await prisma.branchServiceCategory.aggregate({
      where: { branch_id: branchId },
      _max: { sort_order: true },
    });
    sort_order = (agg._max.sort_order ?? -1) + 1;
  }
  if (!Number.isFinite(sort_order)) throw new Error("Invalid sort_order");

  return prisma.branchServiceCategory.create({
    data: {
      branch_id: branchId,
      slug,
      label,
      sort_order,
    },
  });
}

export async function updateCategory(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const row = await prisma.branchServiceCategory.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!row) return null;

  const update = {};
  if (data.label !== undefined) {
    const label = String(data.label).trim();
    if (!label) throw new Error("label required");
    update.label = label;
  }
  if (data.sort_order !== undefined) {
    const n = Number(data.sort_order);
    if (!Number.isFinite(n)) throw new Error("Invalid sort_order");
    update.sort_order = n;
  }
  if (Object.keys(update).length === 0) return row;

  return prisma.branchServiceCategory.update({
    where: { id: idNum },
    data: update,
  });
}

export async function deleteCategory(branchId, id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return false;
  const row = await prisma.branchServiceCategory.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!row) return false;
  if (row.slug === DEFAULT_SERVICE_CATEGORY) {
    throw new Error("Cannot delete the default category");
  }
  await prisma.branchServiceCategory.delete({ where: { id: idNum } });
  return true;
}

export async function normalizeServiceCategoryForBranch(branchId, input) {
  const rows = await listCategories(branchId);
  const set = new Set(rows.map((r) => r.slug));
  const v = typeof input === "string" ? input.trim() : "";
  if (set.has(v)) return v;
  return DEFAULT_SERVICE_CATEGORY;
}

export async function assertServiceCategoryForBranch(branchId, input) {
  const rows = await listCategories(branchId);
  const set = new Set(rows.map((r) => r.slug));
  const v = typeof input === "string" ? input.trim() : "";
  if (!set.has(v)) throw new Error("Invalid service_category");
  return v;
}
