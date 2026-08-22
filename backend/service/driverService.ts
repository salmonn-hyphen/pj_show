import { findUserById, updateDriverProfile, findDriverProfileByUserId, submitKYCDocuments } from "../respositry/driverRespository.js";

export async function updateProfile(userId: string, data: { name: string; phone?: string; address?: string; bio?: string }) {
  const currentUser = await findUserById(userId);
  if (!currentUser) {
    throw new Error("User not found");
  }

  if (data.phone !== undefined && data.phone !== currentUser.phone) {
    throw new Error("Phone number cannot be changed after registration");
  }

  const updateData: any = {
    name: data.name,
  };

  if (data.address !== undefined) {
    updateData.address = data.address;
  }
  if (data.bio !== undefined) {
    updateData.bio = data.bio;
  }

  return updateDriverProfile(userId, updateData);
}

// Generate a publicly accessible URL for a file saved to disk by multer diskStorage.
// `file.filename` is set by diskStorage (e.g. "1748393912345-abc123_nrcFront.png").
// The static route /uploads/kyc is served by Express in index.ts.
function getFileUrl(file: any): string {
  const filename = file.filename as string;
  const BASE_URL = process.env.BACKEND_URL || "http://localhost:3000";
  return `${BASE_URL}/uploads/kyc/${filename}`;
}

export async function getDriverKyc(userId: string) {
  return findDriverProfileByUserId(userId);
}

export async function submitKyc(
  userId: string,
  files: {
    nrcFront?: any;
    nrcBack?: any;
    selfie?: any;
    drivingLicenseFront?: any;
    drivingLicenseBack?: any;
  }
) {
  const { nrcFront, nrcBack, selfie, drivingLicenseFront, drivingLicenseBack } = files;
  if (!nrcFront || !nrcBack || !selfie || !drivingLicenseFront || !drivingLicenseBack) {
    throw new Error("Missing required KYC documents");
  }

  // Files are already saved to disk by multer diskStorage — just resolve their URLs
  const nrcFrontUrl = getFileUrl(nrcFront);
  const nrcBackUrl = getFileUrl(nrcBack);
  const selfieUrl = getFileUrl(selfie);
  const drivingLicenseFrontUrl = getFileUrl(drivingLicenseFront);
  const drivingLicenseBackUrl = getFileUrl(drivingLicenseBack);

  return submitKYCDocuments(userId, {
    nrcFrontUrl,
    nrcBackUrl,
    selfieUrl,
    drivingLicenseFrontUrl,
    drivingLicenseBackUrl,
  });
}
