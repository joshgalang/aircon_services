import { prisma } from "../lib/prisma.js";

export async function getAccountingSummary(branchId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const invoices = await prisma.invoice.findMany({
    where: { branch_id: branchId, status: { not: "void" } },
    include: { payments: true },
  });

  let outstanding = 0;
  let unpaid_invoice_count = 0;
  for (const inv of invoices) {
    const total = Number(inv.total);
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const bal = total - paid;
    if (bal > 0.005 && inv.status !== "paid") {
      outstanding += bal;
      unpaid_invoice_count += 1;
    }
  }

  const expenseAgg = await prisma.expense.aggregate({
    where: {
      branch_id: branchId,
      expense_date: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  const paymentsMonth = await prisma.payment.findMany({
    where: {
      branch_id: branchId,
      paid_at: { gte: startOfMonth },
    },
  });
  const collected_mtd = paymentsMonth.reduce(
    (s, p) => s + Number(p.amount),
    0
  );

  return {
    outstanding_total: outstanding.toFixed(2),
    unpaid_invoice_count,
    expenses_month_total: Number(expenseAgg._sum.amount ?? 0).toFixed(2),
    collected_month_total: collected_mtd.toFixed(2),
  };
}
