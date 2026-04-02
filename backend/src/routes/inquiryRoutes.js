import { Router } from "express";
import * as inquiryController from "../controllers/inquiryController.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, inquiryController.list);
router.post("/", optionalAuth, inquiryController.create);
router.put("/:id", requireAuth, inquiryController.update);

export default router;
