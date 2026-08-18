import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listOwnerCars,
  createCar,
  updateCar,
  toggleAvailability,
  deleteCar,
} from "../controllers/owner-cars.controller.js";

const router = Router();

router.get("/", authMiddleware, listOwnerCars);
router.post("/", authMiddleware, createCar);
router.put("/:carId", authMiddleware, updateCar);
router.post("/:carId/toggle-availability", authMiddleware, toggleAvailability);
router.delete("/:carId", authMiddleware, deleteCar);

export default router;
