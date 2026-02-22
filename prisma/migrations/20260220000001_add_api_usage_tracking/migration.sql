CREATE TABLE IF NOT EXISTS "api_usage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "apiTokenId" TEXT,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "api_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
  CONSTRAINT "api_usage_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "api_token" ("id") ON DELETE SET NULL
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS "api_usage_userId_createdAt_idx" ON "api_usage" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "api_usage_apiTokenId_createdAt_idx" ON "api_usage" ("apiTokenId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "api_usage_endpoint_idx" ON "api_usage" ("endpoint");
