-- CreateIndex
CREATE INDEX "blog_comment_userId_idx" ON "blog_comment"("userId");

-- AddForeignKey
ALTER TABLE "blog_comment" ADD CONSTRAINT "blog_comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
