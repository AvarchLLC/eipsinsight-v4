import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeConnectionStringForTls, shouldAllowSelfSignedTls } from "@/lib/prisma-ssl";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  const adapterConnectionString = normalizeConnectionStringForTls(connectionString);
  const adapter = new PrismaPg({
    connectionString: adapterConnectionString,
    // Configurable connection pool size: default 10 to prevent connection starvation during parallel oRPC queries.
    max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 10,
    ...(shouldAllowSelfSignedTls(connectionString) && {
      ssl: { rejectUnauthorized: false },
    }),
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
