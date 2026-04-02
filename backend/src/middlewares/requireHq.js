export function requireHq(req, res, next) {
  const role = req.auth?.role ?? "admin";
  if (role !== "hq") {
    return res.status(403).json({ error: "HQ role required for this action" });
  }
  next();
}
