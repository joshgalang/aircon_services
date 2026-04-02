import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import * as ledgerController from "../controllers/ledgerController.js";

const router = Router();

router.get("/", requireAuth, ledgerController.list);
router.post("/", requireAuth, ledgerController.create);

export default router;
