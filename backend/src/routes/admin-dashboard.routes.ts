import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { getDashboardStats } from "../controllers/admin-dashboard.controller.js";

const router = Router();

router.get("/dashboard", authMiddleware, getDashboardStats);

export default router;
