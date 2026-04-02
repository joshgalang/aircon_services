import { Router } from "express";
import * as invoiceController from "../controllers/invoiceController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, invoiceController.list);
router.post("/", requireAuth, invoiceController.create);
router.get("/:id", requireAuth, invoiceController.getOne);
router.put("/:id", requireAuth, invoiceController.update);
router.post("/:id/payments", requireAuth, invoiceController.addPayment);

export default router;
