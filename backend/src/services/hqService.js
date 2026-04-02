import { prisma } from "../lib/prisma.js";

export async function listAllBranches() {
  return prisma.branch.findMany({
    orderBy: { id: "asc" },
    select: { id: true, branch_name: true, address: true, created_at: true },
  });
}

function rangeOrThrow(fromStr, toStr) {
  const now = new Date();
  const endDefault = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  const startDefault = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const from =
    fromStr && String(fromStr).trim() !== ""
      ? new Date(
          String(fromStr).includes("T")
            ? fromStr
            : String(fromStr) + "T00:00:00"
        )
      : startDefault;
  const to =
    toStr && String(toStr).trim() !== ""
      ? new Date(
          String(toStr).includes("T")
            ? toStr
            : String(toStr) + "T23:59:59.999"
        )
      : endDefault;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  return { from, to };
}

function branchWhere(branchId) {
  if (branchId == null || branchId === "") return {};
  const n = Number(branchId);
  if (Number.isNaN(n)) return {};
  return { branch_id: n };
}

export async function getHqSummary(query) {
  const { from, to } = rangeOrThrow(query.from, query.to);
  const bf = branchWhere(query.branch_id);

  const branches = await prisma.branch.findMany({ orderBy: { id: "asc" } });

  const [
    inquiryGroups,
    apptGroups,
    invGroups,
    payGroups,
    expGroups,
    ledIn,
    ledOut,
  ] = await Promise.all([
    prisma.inquiry.groupBy({
      by: ["branch_id"],
      where: { created_at: { gte: from, lte: to }, ...bf },
      _count: { id: true },
    }),
    prisma.appointment.groupBy({
      by: ["branch_id"],
      where: { scheduled_date: { gte: from, lte: to }, ...bf },
      _count: { id: true },
    }),
    prisma.invoice.groupBy({
      by: ["branch_id"],
      where: { issued_at: { gte: from, lte: to }, ...bf },
      _count: { id: true },
    }),
    prisma.payment.groupBy({
      by: ["branch_id"],
      where: { paid_at: { gte: from, lte: to }, ...bf },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["branch_id"],
      where: { expense_date: { gte: from, lte: to }, ...bf },
      _sum: { amount: true },
    }),
    prisma.manualLedgerEntry.groupBy({
      by: ["branch_id"],
      where: {
        paid_at: { gte: from, lte: to },
        direction: "in",
        ...bf,
      },
      _sum: { amount: true },
    }),
    prisma.manualLedgerEntry.groupBy({
      by: ["branch_id"],
      where: {
        paid_at: { gte: from, lte: to },
        direction: "out",
        ...bf,
      },
      _sum: { amount: true },
    }),
  ]);

  const mapCount = (groups) =>
    Object.fromEntries(groups.map((g) => [g.branch_id, g._count.id]));
  const mapSum = (groups) =>
    Object.fromEntries(
      groups.map((g) => [
        g.branch_id,
        Number(g._sum.amount ?? 0),
      ])
    );

  const iq = mapCount(inquiryGroups);
  const ap = mapCount(apptGroups);
  const inv = mapCount(invGroups);
  const coll = mapSum(payGroups);
  const exp = mapSum(expGroups);
  const cin = mapSum(ledIn);
  const cout = mapSum(ledOut);

  const rows = branches.map((b) => ({
    branch_id: b.id,
    branch_name: b.branch_name,
    inquiries: iq[b.id] ?? 0,
    appointments: ap[b.id] ?? 0,
    invoices_issued: inv[b.id] ?? 0,
    collections: (coll[b.id] ?? 0).toFixed(2),
    expenses: (exp[b.id] ?? 0).toFixed(2),
    cashbook_in: (cin[b.id] ?? 0).toFixed(2),
    cashbook_out: (cout[b.id] ?? 0).toFixed(2),
  }));

  const totals = rows.reduce(
    (a, r) => ({
      inquiries: a.inquiries + r.inquiries,
      appointments: a.appointments + r.appointments,
      invoices_issued: a.invoices_issued + r.invoices_issued,
      collections: a.collections + Number(r.collections),
      expenses: a.expenses + Number(r.expenses),
      cashbook_in: a.cashbook_in + Number(r.cashbook_in),
      cashbook_out: a.cashbook_out + Number(r.cashbook_out),
    }),
    {
      inquiries: 0,
      appointments: 0,
      invoices_issued: 0,
      collections: 0,
      expenses: 0,
      cashbook_in: 0,
      cashbook_out: 0,
    }
  );

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    branches: rows,
    totals: {
      ...totals,
      collections: totals.collections.toFixed(2),
      expenses: totals.expenses.toFixed(2),
      cashbook_in: totals.cashbook_in.toFixed(2),
      cashbook_out: totals.cashbook_out.toFixed(2),
    },
  };
}

