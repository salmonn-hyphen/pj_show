import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from "../controllers/notifications.controller.js";

const router = Router();

router.get("/", authMiddleware, getNotifications);
router.post("/:id/read", authMiddleware, markNotificationRead);
router.post("/read-all", authMiddleware, markAllNotificationsRead);
router.delete("/:id", authMiddleware, deleteNotification);
router.get("/unread-count", authMiddleware, getUnreadNotificationCount);

export default router;
