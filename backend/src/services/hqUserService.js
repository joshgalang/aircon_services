import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const ROLES = new Set(["admin", "hq"]);

export async function listHqUsers() {
  return prisma.user.findMany({
    orderBy: [{ branch_id: "asc" }, { username: "asc" }],
    select: {
      id: true,
      username: true,
      role: true,
      branch_id: true,
      branch: { select: { id: true, branch_name: true } },
    },
  });
}

export async function createHqUser(data) {
  const username = String(data.username ?? "").trim();
  const password = String(data.password ?? "");
  if (!username) throw new Error("username required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const branch_id = Number(data.branch_id);
  if (Number.isNaN(branch_id)) throw new Error("branch_id required");
  const role = String(data.role ?? "admin").trim();
  if (!ROLES.has(role)) throw new Error("role must be admin or hq");
  const branch = await prisma.branch.findFirst({ where: { id: branch_id } });
  if (!branch) throw new Error("Branch not found");

  const hash = await bcrypt.hash(password, 10);
  try {
    return await prisma.user.create({
      data: { username, password: hash, branch_id, role },
      select: {
        id: true,
        username: true,
        role: true,
        branch_id: true,
        branch: { select: { id: true, branch_name: true } },
      },
    });
  } catch (e) {
    if (e.code === "P2002") throw new Error("Username already taken");
    throw e;
  }
}

export async function updateHqUser(id, data) {
  const idNum = Number(id);
  if (Number.isNaN(idNum)) return null;
  const user = await prisma.user.findUnique({ where: { id: idNum } });
  if (!user) return null;

  const nextRole =
    data.role !== undefined ? String(data.role).trim() : undefined;
  if (nextRole !== undefined && !ROLES.has(nextRole)) {
    throw new Error("role must be admin or hq");
  }

  if (
    nextRole !== undefined &&
    nextRole !== "hq" &&
    user.role === "hq"
  ) {
    const otherHq = await prisma.user.count({
      where: { role: "hq", id: { not: idNum } },
    });
    if (otherHq < 1) {
      throw new Error("Cannot demote the last HQ user");
    }
  }

  const update = {};
  if (data.branch_id !== undefined) {
    const b = Number(data.branch_id);
    if (Number.isNaN(b)) throw new Error("Invalid branch_id");
    const exists = await prisma.branch.findFirst({ where: { id: b } });
    if (!exists) throw new Error("Branch not found");
    update.branch_id = b;
  }
  if (nextRole !== undefined) update.role = nextRole;
  if (data.password !== undefined && String(data.password).trim() !== "") {
    const p = String(data.password);
    if (p.length < 6) throw new Error("Password must be at least 6 characters");
    update.password = await bcrypt.hash(p, 10);
  }

  if (Object.keys(update).length === 0) {
    return prisma.user.findUnique({
      where: { id: idNum },
      select: {
        id: true,
        username: true,
        role: true,
        branch_id: true,
        branch: { select: { id: true, branch_name: true } },
      },
    });
  }

  return prisma.user.update({
    where: { id: idNum },
    data: update,
    select: {
      id: true,
      username: true,
      role: true,
      branch_id: true,
      branch: { select: { id: true, branch_name: true } },
    },
  });
}
