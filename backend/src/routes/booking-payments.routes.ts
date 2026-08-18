import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { uploadPaymentScreenshot } from "../lib/payment-upload.js";
import {
  submitPayment,
  getBookingPayments,
  getDriverPayments,
  getOwnerPayments,
  getPendingPayments,
  confirmPayment,
  rejectPayment,
} from "../controllers/booking-payments.controller.js";

const router = Router();

router.post("/bookings/:id/payments", authMiddleware, uploadPaymentScreenshot, submitPayment);
router.get("/bookings/:id/payments", authMiddleware, getBookingPayments);
router.get("/driver/payments", authMiddleware, getDriverPayments);
router.get("/owner/payments", authMiddleware, getOwnerPayments);
router.get("/admin/payments/pending", authMiddleware, getPendingPayments);
router.post("/admin/payments/:id/confirm", authMiddleware, confirmPayment);
router.post("/admin/payments/:id/reject", authMiddleware, rejectPayment);

export default router;
