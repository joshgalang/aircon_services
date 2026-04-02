import { Router } from "express";
import * as appointmentController from "../controllers/appointmentController.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", requireAuth, appointmentController.list);
router.post("/", requireAuth, appointmentController.create);
router.put("/:id", requireAuth, appointmentController.update);

export default router;
