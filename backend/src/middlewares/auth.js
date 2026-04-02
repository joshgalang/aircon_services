import jwt from "jsonwebtoken";
import { DEFAULT_BRANCH_ID } from "../constants.js";

function getToken(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return null;
  return h.slice(7);
}

export function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET not configured" });
  }
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, secret);
    req.auth = {
      userId: payload.user_id,
      branchId: Number(payload.branch_id),
      role: typeof payload.role === "string" ? payload.role : "admin",
    };
    if (!req.auth.branchId || Number.isNaN(req.auth.branchId)) {
      return res.status(401).json({ error: "Invalid token branch" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * For public routes: if JWT is valid, use token branch_id; otherwise null.
 */
export function optionalAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  const token = getToken(req);
  req.auth = null;
  if (!token || !secret) return next();
  try {
    const payload = jwt.verify(token, secret);
    const branchId = Number(payload.branch_id);
    if (branchId && !Number.isNaN(branchId)) {
      req.auth = {
        userId: payload.user_id,
        branchId,
        role: typeof payload.role === "string" ? payload.role : "admin",
      };
    }
  } catch {
    /* ignore */
  }
  next();
}

/**
 * Resolves branch_id for writes: authenticated user branch, else body/query, else default.
 */
export function resolveBranchIdForWrite(req) {
  if (req.auth?.branchId) return req.auth.branchId;
  const fromBody = req.body?.branch_id;
  if (fromBody !== undefined && fromBody !== null && fromBody !== "") {
    const n = Number(fromBody);
    if (!Number.isNaN(n)) return n;
  }
  return DEFAULT_BRANCH_ID;
}
