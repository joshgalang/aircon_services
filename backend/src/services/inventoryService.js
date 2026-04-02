import { prisma } from "../lib/prisma.js";

const LOG_TYPES = new Set(["IN", "OUT"]);

function optTrim(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Empty → null; else non‑negative finite number for Decimal fields. */
function optDecimalCreate(v, label) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${label}`);
  return n;
}

/** For updates: undefined = skip; null/"" = clear. */
function optDecimalUpdate(v, label) {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${label}`);
  return n;
}

export async function listInventory(branchId) {
  return prisma.inventoryItem.findMany({
    where: { branch_id: branchId },
    orderBy: { item_name: "asc" },
    include: {
      logs: { orderBy: { created_at: "desc" }, take: 20 },
    },
  });
}

export async function createInventoryItem(branchId, data) {
  const qty = Math.max(0, Number(data.quantity) || 0);
  const price =
    data.price === undefined || data.price === null || data.price === ""
      ? null
      : String(data.price);

  const item = await prisma.inventoryItem.create({
    data: {
      branch_id: branchId,
      item_name: data.item_name,
      category: data.category ?? null,
      brand: optTrim(data.brand) ?? null,
      model_number: optTrim(data.model_number) ?? null,
      part_number: optTrim(data.part_number) ?? null,
      capacity_hp: optDecimalCreate(data.capacity_hp, "capacity_hp"),
      weight_kg: optDecimalCreate(data.weight_kg, "weight_kg"),
      refrigerant: optTrim(data.refrigerant) ?? null,
      voltage: optTrim(data.voltage) ?? null,
      notes: optTrim(data.notes) ?? null,
      quantity: qty,
      unit: data.unit ?? null,
      price: price,
    },
  });

  if (qty > 0) {
    await prisma.inventoryLog.create({
      data: {
        branch_id: branchId,
        item_id: item.id,
        type: "IN",
        quantity: qty,
      },
    });
  }

  return prisma.inventoryItem.findFirst({
    where: { id: item.id, branch_id: branchId },
    include: { logs: { orderBy: { created_at: "desc" }, take: 20 } },
  });
}

export async function updateInventoryItem(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const existing = await prisma.inventoryItem.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!existing) return null;

  const update = {};
  if (data.item_name !== undefined) update.item_name = data.item_name;
  if (data.category !== undefined) update.category = data.category;
  if (data.unit !== undefined) update.unit = data.unit;
  if (data.price !== undefined) {
    update.price =
      data.price === null || data.price === "" ? null : String(data.price);
  }
  if (data.brand !== undefined) update.brand = optTrim(data.brand);
  if (data.model_number !== undefined)
    update.model_number = optTrim(data.model_number);
  if (data.part_number !== undefined)
    update.part_number = optTrim(data.part_number);
  if (data.notes !== undefined) update.notes = optTrim(data.notes);
  if (data.capacity_hp !== undefined) {
    const x = optDecimalUpdate(data.capacity_hp, "capacity_hp");
    if (x !== undefined) update.capacity_hp = x;
  }
  if (data.weight_kg !== undefined) {
    const x = optDecimalUpdate(data.weight_kg, "weight_kg");
    if (x !== undefined) update.weight_kg = x;
  }
  if (data.refrigerant !== undefined) update.refrigerant = optTrim(data.refrigerant);
  if (data.voltage !== undefined) update.voltage = optTrim(data.voltage);

  const movement = data.movement;
  if (movement && typeof movement === "object") {
    const type = movement.type;
    const q = Number(movement.quantity);
    if (!LOG_TYPES.has(type)) throw new Error("Invalid movement type");
    if (!Number.isFinite(q) || q <= 0) throw new Error("Invalid movement quantity");
    let next = existing.quantity;
    if (type === "IN") next += q;
    else next -= q;
    if (next < 0) throw new Error("Insufficient stock");
    update.quantity = next;
    await prisma.inventoryLog.create({
      data: {
        branch_id: branchId,
        item_id: idNum,
        type,
        quantity: q,
      },
    });
  } else if (data.quantity !== undefined) {
    const newQty = Math.max(0, Number(data.quantity));
    if (Number.isNaN(newQty)) throw new Error("Invalid quantity");
    if (newQty !== existing.quantity) {
      const delta = newQty - existing.quantity;
      await prisma.inventoryLog.create({
        data: {
          branch_id: branchId,
          item_id: idNum,
          type: delta >= 0 ? "IN" : "OUT",
          quantity: Math.abs(delta),
        },
      });
    }
    update.quantity = newQty;
  }

  if (Object.keys(update).length > 0) {
    await prisma.inventoryItem.update({
      where: { id: idNum },
      data: update,
    });
  }

  return prisma.inventoryItem.findFirst({
    where: { id: idNum, branch_id: branchId },
    include: { logs: { orderBy: { created_at: "desc" }, take: 20 } },
  });
}
