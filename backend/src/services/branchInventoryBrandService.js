import { prisma } from "../lib/prisma.js";
import { DEFAULT_INVENTORY_BRANDS } from "../constants/inventoryBrands.js";

export async function ensureDefaultBrands(branchId) {
  const count = await prisma.branchInventoryBrand.count({
    where: { branch_id: branchId },
  });
  if (count > 0) return;
  await prisma.branchInventoryBrand.createMany({
    data: DEFAULT_INVENTORY_BRANDS.map((name, i) => ({
      branch_id: branchId,
      name,
      sort_order: i,
    })),
    skipDuplicates: true,
  });
}

export async function listBrands(branchId) {
  await ensureDefaultBrands(branchId);
  return prisma.branchInventoryBrand.findMany({
    where: { branch_id: branchId },
    orderBy: [{ sort_order: "asc" }, { id: "asc" }],
  });
}

export async function createBrand(branchId, data) {
  const name = String(data.name ?? "").trim();
  if (!name) throw new Error("name required");
  if (name.length > 128) throw new Error("name too long (max 128)");

  let sort_order;
  if (data.sort_order !== undefined && data.sort_order !== "") {
    sort_order = Number(data.sort_order);
  } else {
    const agg = await prisma.branchInventoryBrand.aggregate({
      where: { branch_id: branchId },
      _max: { sort_order: true },
    });
    sort_order = (agg._max.sort_order ?? -1) + 1;
  }
  if (!Number.isFinite(sort_order)) throw new Error("Invalid sort_order");

  return prisma.branchInventoryBrand.create({
    data: {
      branch_id: branchId,
      name,
      sort_order,
    },
  });
}

export async function updateBrand(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const row = await prisma.branchInventoryBrand.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!row) return null;

  const update = {};
  if (data.name !== undefined) {
    const name = String(data.name).trim();
    if (!name) throw new Error("name required");
    if (name.length > 128) throw new Error("name too long (max 128)");
    update.name = name;
  }
  if (data.sort_order !== undefined) {
    const n = Number(data.sort_order);
    if (!Number.isFinite(n)) throw new Error("Invalid sort_order");
    update.sort_order = n;
  }
  if (Object.keys(update).length === 0) return row;

  return prisma.branchInventoryBrand.update({
    where: { id: idNum },
    data: update,
  });
}

export async function deleteBrand(branchId, id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return false;
  const row = await prisma.branchInventoryBrand.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!row) return false;
  await prisma.branchInventoryBrand.delete({ where: { id: idNum } });
  return true;
}
