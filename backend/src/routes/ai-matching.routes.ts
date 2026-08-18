import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { aiSearchDrivers } from "../controllers/ai-matching.controller.js";

const router = Router();

router.post("/owner/ai-matchmaker/search", authMiddleware, aiSearchDrivers);

export default router;
