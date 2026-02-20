-- DropIndex
DROP INDEX IF EXISTS "api_token_token_key";

-- AlterTable - Rename token to tokenHash
ALTER TABLE "api_token" RENAME COLUMN "token" TO "tokenHash";

-- CreateIndex - Use tokenHash as unique identifier
CREATE UNIQUE INDEX "api_token_tokenHash_key" ON "api_token"("tokenHash");
