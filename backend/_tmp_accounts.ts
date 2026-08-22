import fs from "fs";
import prisma from "./src/lib/prisma.js";

async function main() {
  const acc = await prisma.account.findMany({
    where: { providerId: "credential" },
    select: {
      userId: true,
      providerId: true,
      accessToken: true,
      accessTokenExpiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
      user: { select: { email: true, role: true } },
    },
    take: 20,
  });
  fs.writeFileSync("_tmp_accounts.json", JSON.stringify(acc, null, 2));
  process.exit(0);
}

main();