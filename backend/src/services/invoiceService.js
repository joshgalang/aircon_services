import { prisma } from "../lib/prisma.js";
import { INVOICE_STATUSES, PAYMENT_METHODS } from "../constants/billing.js";

function dec(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) throw new Error("Invalid amount");
  return x.toFixed(2);
}

async function generateInvoiceNumber(branchId) {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await prisma.invoice.count({
    where: {
      branch_id: branchId,
      issued_at: { gte: start, lt: end },
    },
  });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

async function syncInvoiceStatus(invoiceId) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!inv || inv.status === "void") return;

  const total = Number(inv.total);
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  let status = inv.status;
  let paid_at = inv.paid_at;

  if (paid >= total - 0.005) {
    status = "paid";
    if (!paid_at) paid_at = new Date();
  } else if (paid > 0) {
    status = "partial";
    paid_at = null;
  } else {
    if (status === "partial" || status === "paid") status = "sent";
    paid_at = null;
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, paid_at },
  });
}

const include = {
  payments: { orderBy: { paid_at: "desc" } },
  appointment: {
    select: { id: true, service_type: true, scheduled_date: true },
  },
  inquiry: { select: { id: true, customer_name: true } },
};

export async function listInvoices(branchId) {
  const rows = await prisma.invoice.findMany({
    where: { branch_id: branchId },
    orderBy: { issued_at: "desc" },
    include,
  });
  return rows.map((inv) => withBalance(inv));
}

function withBalance(inv) {
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(inv.total);
  return {
    ...inv,
    amount_paid: paid.toFixed(2),
    balance_due: Math.max(0, total - paid).toFixed(2),
  };
}

export async function getInvoice(branchId, id) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const inv = await prisma.invoice.findFirst({
    where: { id: idNum, branch_id: branchId },
    include,
  });
  return inv ? withBalance(inv) : null;
}

export async function createInvoice(branchId, data) {
  const customer_name = data.customer_name?.trim();
  const contact_number = data.contact_number?.trim() || null;
  if (!customer_name) throw new Error("customer_name required");

  let appointment_id = null;
  if (data.appointment_id != null && data.appointment_id !== "") {
    appointment_id = Number(data.appointment_id);
    if (Number.isNaN(appointment_id)) throw new Error("Invalid appointment_id");
    const ap = await prisma.appointment.findFirst({
      where: { id: appointment_id, branch_id: branchId },
    });
    if (!ap) throw new Error("Appointment not found for this branch");
  }

  let inquiry_id = null;
  if (data.inquiry_id != null && data.inquiry_id !== "") {
    inquiry_id = Number(data.inquiry_id);
    if (Number.isNaN(inquiry_id)) throw new Error("Invalid inquiry_id");
    const inq = await prisma.inquiry.findFirst({
      where: { id: inquiry_id, branch_id: branchId },
    });
    if (!inq) throw new Error("Inquiry not found for this branch");
  }

  const subtotal = dec(data.subtotal);
  const tax_amount = data.tax_amount != null && data.tax_amount !== ""
    ? dec(data.tax_amount)
    : "0.00";
  const total = (Number(subtotal) + Number(tax_amount)).toFixed(2);

  let status = data.status ?? "draft";
  if (!INVOICE_STATUSES.has(status)) throw new Error("Invalid status");

  const invoice_number = await generateInvoiceNumber(branchId);

  const due_date =
    data.due_date != null && data.due_date !== ""
      ? new Date(data.due_date)
      : null;
  if (due_date && Number.isNaN(due_date.getTime())) throw new Error("Invalid due_date");

  try {
    const inv = await prisma.invoice.create({
      data: {
        branch_id: branchId,
        appointment_id,
        inquiry_id,
        invoice_number,
        customer_name,
        contact_number,
        job_description: data.job_description?.trim() || null,
        subtotal,
        tax_amount,
        total,
        status,
        due_date,
        notes: data.notes?.trim() || null,
      },
      include,
    });
    return withBalance(inv);
  } catch (e) {
    if (e.code === "P2002") {
      const retryNum = await generateInvoiceNumber(branchId);
      const inv = await prisma.invoice.create({
        data: {
          branch_id: branchId,
          appointment_id,
          inquiry_id,
          invoice_number: `${retryNum}-R`,
          customer_name,
          contact_number,
          job_description: data.job_description?.trim() || null,
          subtotal,
          tax_amount,
          total,
          status,
          due_date,
          notes: data.notes?.trim() || null,
        },
        include,
      });
      return withBalance(inv);
    }
    throw e;
  }
}

