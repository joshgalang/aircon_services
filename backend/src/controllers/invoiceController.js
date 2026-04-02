import * as invoiceService from "../services/invoiceService.js";

export async function list(req, res) {
  try {
    const rows = await invoiceService.listInvoices(req.auth.branchId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list invoices" });
  }
}

export async function getOne(req, res) {
  try {
    const row = await invoiceService.getInvoice(req.auth.branchId, req.params.id);
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load invoice" });
  }
}

export async function create(req, res) {
  try {
    const row = await invoiceService.createInvoice(req.auth.branchId, req.body ?? {});
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to create invoice";
    const status = msg.includes("not found") || msg.includes("Invalid") ? 400 : 500;
    return res.status(status).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await invoiceService.updateInvoice(
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
      msg.includes("not found") ||
      msg.includes("Invalid") ||
      msg.includes("Cannot") ||
      msg.includes("void")
        ? 400
        : 500;
    return res.status(status).json({ error: msg });
  }
}

export async function addPayment(req, res) {
  try {
    const row = await invoiceService.addPayment(
      req.auth.branchId,
      req.params.id,
      req.body ?? {}
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to record payment";
    const status =
      msg.includes("Invalid") ||
      msg.includes("exceeds") ||
      msg.includes("draft") ||
      msg.includes("method")
        ? 400
        : 500;
    return res.status(status).json({ error: msg });
  }
}
