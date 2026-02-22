"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Plus, Pencil } from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

function BlogsContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");

  const [posts, setPosts] = useState<Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    published: boolean;
    createdAt: Date | string;
    featured?: boolean;
    category?: { id: string; slug: string; name: string } | null;
    author: { id: string; name: string; image: string | null };
  }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; slug: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      client.blog.list({ publishedOnly: true, limit: 50, categorySlug: categorySlug ?? undefined }),
      client.account.getMe().then((u) => u.role === "admin" || u.role === "editor").catch(() => false),
      client.blog.listCategories(),
    ])
      .then(([res, canManage, cats]) => {
        if (!cancelled) {
          setPosts(res.posts);
          setTotal(res.total);
          setIsAdmin(canManage);
          setCategories(cats);
        }
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [categorySlug ?? ""]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="dec-title text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white mb-1">
                Blogs
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Deep dives and explainers about Ethereum standards.
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Link
                  href="/admin/blogs"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <Pencil className="h-4 w-4" />
                  Manage
                </Link>
                <Link
                  href="/admin/blogs/new"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  New Post
                </Link>
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Link
                href="/resources/blogs"
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  !categorySlug
                    ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                )}
              >
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/resources/blogs?category=${c.slug}`}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    categorySlug === c.slug
                      ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center max-w-lg mx-auto py-24">
            <div className="rounded-full bg-emerald-500/20 p-6 inline-flex mb-6">
              <FileText className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
              No blog posts yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              We&apos;re working on bringing you insightful blog posts about EIPs, ERCs, RIPs, and the Ethereum ecosystem. Check back soon!
            </p>
            {isAdmin && (
              <Link
                href="/admin/blogs/new"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-400 hover:to-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Create first post
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/resources/blogs/${post.slug}`}
                className="group rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/60 overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all"
              >
                <div className="relative h-40 bg-slate-200 dark:bg-slate-800/50">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  {post.featured && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-amber-500/90 text-amber-950 text-[10px] font-bold uppercase">
                      Featured
                    </span>
                  )}
                  {post.category && (
                    <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 text-[10px] font-medium">
                      {post.category.name}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span>{post.author.name}</span>
                    <span>·</span>
                    <span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600 dark:text-cyan-400" />
      </div>
    }>
      <BlogsContent />
    </Suspense>
  );
}
