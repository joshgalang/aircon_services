import { Prisma } from "@prisma/client";
import * as branchServiceCategoryService from "../services/branchServiceCategoryService.js";
import { DEFAULT_BRANCH_ID } from "../constants.js";

/** Query branch_id first so public pages can pin a branch even if the user is logged in. */
function resolveBranchId(req) {
  const fromQuery = req.query?.branch_id;
  if (fromQuery !== undefined && fromQuery !== null && fromQuery !== "") {
    const n = Number(fromQuery);
    if (!Number.isNaN(n)) return n;
  }
  if (req.auth?.branchId) return req.auth.branchId;
  return DEFAULT_BRANCH_ID;
}

export async function list(req, res) {
  try {
    const branchId = resolveBranchId(req);
    const rows = await branchServiceCategoryService.listCategories(branchId);
    return res.json({
      categories: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        label: r.label,
        sort_order: r.sort_order,
      })),
      default_slug: "other",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list categories" });
  }
}

export async function create(req, res) {
  try {
    const row = await branchServiceCategoryService.createCategory(
      req.auth.branchId,
      req.body ?? {}
    );
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "That slug already exists for this branch" });
    }
    const msg = e.message || "Failed to create";
    return res.status(400).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await branchServiceCategoryService.updateCategory(
      req.auth.branchId,
      req.params.id,
      req.body ?? {}
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to update" });
  }
}

export async function remove(req, res) {
  try {
    const ok = await branchServiceCategoryService.deleteCategory(
      req.auth.branchId,
      req.params.id
    );
    if (!ok) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to delete" });
  }
}
