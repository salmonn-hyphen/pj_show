import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createDriverBooking,
  listDriverBookings,
  getDriverBooking,
} from "../controllers/driver-bookings.controller.js";

const router = Router();

router.post("/", authMiddleware, createDriverBooking);
router.get("/", authMiddleware, listDriverBookings);
router.get("/:id", authMiddleware, getDriverBooking);

export default router;
