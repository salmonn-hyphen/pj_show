import fs from "fs";
import prisma from "./src/lib/prisma.js";

async function main() {
  const token = fs.readFileSync("_tmp_token.txt", "utf8").trim();
  console.log("CHECK TOKEN:", token);
  const a = await prisma.account.findFirst({
    where: { accessToken: token },
    select: { accessTokenExpiresAt: true, user: { select: { email: true } } },
  });
  console.log("DB MATCH:", JSON.stringify(a));
  console.log("NOW:", new Date().toISOString());
  process.exit(0);
}

main();