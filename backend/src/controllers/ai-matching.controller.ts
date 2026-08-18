import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { getBestDriverSearchResults } from "../../service/aiMatchingService.js";

type SearchDriverApplicant = {
  id: string;
  name: string;
  city: string;
  township: string;
  average_rating: number;
  experience_years: number;
  review_count: number;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  yangon: { lat: 16.8409, lng: 96.1735 },
  kamayut: { lat: 16.8306, lng: 96.1306 },
  sanchaung: { lat: 16.8043, lng: 96.1371 },
  mandalay: { lat: 21.9588, lng: 96.0891 },
  naypyidaw: { lat: 19.7633, lng: 96.0785 },
  bago: { lat: 17.3221, lng: 96.4663 },
  mawlamyine: { lat: 16.4905, lng: 97.6283 },
  taunggyi: { lat: 20.7892, lng: 97.0378 },
  pathein: { lat: 16.7754, lng: 94.7381 },
  pyay: { lat: 18.8246, lng: 95.2222 },
  myitkyina: { lat: 25.3833, lng: 97.4 },
  lashio: { lat: 22.9333, lng: 97.75 },
  meiktila: { lat: 20.8778, lng: 95.8584 },
  monywa: { lat: 22.1086, lng: 95.1358 },
  sittwe: { lat: 20.1528, lng: 92.8677 },
  "hpa-an": { lat: 16.887, lng: 97.6333 },
  hpaan: { lat: 16.887, lng: 97.6333 },
  magway: { lat: 20.1496, lng: 94.9325 },
};

const locationAliases: Record<string, string> = {
  mandaly: "mandalay",
  manadalay: "mandalay",
  mandalaycity: "mandalay",
  rangoon: "yangon",
  yangoncity: "yangon",
  naypyitaw: "naypyidaw",
  hpa_an: "hpa-an",
  hpaan: "hpa-an",
};

