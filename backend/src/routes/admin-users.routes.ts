import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  listUsers,
  getUser,
  suspendUser,
  unsuspendUser,
} from "../controllers/admin-users.controller.js";

const router = Router();

router.get("/users", authMiddleware, listUsers);
router.get("/users/:id", authMiddleware, getUser);
router.post("/users/:id/suspend", authMiddleware, suspendUser);
router.post("/users/:id/unsuspend", authMiddleware, unsuspendUser);

export default router;
