-- CreateTable
CREATE TABLE "upgrade_client_priority" (
    "fork_slug" TEXT NOT NULL,
    "last_updated" TEXT,
    "eips" JSONB,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upgrade_client_priority_pkey" PRIMARY KEY ("fork_slug")
);
