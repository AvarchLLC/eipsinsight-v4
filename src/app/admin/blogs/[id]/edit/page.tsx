"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { client } from "@/lib/orpc";
import { BlogEditor } from "../../_components/blog-editor";

export default function EditBlogPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    published: boolean;
    categoryId?: string | null;
    readingTimeMinutes?: number | null;
    tags?: string[];
    featured?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    client.blog
      .getById({ id })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">Post not found</p>
      </div>
    );
  }

  return (
    <BlogEditor
      mode="edit"
      postId={post.id}
      initialData={{
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? "",
        content: post.content,
        coverImage: post.coverImage,
        published: post.published,
        categoryId: post.categoryId ?? null,
        readingTimeMinutes: post.readingTimeMinutes ?? null,
        tags: post.tags ?? [],
        featured: post.featured ?? false,
      }}
    />
  );
}
