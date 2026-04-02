import { prisma } from "../lib/prisma.js";
import {
  assertServiceCategoryForBranch,
  normalizeServiceCategoryForBranch,
} from "./branchServiceCategoryService.js";
import { assertPhilippinePhone } from "../utils/phPhone.js";

const STATUSES = new Set(["pending", "contacted", "done"]);

export async function listInquiries(branchId) {
  return prisma.inquiry.findMany({
    where: { branch_id: branchId },
    orderBy: { created_at: "desc" },
  });
}

export async function createInquiry(branchId, data) {
  const contact_number = assertPhilippinePhone(data.contact_number);
  const service_category = await normalizeServiceCategoryForBranch(
    branchId,
    data.service_category
  );
  return prisma.inquiry.create({
    data: {
      branch_id: branchId,
      customer_name: data.customer_name,
      contact_number,
      email: data.email ?? null,
      address: data.address ?? null,
      message: data.message ?? null,
      service_category,
      status: "pending",
    },
  });
}

export async function updateInquiry(branchId, id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const existing = await prisma.inquiry.findFirst({
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
  if (data.email !== undefined) update.email = data.email;
  if (data.address !== undefined) update.address = data.address;
  if (data.message !== undefined) update.message = data.message;
  if (data.service_category !== undefined) {
    update.service_category = await assertServiceCategoryForBranch(
      branchId,
      data.service_category
    );
  }
  return prisma.inquiry.update({
    where: { id: idNum },
    data: update,
  });
}
