import fs from "fs";
import prisma from "./src/lib/prisma.js";

async function main() {
  const users = await prisma.user.findMany({
    where: { role: "OWNER" },
    include: { ownerProfile: true },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  const out = users.map((u) => ({
    id: u.id,
    name: u.name,
    phone: u.phone,
    email: u.email,
    city: u.city,
    township: u.township,
    address: u.address,
    profilePhoto: u.profilePhoto,
    ownerProfile: u.ownerProfile,
  }));
  fs.writeFileSync("_tmp_out.json", JSON.stringify(out, null, 2));
  process.exit(0);
}

main();