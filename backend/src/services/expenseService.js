import { prisma } from "../lib/prisma.js";
import { normalizeExpenseCategory } from "../constants/expenseCategories.js";

const PAYMENT_METHODS = new Set([
  "cash",
  "gcash",
  "maya",
  "bank_transfer",
  "card",
  "cheque",
  "other",
]);

function dec(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) throw new Error("Invalid amount");
  return x.toFixed(2);
}

export async function listExpenses(branchId) {
  return prisma.expense.findMany({
    where: { branch_id: branchId },
    orderBy: { expense_date: "desc" },
  });
}

export async function createExpense(branchId, data) {
  const description = data.description?.trim();
  if (!description) throw new Error("description required");

  const expense_date =
    data.expense_date != null && data.expense_date !== ""
      ? new Date(data.expense_date)
      : new Date();
  if (Number.isNaN(expense_date.getTime())) throw new Error("Invalid expense_date");

  let payment_method = null;
  if (data.payment_method != null && data.payment_method !== "") {
    if (!PAYMENT_METHODS.has(data.payment_method))
      throw new Error("Invalid payment_method");
    payment_method = data.payment_method;
  }

  return prisma.expense.create({
    data: {
      branch_id: branchId,
      category: normalizeExpenseCategory(data.category),
      description,
      amount: dec(data.amount),
      vendor: data.vendor?.trim() || null,
      expense_date,
      payment_method,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function updateExpense(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;

  const existing = await prisma.expense.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!existing) return null;

  const update = {};
  if (data.description !== undefined) {
    const d = data.description?.trim();
    if (!d) throw new Error("description required");
    update.description = d;
  }
  if (data.category !== undefined)
    update.category = normalizeExpenseCategory(data.category);
  if (data.amount !== undefined) update.amount = dec(data.amount);
  if (data.vendor !== undefined) update.vendor = data.vendor?.trim() || null;
  if (data.expense_date !== undefined) {
    const d = new Date(data.expense_date);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid expense_date");
    update.expense_date = d;
  }
  if (data.payment_method !== undefined) {
    if (data.payment_method === null || data.payment_method === "")
      update.payment_method = null;
    else if (PAYMENT_METHODS.has(data.payment_method))
      update.payment_method = data.payment_method;
    else throw new Error("Invalid payment_method");
  }
  if (data.reference !== undefined) update.reference = data.reference?.trim() || null;
  if (data.notes !== undefined) update.notes = data.notes?.trim() || null;

  if (Object.keys(update).length === 0) return existing;

  return prisma.expense.update({
    where: { id: idNum },
    data: update,
  });
}
