import { Router } from "express";
import * as inventoryBrandController from "../controllers/inventoryBrandController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, inventoryBrandController.list);
router.post("/", requireAuth, inventoryBrandController.create);
router.put("/:id", requireAuth, inventoryBrandController.update);
router.delete("/:id", requireAuth, inventoryBrandController.remove);

export default router;
