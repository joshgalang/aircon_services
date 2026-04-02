import { Prisma } from "@prisma/client";
import * as branchInventoryBrandService from "../services/branchInventoryBrandService.js";

export async function list(req, res) {
  try {
    const branchId = req.auth.branchId;
    const rows = await branchInventoryBrandService.listBrands(branchId);
    return res.json({
      brands: rows.map((r) => ({
        id: r.id,
        name: r.name,
        sort_order: r.sort_order,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list inventory brands" });
  }
}

export async function create(req, res) {
  try {
    const row = await branchInventoryBrandService.createBrand(
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
        .json({ error: "That brand name already exists for this branch" });
    }
    const msg = e.message || "Failed to create";
    return res.status(400).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await branchInventoryBrandService.updateBrand(
      req.auth.branchId,
      req.params.id,
      req.body ?? {}
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "That brand name already exists for this branch" });
    }
    return res.status(400).json({ error: e.message || "Failed to update" });
  }
}

export async function remove(req, res) {
  try {
    const ok = await branchInventoryBrandService.deleteBrand(
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
