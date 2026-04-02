import * as appointmentService from "../services/appointmentService.js";

export async function list(req, res) {
  try {
    const rows = await appointmentService.listAppointments(req.auth.branchId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to list appointments" });
  }
}

export async function create(req, res) {
  try {
    const { customer_name, contact_number, service_type, scheduled_date } = req.body ?? {};
    if (!customer_name || !contact_number || !service_type || !scheduled_date) {
      return res.status(400).json({
        error: "customer_name, contact_number, service_type, scheduled_date required",
      });
    }
    const row = await appointmentService.createAppointment(req.auth.branchId, req.body);
    return res.status(201).json(row);
  } catch (e) {
    console.error(e);
    const msg = e.message || "Failed to create appointment";
    const status =
      msg.includes("not found") ||
      msg.includes("Invalid") ||
      msg.includes("Phone") ||
      msg.includes("valid PH")
        ? 400
        : 500;
    return res.status(status).json({ error: msg });
  }
}

export async function update(req, res) {
  try {
    const row = await appointmentService.updateAppointment(
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
      msg.includes("Invalid") || msg.includes("Phone") || msg.includes("valid PH")
        ? 400
        : 500;
    return res.status(status).json({ error: msg });
  }
}
