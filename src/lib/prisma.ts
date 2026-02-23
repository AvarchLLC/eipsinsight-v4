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
    // Limit connections per serverless instance to avoid exhausting PgBouncer pool.
    // Default 10 × many Vercel instances = query_wait_timeout. Use 2–3 per instance.
    max: 3,
    ...(shouldAllowSelfSignedTls(connectionString) && {
      ssl: { rejectUnauthorized: false },
    }),
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
