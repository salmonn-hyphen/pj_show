import { Router } from "express";
import { listAvailableCars, getCarById } from "../controllers/cars.controller.js";

const router = Router();

router.get("/", listAvailableCars);
router.get("/:carId", getCarById);

export default router;
