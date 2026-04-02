import * as accountingSummaryService from "../services/accountingSummaryService.js";

export async function summary(req, res) {
  try {
    const data = await accountingSummaryService.getAccountingSummary(
      req.auth.branchId
    );
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to load summary" });
  }
}
