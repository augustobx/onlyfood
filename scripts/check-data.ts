import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../lib/prisma";

async function main() {
  const invalidRewards = await prisma.$queryRawUnsafe(`
    SELECT pr.id, pr.name, pr.productId 
    FROM PointReward pr 
    LEFT JOIN Product p ON pr.productId = p.id 
    WHERE pr.productId IS NOT NULL AND p.id IS NULL
  `);
  console.log("Invalid PointReward productIds:", invalidRewards);

  const invalidRoulette = await prisma.$queryRawUnsafe(`
    SELECT rp.id, rp.name, rp.productId 
    FROM RoulettePrize rp 
    LEFT JOIN Product p ON rp.productId = p.id 
    WHERE rp.productId IS NOT NULL AND p.id IS NULL
  `);
  console.log("Invalid RoulettePrize productIds:", invalidRoulette);

  // If there are orphan productIds, nullify them so FK constraints succeed
  if (Array.isArray(invalidRewards) && invalidRewards.length > 0) {
    console.log("Cleaning orphan productIds in PointReward...");
    await prisma.$executeRawUnsafe(`
      UPDATE PointReward pr 
      LEFT JOIN Product p ON pr.productId = p.id 
      SET pr.productId = NULL 
      WHERE pr.productId IS NOT NULL AND p.id IS NULL
    `);
  }

  if (Array.isArray(invalidRoulette) && invalidRoulette.length > 0) {
    console.log("Cleaning orphan productIds in RoulettePrize...");
    await prisma.$executeRawUnsafe(`
      UPDATE RoulettePrize rp 
      LEFT JOIN Product p ON rp.productId = p.id 
      SET rp.productId = NULL 
      WHERE rp.productId IS NOT NULL AND p.id IS NULL
    `);
  }

  console.log("Data sanitation complete.");
}

main().catch(console.error).finally(() => process.exit(0));
