-- CreateTable
CREATE TABLE "blog_like" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "likeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comment" (
    "id" TEXT NOT NULL,
    "blogId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_like_blogId_likeKey_key" ON "blog_like"("blogId", "likeKey");

-- CreateIndex
CREATE INDEX "blog_like_blogId_idx" ON "blog_like"("blogId");

-- CreateIndex
CREATE INDEX "blog_comment_blogId_idx" ON "blog_comment"("blogId");

-- AddForeignKey
ALTER TABLE "blog_like" ADD CONSTRAINT "blog_like_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
