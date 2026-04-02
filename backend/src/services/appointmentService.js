import { prisma } from "../lib/prisma.js";
import { DEFAULT_SERVICE_CATEGORY } from "../constants/serviceCategories.js";
import {
  assertServiceCategoryForBranch,
  normalizeServiceCategoryForBranch,
} from "./branchServiceCategoryService.js";
import { assertPhilippinePhone } from "../utils/phPhone.js";

const STATUSES = new Set(["pending", "ongoing", "completed", "cancelled"]);

export async function listAppointments(branchId) {
  return prisma.appointment.findMany({
    where: { branch_id: branchId },
    orderBy: { scheduled_date: "asc" },
    include: { inquiry: { select: { id: true, customer_name: true } } },
  });
}

export async function createAppointment(branchId, data) {
  let inquiry_id = null;
  let inquiryRow = null;
  if (data.inquiry_id != null && data.inquiry_id !== "") {
    inquiry_id = Number(data.inquiry_id);
    if (Number.isNaN(inquiry_id)) throw new Error("Invalid inquiry_id");
    inquiryRow = await prisma.inquiry.findFirst({
      where: { id: inquiry_id, branch_id: branchId },
    });
    if (!inquiryRow) throw new Error("Inquiry not found for this branch");
  }
  const scheduled = new Date(data.scheduled_date);
  if (Number.isNaN(scheduled.getTime())) throw new Error("Invalid scheduled_date");

  const explicitCat =
    data.service_category != null && String(data.service_category).trim() !== "";
  const service_category = explicitCat
    ? await normalizeServiceCategoryForBranch(branchId, data.service_category)
    : await normalizeServiceCategoryForBranch(
        branchId,
        inquiryRow?.service_category ?? DEFAULT_SERVICE_CATEGORY
      );

  const contact_number = assertPhilippinePhone(data.contact_number);

  return prisma.appointment.create({
    data: {
      branch_id: branchId,
      inquiry_id,
      customer_name: data.customer_name,
      contact_number,
      service_category,
      service_type: data.service_type,
      scheduled_date: scheduled,
      status: "pending",
      notes: data.notes ?? null,
    },
    include: { inquiry: { select: { id: true, customer_name: true } } },
  });
}

export async function updateAppointment(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const existing = await prisma.appointment.findFirst({
    where: { id: idNum, branch_id: branchId },
  });
  if (!existing) return null;

  const update = {};
  if (data.status !== undefined) {
    if (!STATUSES.has(data.status)) throw new Error("Invalid status");
    update.status = data.status;
  }
  if (data.customer_name !== undefined) update.customer_name = data.customer_name;
  if (data.contact_number !== undefined) {
    update.contact_number = assertPhilippinePhone(data.contact_number);
  }
  if (data.service_type !== undefined) update.service_type = data.service_type;
  if (data.service_category !== undefined) {
    update.service_category = await assertServiceCategoryForBranch(
      branchId,
      data.service_category
    );
  }
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.scheduled_date !== undefined) {
    const scheduled = new Date(data.scheduled_date);
    if (Number.isNaN(scheduled.getTime())) throw new Error("Invalid scheduled_date");
    update.scheduled_date = scheduled;
  }

  return prisma.appointment.update({
    where: { id: idNum },
    data: update,
    include: { inquiry: { select: { id: true, customer_name: true } } },
  });
}
