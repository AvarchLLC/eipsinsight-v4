import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/env";
import { normalizeConnectionStringForTls, shouldAllowSelfSignedTls } from "@/lib/prisma-ssl";

const globalForPrismaAuth = globalThis as unknown as {
  prismaAuth?: PrismaClient;
};

function createPrismaAuth() {
  // Default to DATABASE_URL for auth in local/dev to avoid TLS issues on direct endpoints.
  // Set BETTER_AUTH_USE_DIRECT_DATABASE=true to force DIRECT_DATABASE_URL for auth.
  const useDirectForAuth = process.env.BETTER_AUTH_USE_DIRECT_DATABASE === "true";
  const connectionString =
    useDirectForAuth && env.DIRECT_DATABASE_URL ? env.DIRECT_DATABASE_URL : env.DATABASE_URL;
  const adapterConnectionString = normalizeConnectionStringForTls(connectionString);
  const isDirectAiven = useDirectForAuth && !!env.DIRECT_DATABASE_URL;
  const allowSelfSignedTls =
    isDirectAiven || shouldAllowSelfSignedTls(connectionString);
  const adapter = new PrismaPg({
    connectionString: adapterConnectionString,
    max: 2,
    // Aiven direct connection requires SSL. rejectUnauthorized: false accepts
    // Aiven's CA (not in default trust store). For production, prefer providing
    // the CA cert via ssl: { ca: fs.readFileSync('path/to/ca.crt') }.
    ...(allowSelfSignedTls && {
      ssl: { rejectUnauthorized: false },
    }),
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prismaAuth =
  globalForPrismaAuth.prismaAuth ?? createPrismaAuth();
globalForPrismaAuth.prismaAuth = prismaAuth;