export async function updateInvoice(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const existing = await prisma.invoice.findFirst({
    where: { id: idNum, branch_id: branchId },
    include: { payments: true },
  });
  if (!existing) return null;

  if (existing.status === "void") {
    throw new Error("Cannot edit void invoice");
  }

  const update = {};

  if (data.status !== undefined) {
    if (!INVOICE_STATUSES.has(data.status)) throw new Error("Invalid status");
    if (data.status === "void") {
      if (existing.payments.length > 0) {
        throw new Error("Cannot void invoice with payments; reverse payments in your books first");
      }
      update.status = "void";
      const inv = await prisma.invoice.update({
        where: { id: idNum },
        data: update,
        include,
      });
      return withBalance(inv);
    }
    update.status = data.status;
  }

  const paidTotal = existing.payments.reduce((s, p) => s + Number(p.amount), 0);
  const canEditMoney = existing.status === "draft" || paidTotal < 0.005;

  if (canEditMoney) {
    if (data.customer_name !== undefined)
      update.customer_name = data.customer_name.trim();
    if (data.contact_number !== undefined)
      update.contact_number = data.contact_number?.trim() || null;
    if (data.job_description !== undefined)
      update.job_description = data.job_description?.trim() || null;
    if (data.subtotal !== undefined) {
      const sub = dec(data.subtotal);
      const tax =
        data.tax_amount !== undefined && data.tax_amount !== ""
          ? dec(data.tax_amount)
          : existing.tax_amount.toString();
      update.subtotal = sub;
      update.tax_amount = tax;
      update.total = (Number(sub) + Number(tax)).toFixed(2);
    } else if (data.tax_amount !== undefined && data.tax_amount !== "") {
      const tax = dec(data.tax_amount);
      update.tax_amount = tax;
      update.total = (
        Number(existing.subtotal) + Number(tax)
      ).toFixed(2);
    }
  }

  if (data.due_date !== undefined) {
    if (data.due_date === null || data.due_date === "")
      update.due_date = null;
    else {
      const d = new Date(data.due_date);
      if (Number.isNaN(d.getTime())) throw new Error("Invalid due_date");
      update.due_date = d;
    }
  }
  if (data.notes !== undefined) update.notes = data.notes?.trim() || null;

  if (Object.keys(update).length === 0) {
    return getInvoice(branchId, idNum);
  }

  const inv = await prisma.invoice.update({
    where: { id: idNum },
    data: update,
    include,
  });
  await syncInvoiceStatus(idNum);
  return getInvoice(branchId, idNum);
}

export async function addPayment(branchId, invoiceId, data) {
  const idNum = Number(invoiceId);
  if (Number.isNaN(idNum)) return null;

  const inv = await prisma.invoice.findFirst({
    where: { id: idNum, branch_id: branchId, status: { not: "void" } },
    include: { payments: true },
  });
  if (!inv) return null;
  if (inv.status === "draft") {
    throw new Error("Send invoice before recording payments (change status from draft)");
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid payment amount");

  const method = data.method;
  if (!method || !PAYMENT_METHODS.has(method)) throw new Error("Invalid payment method");

  const paidSoFar = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(inv.total) - paidSoFar;
  if (amount > balance + 0.01) throw new Error("Payment exceeds balance due");

  await prisma.payment.create({
    data: {
      branch_id: branchId,
      invoice_id: idNum,
      amount: amount.toFixed(2),
      method,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
      paid_at:
        data.paid_at != null && data.paid_at !== ""
          ? new Date(data.paid_at)
          : new Date(),
    },
  });

  await syncInvoiceStatus(idNum);
  return getInvoice(branchId, idNum);
}