function tokenize(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function compactLocation(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function levenshteinDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[a.length]![b.length]!;
}

function getLocationCoordinate(value: string) {
  const key = locationAliases[compactLocation(value)] || normalizeText(value);
  return locationCoordinates[key] || locationCoordinates[compactLocation(key)];
}

function calculateDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function inferRequestedLocation(requirements: string, applicants: SearchDriverApplicant[]) {
  const tokens = tokenize(requirements);
  const applicantLocations = applicants.flatMap((applicant) => [applicant.township, applicant.city]);
  const knownLocations = Array.from(
    new Set([
      ...Object.keys(locationCoordinates),
      ...Object.keys(locationAliases),
      ...applicantLocations.map(normalizeText),
    ]),
  ).filter((location) => location && location !== "unknown");

  let bestMatch: { location: string; distance: number } | null = null;

  for (const rawLocation of knownLocations) {
    const canonicalLocation = locationAliases[compactLocation(rawLocation)] || normalizeText(rawLocation);
    const compactCandidate = compactLocation(canonicalLocation);

    for (const token of tokens) {
      const compactToken = compactLocation(locationAliases[compactLocation(token)] || token);
      if (!compactToken) continue;

      const distance =
        compactToken === compactCandidate
          ? 0
          : levenshteinDistance(compactToken, compactCandidate);
      const allowedDistance = compactCandidate.length <= 5 ? 1 : 2;

      if (distance <= allowedDistance && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { location: canonicalLocation, distance };
      }
    }
  }

  return bestMatch?.location || null;
}

function getApplicantLocationScore(
  applicant: { city?: string; township?: string },
  requestedLocation: string | null,
) {
  if (!requestedLocation) return 0;

  const requested = normalizeText(requestedLocation);
  const township = normalizeText(String(applicant.township || ""));
  const city = normalizeText(String(applicant.city || ""));

  if (township === requested || city === requested) return 0;

  const requestedCoordinate = getLocationCoordinate(requested);
  const applicantCoordinate = getLocationCoordinate(township) || getLocationCoordinate(city);

  if (requestedCoordinate && applicantCoordinate) {
    return calculateDistanceKm(requestedCoordinate, applicantCoordinate);
  }

  return 999999;
}

function fallbackRankDrivers(requirements: string, applicants: SearchDriverApplicant[]) {
  const requestedLocation = inferRequestedLocation(requirements, applicants);

  return {
    ranked_applicants: [...applicants]
      .sort((a, b) => {
        const aLocationScore = getApplicantLocationScore(a, requestedLocation);
        const bLocationScore = getApplicantLocationScore(b, requestedLocation);

        if (aLocationScore !== bLocationScore) return aLocationScore - bLocationScore;
        if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
        return b.experience_years - a.experience_years;
      })
      .map((driver, index) => {
        const locationScore = getApplicantLocationScore(driver, requestedLocation);

        return {
          ...driver,
          rank: index + 1,
          is_recommended: index === 0,
          summary:
            requestedLocation && locationScore === 0
              ? `Exact location match for ${requestedLocation}. Ranked ahead of nearby cities, then by rating and experience.`
              : requestedLocation
                ? `Near ${requestedLocation} by location distance, then ranked by rating and experience.`
                : `Strong driver profile from ${driver.township}. Ranked by rating and experience.`,
        };
      }),
  };
}

function enforceLocationFirstRanking(
  requirements: string,
  data: any,
  applicants: SearchDriverApplicant[],
) {
  const requestedLocation = inferRequestedLocation(requirements, applicants);
  const applicantById = new Map(applicants.map((applicant) => [applicant.id, applicant]));
  const applicantByName = new Map(applicants.map((applicant) => [normalizeText(applicant.name), applicant]));

  const rankedApplicants = Array.isArray(data?.ranked_applicants) ? data.ranked_applicants : [];
  const mergedApplicants = rankedApplicants.map((ranked: any) => {
    const original =
      (ranked?.id ? applicantById.get(String(ranked.id)) : undefined) ||
      applicantByName.get(normalizeText(String(ranked?.name || "")));

    return {
      ...(original || {}),
      ...ranked,
      id: ranked?.id || original?.id,
      name: ranked?.name || original?.name || "Unknown Driver",
      city: ranked?.city || original?.city || "Unknown",
      township: ranked?.township || original?.township || "Unknown",
      average_rating: Number(ranked?.average_rating ?? original?.average_rating ?? 0),
      experience_years: Number(ranked?.experience_years ?? original?.experience_years ?? 0),
      review_count: Number(ranked?.review_count ?? original?.review_count ?? 0),
    };
  });

  for (const applicant of applicants) {
    if (!mergedApplicants.some((ranked: any) => ranked.id === applicant.id)) {
      mergedApplicants.push(applicant);
    }
  }

  return {
    ranked_applicants: mergedApplicants
      .sort((a: any, b: any) => {
        const aLocationScore = getApplicantLocationScore(a, requestedLocation);
        const bLocationScore = getApplicantLocationScore(b, requestedLocation);

        if (aLocationScore !== bLocationScore) return aLocationScore - bLocationScore;
        if (Number(b.average_rating) !== Number(a.average_rating)) {
          return Number(b.average_rating) - Number(a.average_rating);
        }
        return Number(b.experience_years) - Number(a.experience_years);
      })
      .map((driver: any, index: number) => {
        const locationScore = getApplicantLocationScore(driver, requestedLocation);

        return {
          ...driver,
          rank: index + 1,
          is_recommended: index === 0,
          summary:
            requestedLocation && locationScore === 0
              ? `Exact location match for ${requestedLocation}. ${driver.summary || ""}`.trim()
              : requestedLocation
                ? `Near ${requestedLocation} by location distance. ${driver.summary || ""}`.trim()
                : driver.summary ||
                  `Strong profile from ${driver.township}, ranked by rating and experience.`,
        };
      }),
  };
}

export async function aiSearchDrivers(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER", "ADMIN"]);
    if (!authUser) return;

    const requirements = String(req.body?.query || "").trim();
    if (!requirements) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const drivers = await prisma.user.findMany({
      where: {
        role: "DRIVER",
        isActive: true,
        OR: [
          { verificationStatus: "APPROVED" },
          { driverProfile: { adminApprovalStatus: "APPROVED" } },
        ],
      },
      select: {
        id: true,
        name: true,
        city: true,
        township: true,
        driverLicense: {
          select: {
            yearsExperience: true,
          },
        },
        receivedReviews: {
          where: { direction: "OWNER_TO_DRIVER" },
          select: {
            rating: true,
          },
        },
      },
      take: 100,
    });

    const applicants: SearchDriverApplicant[] = drivers.map((driver) => {
      const reviewCount = driver.receivedReviews.length;
      const averageRating =
        reviewCount > 0
          ? Number(
              (
                driver.receivedReviews.reduce((sum, review) => sum + review.rating, 0) /
                reviewCount
              ).toFixed(1),
            )
          : 4.5;

      return {
        id: driver.id,
        name: driver.name,
        city: driver.city || "Unknown",
        township: driver.township || "Unknown",
        average_rating: averageRating,
        experience_years: driver.driverLicense?.yearsExperience ?? 0,
        review_count: reviewCount,
      };
    });

    if (applicants.length === 0) {
      return res.json({
        success: true,
        data: { ranked_applicants: [] },
        message: "No approved drivers found.",
      });
    }

    let data;
    try {
      data = await getBestDriverSearchResults(requirements, applicants);
    } catch {
      data = fallbackRankDrivers(requirements, applicants);
    }

    return res.json({
      success: true,
      data: enforceLocationFirstRanking(requirements, data, applicants),
    });
  } catch (error: any) {
    console.error("AI driver search error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
