// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
