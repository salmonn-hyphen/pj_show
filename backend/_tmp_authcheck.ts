import fs from "fs";
import prisma from "./src/lib/prisma.js";
import { hashToken } from "./src/lib/auth-service.js";

async function main() {
  const accessToken = "f7259a8a5aa21eb3a2c47541ded1dfb236fa8164d9640169900edc942fc41f3d";
  const refreshToken = "715bfc8e41270e6bd2f17007b934c999c1770c7eb531ab147fde5ff429690f58bd34d633cf0dfab75c145cff205a9709";
  const now = new Date();
  const byAccess = await prisma.account.findFirst({
    where: { accessToken, accessTokenExpiresAt: { gt: now } },
    select: { userId: true, accessTokenExpiresAt: true },
  });
  const byRefresh = await prisma.account.findFirst({
    where: { refreshToken: hashToken(refreshToken), refreshTokenExpiresAt: { gt: now } },
    select: { userId: true, refreshTokenExpiresAt: true },
  });
  fs.writeFileSync("_tmp_authcheck.json", JSON.stringify({
    now: now.toISOString(),
    byAccess,
    byRefresh,
    hash: hashToken(refreshToken),
  }, null, 2));
  process.exit(0);
}

main();