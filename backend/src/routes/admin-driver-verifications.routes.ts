import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getPendingVerifications,
  getKYCHistoryController,
  reviewDriverKYCController,
} from "../controllers/admin-driver.controller.js";

const router = Router();

router.get("/verifications/drivers/history", authMiddleware, getKYCHistoryController);
router.get("/verifications/drivers", authMiddleware, getPendingVerifications);
router.put("/verifications/drivers/:id", authMiddleware, reviewDriverKYCController);

export default router;
