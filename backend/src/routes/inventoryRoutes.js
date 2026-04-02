import { Router } from "express";
import * as inventoryController from "../controllers/inventoryController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, inventoryController.list);
router.post("/", requireAuth, inventoryController.create);
router.put("/:id", requireAuth, inventoryController.update);

export default router;
