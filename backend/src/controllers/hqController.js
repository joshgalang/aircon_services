import * as hqService from "../services/hqService.js";
import * as hqUserService from "../services/hqUserService.js";

export async function branches(_req, res) {
  try {
    const rows = await hqService.listAllBranches();
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list branches" });
  }
}

export async function createBranch(req, res) {
  try {
    const row = await hqService.createBranch(req.body ?? {});
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to create branch" });
  }
}

export async function updateBranch(req, res) {
  try {
    const row = await hqService.updateBranch(req.params.id, req.body ?? {});
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to update branch" });
  }
}

export async function users(_req, res) {
  try {
    const rows = await hqUserService.listHqUsers();
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list users" });
  }
}

export async function createUser(req, res) {
  try {
    const row = await hqUserService.createHqUser(req.body ?? {});
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to create user";
    const status = msg.includes("taken") ? 409 : 400;
    return res.status(status).json({ error: msg });
  }
}

export async function updateUser(req, res) {
  try {
    const row = await hqUserService.updateHqUser(req.params.id, req.body ?? {});
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to update user" });
  }
}

export async function summary(req, res) {
  try {
    const data = await hqService.getHqSummary(req.query ?? {});
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to build summary" });
  }
}

export async function activity(req, res) {
  try {
    const lines = await hqService.getHqActivity(req.query ?? {});
    return res.json({ lines });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to load activity" });
  }
}

export async function report(req, res) {
  try {
    const summary = await hqService.getHqSummary(req.query ?? {});
    const dl = Math.min(Number(req.query.detail_limit) || 80, 200);
    const lines = await hqService.getHqActivity({
      ...req.query,
      limit: dl,
    });
    return res.json({ ...summary, detail_lines: lines });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to build report" });
  }
}
