-- CreateTable
CREATE TABLE "blog_editor_profile" (
    "user_id" TEXT NOT NULL,
    "linkedin" TEXT,
    "x" TEXT,
    "facebook" TEXT,
    "telegram" TEXT,
    "bio" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_editor_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "blog_category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "blog_category_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "blog" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "blog" ADD COLUMN "readingTimeMinutes" INTEGER;
ALTER TABLE "blog" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "blog" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "blog_category_slug_key" ON "blog_category"("slug");

-- CreateIndex
CREATE INDEX "blog_categoryId_idx" ON "blog"("categoryId");

-- AddForeignKey
ALTER TABLE "blog_editor_profile" ADD CONSTRAINT "blog_editor_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog" ADD CONSTRAINT "blog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "blog_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default categories (Binance-style)
INSERT INTO "blog_category" ("id", "slug", "name", "description") VALUES
  (gen_random_uuid(), 'culture', 'Culture', 'Team and community stories'),
  (gen_random_uuid(), 'ecosystem', 'Ecosystem', 'Ethereum ecosystem updates'),
  (gen_random_uuid(), 'research', 'Research', 'Technical research and analysis'),
  (gen_random_uuid(), 'standards', 'Standards', 'EIPs, ERCs, RIPs and governance')
ON CONFLICT (slug) DO NOTHING;
