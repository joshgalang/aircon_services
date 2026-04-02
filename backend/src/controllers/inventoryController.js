import * as inventoryService from "../services/inventoryService.js";

export async function list(req, res) {
  try {
    const rows = await inventoryService.listInventory(req.auth.branchId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list inventory" });
  }
}

export async function create(req, res) {
  try {
    const { item_name } = req.body ?? {};
    if (!item_name) return res.status(400).json({ error: "item_name required" });
    const row = await inventoryService.createInventoryItem(req.auth.branchId, req.body);
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Failed to create item" });
  }
}

export async function update(req, res) {
  try {
    const row = await inventoryService.updateInventoryItem(
      req.auth.branchId,
      req.params.id,
      req.body ?? {}
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    const status =
      e.message?.includes("Invalid") ||
      e.message?.includes("Insufficient") ||
      e.message?.includes("movement")
        ? 400
        : 500;
    return res.status(status).json({ error: e.message || "Failed to update" });
  }
}
