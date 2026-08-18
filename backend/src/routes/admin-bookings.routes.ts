import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listAdminBookings,
  acceptAdminBooking,
  rejectAdminBooking,
  sendAgreement,
} from "../controllers/admin-bookings.controller.js";

const router = Router();

router.get("/", authMiddleware, listAdminBookings);
router.post("/:id/accept", authMiddleware, acceptAdminBooking);
router.post("/:id/reject", authMiddleware, rejectAdminBooking);
router.post("/:id/send-agreement", authMiddleware, sendAgreement);

export default router;
