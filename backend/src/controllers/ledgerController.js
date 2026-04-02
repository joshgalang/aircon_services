import * as manualLedgerService from "../services/manualLedgerService.js";

export async function list(req, res) {
  try {
    const rows = await manualLedgerService.listLedgerEntries(req.auth, req.query ?? {});
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list entries" });
  }
}

export async function create(req, res) {
  try {
    const row = await manualLedgerService.createLedgerEntry(
      req.auth,
      req.body ?? {}
    );
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message || "Failed to create entry" });
  }
}
