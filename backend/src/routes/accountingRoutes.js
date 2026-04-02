import { Router } from "express";
import * as accountingController from "../controllers/accountingController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/summary", requireAuth, accountingController.summary);

export default router;
