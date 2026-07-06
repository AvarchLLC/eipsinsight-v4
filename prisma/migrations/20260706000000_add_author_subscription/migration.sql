-- CreateTable
CREATE TABLE "author_subscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_author_subscription_user" ON "author_subscription"("user_id");

-- CreateIndex
CREATE INDEX "idx_author_subscription_author" ON "author_subscription"("author_name");

-- CreateIndex
CREATE UNIQUE INDEX "author_subscription_unique" ON "author_subscription"("user_id", "author_name");

-- AddForeignKey
ALTER TABLE "author_subscription" ADD CONSTRAINT "author_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "NotificationOutbox" ADD COLUMN "author_subscription_id" TEXT;

-- AddForeignKey
ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_author_subscription_id_fkey" FOREIGN KEY ("author_subscription_id") REFERENCES "author_subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
