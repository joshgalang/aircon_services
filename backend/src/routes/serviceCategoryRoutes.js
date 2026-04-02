import { Router } from "express";
import * as serviceCategoryController from "../controllers/serviceCategoryController.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", optionalAuth, serviceCategoryController.list);
router.post("/", requireAuth, serviceCategoryController.create);
router.put("/:id", requireAuth, serviceCategoryController.update);
router.delete("/:id", requireAuth, serviceCategoryController.remove);

export default router;
