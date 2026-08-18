import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listPendingOwnerVerifications,
  verifyOwner,
  getOwnerDocuments,
  listPendingCarVerifications,
  verifyCar,
} from "../controllers/admin-verifications.controller.js";

const router = Router();

router.get("/verifications/owners", authMiddleware, listPendingOwnerVerifications);
router.post("/verifications/owners/:userId", authMiddleware, verifyOwner);
router.get("/users/:userId/owner-documents", authMiddleware, getOwnerDocuments);
router.get("/verifications/cars", authMiddleware, listPendingCarVerifications);
router.post("/verifications/cars/:carId", authMiddleware, verifyCar);

export default router;
