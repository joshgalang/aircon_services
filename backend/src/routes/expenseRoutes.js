import { Router } from "express";
import * as expenseController from "../controllers/expenseController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, expenseController.list);
router.post("/", requireAuth, expenseController.create);
router.put("/:id", requireAuth, expenseController.update);

export default router;
