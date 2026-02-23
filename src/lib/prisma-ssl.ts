export function shouldAllowSelfSignedTls(connectionString: string): boolean {
  const forceAllowSelfSigned = process.env.PRISMA_SSL_ALLOW_SELF_SIGNED === "true";
  if (forceAllowSelfSigned) return true;
  if (/sslmode=no-verify/i.test(connectionString)) return true;
  if (process.env.NODE_ENV !== "production" && /sslmode=require/i.test(connectionString)) return true;

  // Local PgBouncer/dev databases often terminate TLS with self-signed certs.
  const usesLocalHost = /@(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/)/i.test(connectionString);
  const requiresSsl = /sslmode=require/i.test(connectionString);

  return usesLocalHost && requiresSsl;
}

export function normalizeConnectionStringForTls(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const hasExplicitSslMode = !!url.searchParams.get("sslmode");
    const isPgBouncerUrl = url.searchParams.get("pgbouncer") === "true";

    // In local/dev, many self-hosted PgBouncer setups expose plain TCP on 6432.
    // If sslmode is not explicitly set, default to disable to avoid forced SSL failures.
    if (process.env.NODE_ENV !== "production" && isPgBouncerUrl && !hasExplicitSslMode) {
      url.searchParams.set("sslmode", "disable");
      return url.toString();
    }

    if (shouldAllowSelfSignedTls(connectionString)) {
      url.searchParams.set("sslmode", "no-verify");
      return url.toString();
    }

    return url.toString();
  } catch {
    if (shouldAllowSelfSignedTls(connectionString)) {
      const hasQuery = connectionString.includes("?");
      const withoutSslMode = connectionString.replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]$/, "");
      return `${withoutSslMode}${hasQuery ? "&" : "?"}sslmode=no-verify`;
    }
    return connectionString;
  }
}
