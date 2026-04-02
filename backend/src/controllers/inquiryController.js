import * as inquiryService from "../services/inquiryService.js";
import { resolveBranchIdForWrite } from "../middlewares/auth.js";

export async function list(req, res) {
  try {
    const rows = await inquiryService.listInquiries(req.auth.branchId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list inquiries" });
  }
}

export async function create(req, res) {
  try {
    const branchId = resolveBranchIdForWrite(req);
    const { customer_name, contact_number } = req.body ?? {};
    if (!customer_name || !contact_number) {
      return res.status(400).json({ error: "customer_name and contact_number required" });
    }
    const row = await inquiryService.createInquiry(branchId, req.body);
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to create inquiry";
    const badInput =
      msg.includes("Phone") ||
      msg.includes("PH number") ||
      msg.includes("valid PH");
    return res.status(badInput ? 400 : 500).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await inquiryService.updateInquiry(req.auth.branchId, req.params.id, req.body ?? {});
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to update";
    const badInput =
      msg.includes("Invalid") ||
      msg.includes("Phone") ||
      msg.includes("valid PH");
    return res.status(badInput ? 400 : 500).json({ error: msg });
  }
}
