import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listOwnerBookings,
  getOwnerBooking,
  acceptBooking,
  rejectBooking,
} from "../controllers/owner-bookings.controller.js";

const router = Router();

router.get("/", authMiddleware, listOwnerBookings);
router.get("/:id", authMiddleware, getOwnerBooking);
router.post("/:id/accept", authMiddleware, acceptBooking);
router.post("/:id/reject", authMiddleware, rejectBooking);

export default router;
