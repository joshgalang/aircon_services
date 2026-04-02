import { prisma } from "../lib/prisma.js";
import { PAYMENT_METHODS } from "../constants/billing.js";

const DIRECTIONS = new Set(["in", "out"]);

function dec(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) throw new Error("Invalid amount");
  return x.toFixed(2);
}

function resolveBranchIdForLedger(auth, body) {
  const isHq = auth.role === "hq";
  if (isHq && body.branch_id != null && body.branch_id !== "") {
    const n = Number(body.branch_id);
    if (Number.isNaN(n)) throw new Error("Invalid branch_id");
    return n;
  }
  return auth.branchId;
}

export async function createLedgerEntry(auth, data) {
  const branch_id = resolveBranchIdForLedger(auth, data);
  const branch = await prisma.branch.findFirst({ where: { id: branch_id } });
  if (!branch) throw new Error("Branch not found");

  const direction = String(data.direction ?? "").trim().toLowerCase();
  if (!DIRECTIONS.has(direction)) throw new Error("direction must be in or out");

  const method = String(data.method ?? "").trim();
  if (!PAYMENT_METHODS.has(method)) throw new Error("Invalid payment method");

  const purpose = String(data.purpose ?? "").trim();
  if (!purpose) throw new Error("purpose required");

  return prisma.manualLedgerEntry.create({
    data: {
      branch_id,
      direction,
      amount: dec(data.amount),
      method,
      reference: data.reference?.trim() || null,
      counterparty_name: data.counterparty_name?.trim() || null,
      purpose,
      paid_at:
        data.paid_at != null && data.paid_at !== ""
          ? new Date(data.paid_at)
          : new Date(),
      notes: data.notes?.trim() || null,
    },
    include: { branch: { select: { id: true, branch_name: true } } },
  });
}

export async function listLedgerEntries(auth, query) {
  const isHq = auth.role === "hq";
  const where = {};

  if (isHq && query.branch_id != null && query.branch_id !== "") {
    const n = Number(query.branch_id);
    if (!Number.isNaN(n)) where.branch_id = n;
  } else if (!isHq) {
    where.branch_id = auth.branchId;
  }

  if (query.from != null && query.from !== "") {
    const d = new Date(String(query.from).includes("T") ? query.from : query.from + "T00:00:00");
    if (!Number.isNaN(d.getTime())) {
      where.paid_at = { ...(where.paid_at ?? {}), gte: d };
    }
  }
  if (query.to != null && query.to !== "") {
    const raw = String(query.to);
    const d = new Date(raw.includes("T") ? raw : raw + "T23:59:59.999");
    if (!Number.isNaN(d.getTime())) {
      where.paid_at = { ...(where.paid_at ?? {}), lte: d };
    }
  }

  return prisma.manualLedgerEntry.findMany({
    where,
    orderBy: [{ paid_at: "desc" }, { id: "desc" }],
    take: Math.min(Number(query.limit) || 200, 500),
    include: { branch: { select: { id: true, branch_name: true } } },
  });
}
