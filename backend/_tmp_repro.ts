import crypto from "crypto";
import prisma from "./src/lib/prisma.js";
import { serializeOwnerProfile } from "./src/lib/serializers.js";

async function main() {
  const userId = "97535ae8-33d5-4f57-a9ba-a88c2f109b1f";
  const name = "Owner Test Update";
  const phone = "09990000099";
  const nrcText = undefined;
  const address = "Test Address 123";
  const city = "Mandalay";
  const township = "Aungmyaythazan";

  try {
    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId },
      create: {
        id: crypto.randomUUID(),
        userId,
        address,
        nrcText: nrcText ?? "",
        nrcFrontImage: "",
        nrcBackImage: "",
        adminApprovalStatus: "PENDING",
      },
      update: {
        address,
        ...(nrcText !== undefined ? { nrcText, adminApprovalStatus: "PENDING", approvedAt: null } : {}),
      },
    });
    console.log("ownerProfile OK");

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        address,
        city,
        township,
      },
      include: { ownerProfile: true },
    });
    console.log("user update OK:", updatedUser.name, updatedUser.phone, updatedUser.city);

    const out = serializeOwnerProfile(ownerProfile, updatedUser);
    console.log("serialize OK:", out.address, out.city, out.township, out.user?.name);
  } catch (err) {
    console.error("ERROR:", err);
  }
  process.exit(0);
}

main();