import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { ensureWorkflowStorage } from "../lib/workflow-status.js";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await ensureWorkflowStorage();

    const [totalUsers, totalOwners, totalDrivers, activeBookings, availableCars] =
      await Promise.all([
        prisma.user.count({ where: { role: { in: ["OWNER", "DRIVER"] } } }),
        prisma.user.count({ where: { role: "OWNER" } }),
        prisma.user.count({ where: { role: "DRIVER" } }),
        prisma.carApplication.count({
          where: { status: "BOOKING_APPROVED" },
        }),
        prisma.car.count({
          where: {
            availabilityStatus: "AVAILABLE",
            adminApprovalStatus: "APPROVED",
          },
        }),
      ]);

    const [pendingOwnerVerifications, pendingDriverVerifications, pendingCarVerifications] =
      await Promise.all([
        prisma.user.count({
          where: { role: "OWNER", verificationStatus: "PENDING" },
        }),
        prisma.driverProfile.count({
          where: { kycStatus: "PENDING" },
        }),
        prisma.car.count({
          where: { adminApprovalStatus: "PENDING" },
        }),
      ]);

    let totalRevenue = 0;
    try {
      const revenueResult = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(commission_amount), 0)::float AS total
        FROM booking_payments
        WHERE status = 'PAYMENT_VERIFIED'
      `;
      totalRevenue = Number(revenueResult[0]?.total || 0);
    } catch {
      // booking_payments table may not exist yet
    }

    let pendingPaymentApprovals = 0;
    try {
      const pendingResult = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM booking_payments
        WHERE status = 'PENDING_PAYMENT_VERIFICATION'
      `;
      pendingPaymentApprovals = pendingResult[0]?.count || 0;
    } catch {
      // booking_payments table may not exist yet
    }

    let revenueChart: { month: string; amount: number }[] = [];
    try {
      revenueChart = await prisma.$queryRaw<Array<{ month: string; amount: number }>>`
        SELECT
          TO_CHAR(confirmed_at, 'Mon YYYY') AS month,
          SUM(commission_amount)::float AS amount
        FROM booking_payments
        WHERE status = 'PAYMENT_VERIFIED'
          AND confirmed_at >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(confirmed_at, 'Mon YYYY'), DATE_TRUNC('month', confirmed_at)
        ORDER BY DATE_TRUNC('month', confirmed_at) ASC
      `;
    } catch {
      // booking_payments table may not exist yet
    }

    let userGrowth: { month: string; count: number }[] = [];
    try {
      userGrowth = await prisma.$queryRaw<Array<{ month: string; count: number }>>`
        SELECT
          TO_CHAR(created_at, 'Mon YYYY') AS month,
          COUNT(*)::int AS count
        FROM users
        WHERE role IN ('OWNER', 'DRIVER')
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `;
    } catch {
      // fallback
    }

    return res.json({
      data: {
        total_users: totalUsers,
        total_owners: totalOwners,
        total_drivers: totalDrivers,
        pending_owner_verifications: pendingOwnerVerifications,
        pending_driver_verifications: pendingDriverVerifications,
        pending_car_verifications: pendingCarVerifications,
        active_bookings: activeBookings,
        available_cars: availableCars,
        active_disputes: 0,
        pending_payment_approvals: pendingPaymentApprovals,
        total_revenue: totalRevenue,
        recent_activities: [],
        revenue_chart: revenueChart,
        user_growth: userGrowth,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
