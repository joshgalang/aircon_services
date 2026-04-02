import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { requireHq } from "../middlewares/requireHq.js";
import * as hqController from "../controllers/hqController.js";

const router = Router();

router.get("/branches", requireAuth, requireHq, hqController.branches);
router.post("/branches", requireAuth, requireHq, hqController.createBranch);
router.put("/branches/:id", requireAuth, requireHq, hqController.updateBranch);
router.get("/users", requireAuth, requireHq, hqController.users);
router.post("/users", requireAuth, requireHq, hqController.createUser);
router.put("/users/:id", requireAuth, requireHq, hqController.updateUser);
router.get("/summary", requireAuth, requireHq, hqController.summary);
router.get("/activity", requireAuth, requireHq, hqController.activity);
router.get("/report", requireAuth, requireHq, hqController.report);

export default router;
