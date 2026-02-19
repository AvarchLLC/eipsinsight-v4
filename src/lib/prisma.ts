import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Prisma Accelerate acts as a connection pooler between Vercel serverless
// and Aiven, preventing "too many clients" (53300) errors.
// The accelerateUrl routes queries through the Accelerate proxy;
// the direct Aiven URL is only used for migrations (in prisma.config.ts).
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL,
    log: ["error"],
  });

globalForPrisma.prisma = prisma;
