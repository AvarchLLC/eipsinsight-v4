-- AlterTable
ALTER TABLE "user" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "membershipExpiresAt" TIMESTAMP(3),
ADD COLUMN     "membershipTier" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "membership_tier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "priceYearly" DOUBLE PRECISION,
    "features" TEXT[],
    "requestLimit" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_tier_name_key" ON "membership_tier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "membership_tier_slug_key" ON "membership_tier"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "api_token_token_key" ON "api_token"("token");

-- AddForeignKey
ALTER TABLE "api_token" ADD CONSTRAINT "api_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