export async function getHqActivity(query) {
  const { from, to } = rangeOrThrow(query.from, query.to);
  const bf = branchWhere(query.branch_id);
  const take = Math.min(Number(query.limit) || 150, 300);

  const [payments, expenses, ledger, inquiries, appointments] =
    await Promise.all([
      prisma.payment.findMany({
        where: { paid_at: { gte: from, lte: to }, ...bf },
        take,
        orderBy: { paid_at: "desc" },
        include: {
          invoice: {
            select: {
              invoice_number: true,
              customer_name: true,
            },
          },
          branch: { select: { branch_name: true } },
        },
      }),
      prisma.expense.findMany({
        where: { expense_date: { gte: from, lte: to }, ...bf },
        take,
        orderBy: { expense_date: "desc" },
        include: { branch: { select: { branch_name: true } } },
      }),
      prisma.manualLedgerEntry.findMany({
        where: { paid_at: { gte: from, lte: to }, ...bf },
        take,
        orderBy: { paid_at: "desc" },
        include: { branch: { select: { branch_name: true } } },
      }),
      prisma.inquiry.findMany({
        where: { created_at: { gte: from, lte: to }, ...bf },
        take: Math.floor(take / 3),
        orderBy: { created_at: "desc" },
        include: { branch: { select: { branch_name: true } } },
      }),
      prisma.appointment.findMany({
        where: { scheduled_date: { gte: from, lte: to }, ...bf },
        take: Math.floor(take / 3),
        orderBy: { scheduled_date: "desc" },
        include: { branch: { select: { branch_name: true } } },
      }),
    ]);

  const lines = [];

  for (const p of payments) {
    lines.push({
      source: "invoice_payment",
      id: p.id,
      branch_id: p.branch_id,
      branch_name: p.branch.branch_name,
      at: p.paid_at.toISOString(),
      amount: Number(p.amount),
      direction: "in",
      method: p.method,
      reference: p.reference,
      counterparty: p.invoice?.customer_name ?? null,
      description: `Payment · Invoice ${p.invoice?.invoice_number ?? p.invoice_id}`,
    });
  }
  for (const e of expenses) {
    lines.push({
      source: "expense",
      id: e.id,
      branch_id: e.branch_id,
      branch_name: e.branch.branch_name,
      at: e.expense_date.toISOString(),
      amount: Number(e.amount),
      direction: "out",
      method: e.payment_method,
      reference: e.reference,
      counterparty: e.vendor,
      description: e.description,
    });
  }
  for (const l of ledger) {
    lines.push({
      source: l.direction === "in" ? "cashbook_in" : "cashbook_out",
      id: l.id,
      branch_id: l.branch_id,
      branch_name: l.branch.branch_name,
      at: l.paid_at.toISOString(),
      amount: Number(l.amount),
      direction: l.direction,
      method: l.method,
      reference: l.reference,
      counterparty: l.counterparty_name,
      description: l.purpose,
    });
  }
  for (const i of inquiries) {
    lines.push({
      source: "inquiry",
      id: i.id,
      branch_id: i.branch_id,
      branch_name: i.branch.branch_name,
      at: i.created_at.toISOString(),
      amount: null,
      direction: null,
      method: null,
      reference: null,
      counterparty: i.customer_name,
      description: `Inquiry · ${i.service_category} · ${i.status}`,
    });
  }
  for (const a of appointments) {
    lines.push({
      source: "appointment",
      id: a.id,
      branch_id: a.branch_id,
      branch_name: a.branch.branch_name,
      at: a.scheduled_date.toISOString(),
      amount: null,
      direction: null,
      method: null,
      reference: null,
      counterparty: a.customer_name,
      description: `Appointment · ${a.service_type} · ${a.status}`,
    });
  }

  lines.sort((x, y) => new Date(y.at) - new Date(x.at));
  return lines.slice(0, take * 2);
}

export async function createBranch(data) {
  const branch_name = String(data.branch_name ?? "").trim();
  if (!branch_name) throw new Error("branch_name required");
  return prisma.branch.create({
    data: {
      branch_name,
      address: data.address?.trim() || null,
    },
  });
}

export async function updateBranch(id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const existing = await prisma.branch.findUnique({ where: { id: idNum } });
  if (!existing) return null;
  const update = {};
  if (data.branch_name !== undefined) {
    const n = String(data.branch_name).trim();
    if (!n) throw new Error("branch_name required");
    update.branch_name = n;
  }
  if (data.address !== undefined) {
    update.address =
      data.address === null || data.address === ""
        ? null
        : String(data.address).trim() || null;
  }
  if (Object.keys(update).length === 0) return existing;
  return prisma.branch.update({ where: { id: idNum }, data: update });
}
