import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  const token = jwt.sign(
    {
      user_id: user.id,
      branch_id: user.branch_id,
      role: user.role ?? "admin",
    },
    secret,
    { expiresIn: "7d" }
  );
  return {
    token,
    user: {
      user_id: user.id,
      branch_id: user.branch_id,
      username: user.username,
      role: user.role,
    },
  };
}
