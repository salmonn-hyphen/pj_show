import crypto from "crypto";
import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { isApprovedOwner, serializeCar } from "../lib/serializers.js";

export const fuelTypeMap: Record<string, "PETROL" | "DIESEL" | "EV"> = {
  petrol: "PETROL",
  PETROL: "PETROL",
  diesel: "DIESEL",
  DIESEL: "DIESEL",
  electric: "EV",
  ev: "EV",
  EV: "EV",
};

export const paymentTypeMap: Record<string, "DAILY" | "WEEKLY" | "MONTHLY"> = {
  daily: "DAILY",
  DAILY: "DAILY",
  weekly: "WEEKLY",
  WEEKLY: "WEEKLY",
  monthly: "MONTHLY",
  MONTHLY: "MONTHLY",
};

export const rentalTypeMap: Record<string, "DRIVER_HOME" | "OWNER_HOME"> = {
  driver_home: "DRIVER_HOME",
  DRIVER_HOME: "DRIVER_HOME",
  owner_home: "OWNER_HOME",
  OWNER_HOME: "OWNER_HOME",
};

export function parseCarPayload(body: any) {
  const {
    brand,
    model,
    year,
    color,
    license_number,
    license_plate,
    fuel_type,
    owner_book,
    rental_period,
    rental_payment_type,
    rental_type,
    rental_price,
    daily_rate,
    deposit_amount,
    front_image,
    back_image,
    left_image,
    right_image,
  } = body;

  return {
    brand,
    model,
    year,
    color,
    licenseNumber: license_number || license_plate,
    fuelType: fuel_type,
    ownerBook: owner_book,
    rentalPeriod: rental_period,
    rentalPaymentType: rental_payment_type,
    rentalType: rental_type,
    rentalPrice: rental_price ?? daily_rate,
    depositAmount: deposit_amount,
    frontImage: front_image,
    backImage: back_image,
    leftImage: left_image,
    rightImage: right_image,
  };
}

export function validateCarPayload(payload: ReturnType<typeof parseCarPayload>, res: Response) {
  if (
    !payload.brand ||
    !payload.model ||
    !payload.licenseNumber ||
    !payload.fuelType ||
    !payload.ownerBook ||
    !payload.rentalPaymentType ||
    !payload.rentalType ||
    !payload.rentalPrice
  ) {
    res.status(400).json({ error: "Missing required car fields" });
    return null;
  }

  if (!payload.frontImage || !payload.backImage || !payload.leftImage || !payload.rightImage) {
    res.status(400).json({ error: "Front, back, left, and right car images are required" });
    return null;
  }

  const mappedFuelType = fuelTypeMap[String(payload.fuelType)] || fuelTypeMap[String(payload.fuelType).toLowerCase()];
  if (!mappedFuelType) {
    res.status(400).json({ error: "Fuel type must be petrol, diesel, or electric" });
    return null;
  }

  const mappedPaymentType = paymentTypeMap[String(payload.rentalPaymentType)] || paymentTypeMap[String(payload.rentalPaymentType).toLowerCase()];
  if (!mappedPaymentType) {
    res.status(400).json({ error: "Rental payment type must be daily, weekly, or monthly" });
    return null;
  }

  const mappedRentalType = rentalTypeMap[String(payload.rentalType)] || rentalTypeMap[String(payload.rentalType).toLowerCase()];
  if (!mappedRentalType) {
    res.status(400).json({ error: "Rental type must be driver home or owner home" });
    return null;
  }

  return { mappedFuelType, mappedPaymentType, mappedRentalType };
}

export async function listOwnerCars(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const cars = await prisma.car.findMany({
      where: { ownerId: authUser.id },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: cars.map(serializeCar) });
  } catch (error: any) {
    console.error("Get owner cars error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const car = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Get owner car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const owner = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { ownerProfile: true },
    });

    if (!owner || !isApprovedOwner(owner)) {
      return res.status(403).json({ error: "Owner KYC must be approved before posting cars" });
    }

    const payload = parseCarPayload(req.body);
    const validated = validateCarPayload(payload, res);
    if (!validated) return;

    const car = await prisma.car.create({
      data: {
        id: crypto.randomUUID(),
        ownerId: owner.id,
        brand: payload.brand,
        model: payload.model,
        year: payload.year ? Number(payload.year) : null,
        color: payload.color || null,
        licenseNumber: payload.licenseNumber,
        fuelType: validated.mappedFuelType,
        ownerBook: payload.ownerBook,
        rentalPeriod: payload.rentalPeriod || null,
        rentalPaymentType: validated.mappedPaymentType,
        rentalType: validated.mappedRentalType,
        rentalPrice: String(payload.rentalPrice),
        depositAmount: String(payload.depositAmount || 0),
        availabilityStatus: "AVAILABLE",
        adminApprovalStatus: "PENDING",
        carImages: {
          create: {
            id: crypto.randomUUID(),
            frontImage: payload.frontImage,
            backImage: payload.backImage,
            leftImage: payload.leftImage,
            rightImage: payload.rightImage,
          },
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.status(201).json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Create car error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "License number is already used" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
      include: { carImages: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    if (existing.adminApprovalStatus === "APPROVED") {
      return res.status(403).json({ error: "Approved cars cannot be edited" });
    }

    const payload = parseCarPayload(req.body);
    const validated = validateCarPayload(payload, res);
    if (!validated) return;

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        brand: payload.brand,
        model: payload.model,
        year: payload.year ? Number(payload.year) : null,
        color: payload.color || null,
        licenseNumber: payload.licenseNumber,
        fuelType: validated.mappedFuelType,
        ownerBook: payload.ownerBook,
        rentalPeriod: payload.rentalPeriod || null,
        rentalPaymentType: validated.mappedPaymentType,
        rentalType: validated.mappedRentalType,
        rentalPrice: String(payload.rentalPrice),
        depositAmount: String(payload.depositAmount || 0),
        adminApprovalStatus: "PENDING",
        approvedAt: null,
        carImages: {
          upsert: {
            create: {
              id: crypto.randomUUID(),
              frontImage: payload.frontImage,
              backImage: payload.backImage,
              leftImage: payload.leftImage,
              rightImage: payload.rightImage,
            },
            update: {
              frontImage: payload.frontImage,
              backImage: payload.backImage,
              leftImage: payload.leftImage,
              rightImage: payload.rightImage,
            },
          },
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Update car error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "License number is already used" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function toggleAvailability(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    const car = await prisma.car.update({
      where: { id: existing.id },
      data: {
        availabilityStatus: existing.availabilityStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Toggle car availability error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteCar(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.car.findFirst({
      where: { id: req.params.carId, ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Car not found" });
    }

    await prisma.car.delete({ where: { id: existing.id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}