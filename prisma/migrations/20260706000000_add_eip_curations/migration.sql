-- CreateTable
CREATE TABLE "eip_curations" (
    "eip_number" INTEGER NOT NULL,
    "layman_title" TEXT,
    "layman_summary" TEXT,
    "benefits" JSONB,
    "tradeoffs" JSONB,
    "stakeholder_impacts" JSONB,
    "north_star" JSONB,
    "headliner_of" TEXT,
    "headliner_note" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eip_curations_pkey" PRIMARY KEY ("eip_number")
);
