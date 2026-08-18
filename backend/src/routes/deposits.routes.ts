import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { uploadPaymentScreenshot } from "../lib/payment-upload.js";
import {
  submitDeposit,
  getBookingDepositHandler,
  getDriverDeposits,
  getOwnerDeposits,
  freezeDeposit,
  releaseDeposit,
  deductDeposit,
  cancelBooking,
} from "../controllers/deposits.controller.js";

const router = Router();

router.post("/bookings/:id/deposits", authMiddleware, uploadPaymentScreenshot, submitDeposit);
router.get("/bookings/:id/deposits", authMiddleware, getBookingDepositHandler);
router.get("/driver/deposits", authMiddleware, getDriverDeposits);
router.get("/owner/deposits", authMiddleware, getOwnerDeposits);
router.post("/admin/deposits/:id/freeze", authMiddleware, freezeDeposit);
router.post("/admin/deposits/:id/release", authMiddleware, releaseDeposit);
router.post("/admin/deposits/:id/deduct", authMiddleware, deductDeposit);
router.post("/bookings/:id/cancel", authMiddleware, cancelBooking);

export default router;
