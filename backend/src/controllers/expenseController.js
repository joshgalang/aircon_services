import * as expenseService from "../services/expenseService.js";

export async function list(req, res) {
  try {
    const rows = await expenseService.listExpenses(req.auth.branchId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list expenses" });
  }
}

export async function create(req, res) {
  try {
    const row = await expenseService.createExpense(req.auth.branchId, req.body ?? {});
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to create expense";
    const status = msg.includes("Invalid") || msg.includes("required") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await expenseService.updateExpense(
      req.auth.branchId,
      req.params.id,
      req.body ?? {}
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to update";
    const status =
      msg.includes("Invalid") || msg.includes("required") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
}
