import prisma from "./src/lib/prisma.js";
import { buildSessionTokens, persistTokens } from "./src/lib/auth-service.js";

async function main() {
  const user = await prisma.user.findFirst({ where: { role: "OWNER", email: "owner.seed@taximeikswe.test" } });
  if (!user) {
    console.log("NO SEED OWNER");
    process.exit(1);
  }
  const tokens = buildSessionTokens();
  await persistTokens(user.id, tokens);
  console.log(JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
  process.exit(0);
}

main();