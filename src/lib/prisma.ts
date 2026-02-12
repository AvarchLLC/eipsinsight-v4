// lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";

// Cache BOTH Pool and PrismaClient in globalThis to prevent
// connection leaks during Next.js hot-reloads in development.
// Without this, every HMR creates a new Pool (up to `max` connections),
// quickly exhausting the database's connection limit (error 53300).
const globalForPrisma = globalThis as unknown as {
  pool?: Pool;
  prisma?: PrismaClient;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 5, // Keep low — Aiven hobby tier has ~20 total slots
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 10s — enough for cold starts + SSL handshake
    statement_timeout: 30000, // Kill queries running longer than 30s
    query_timeout: 30000, // Client-side query timeout
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}
