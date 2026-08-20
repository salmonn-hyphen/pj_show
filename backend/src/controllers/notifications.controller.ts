import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { requireUser } from '../lib/api-auth.js';
import { serializeNotification } from '../lib/serializers.js';

export async function getNotifications(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const notifications = await prisma.notification.findMany({
      where: { receiverId: authUser.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: notifications.map(serializeNotification) });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.updateMany({
      where: { id: req.params.id, receiverId: authUser.id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.updateMany({
      where: { receiverId: authUser.id, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await prisma.notification.deleteMany({
      where: { id: req.params.id, receiverId: authUser.id },
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete notification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUnreadNotificationCount(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const count = await prisma.notification.count({
      where: { receiverId: authUser.id, isRead: false },
    });

    return res.json({ data: count });
  } catch (error: any) {
    console.error("Get unread notification count error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
