import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import accountingRoutes from "./routes/accountingRoutes.js";
import serviceCategoryRoutes from "./routes/serviceCategoryRoutes.js";
import inventoryBrandRoutes from "./routes/inventoryBrandRoutes.js";
import hqRoutes from "./routes/hqRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (_req, res) =>
  res.json({
    ok: true,
    name: "aircon-services-api",
    health: "/api/health",
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/service-categories", serviceCategoryRoutes);
app.use("/api/inventory-brands", inventoryBrandRoutes);
app.use("/api/hq", hqRoutes);
app.use("/api/ledger", ledgerRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
