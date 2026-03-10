"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";

type BlogPost = {
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
};

type BlogCategory = { id: string; slug: string; name: string };
type SortMode = "newest" | "featured" | "oldest";

function estimateReadTime(post: Pick<BlogPost, "title" | "excerpt">) {
  const wordCount = `${post.title} ${post.excerpt ?? ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(3, Math.ceil(wordCount / 45));
}

function BlogsContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      client.blog.list({
        publishedOnly: true,
        limit: 50,
      }),
      client.account
        .getMe()
        .then((u) => u.role === "admin" || u.role === "editor")
        .catch(() => false),
      client.blog.listCategories(),
    ])
      .then(([res, canManage, cats]) => {
        if (cancelled) return;
        setPosts(res.posts);
        setTotal(res.total);
        setIsAdmin(canManage);
        setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => {
      const slug = post.category?.slug;
      if (!slug) return;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
    return counts;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const base = categorySlug
      ? posts.filter((post) => post.category?.slug === categorySlug)
      : posts;

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortMode === "featured") {
        const featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featuredDelta !== 0) return featuredDelta;
      }
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortMode === "oldest" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [posts, categorySlug, sortMode]);

  const featuredPosts = useMemo(
    () => filteredPosts.filter((post) => post.featured),
    [filteredPosts]
  );

  const leadPost = useMemo(
    () => featuredPosts[0] ?? filteredPosts[0] ?? null,
    [featuredPosts, filteredPosts]
  );

  const supportingPosts = useMemo(() => {
    if (!leadPost) return [];
    return filteredPosts.filter((post) => post.id !== leadPost.id).slice(0, 3);
  }, [filteredPosts, leadPost]);

  const archivePosts = useMemo(() => {
    if (!leadPost) return filteredPosts;
    return filteredPosts.filter((post) => post.id !== leadPost.id).slice(3);
  }, [filteredPosts, leadPost]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/resources"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Link>

        <header className="mb-6">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Resources
          </span>
          <h1 className="mt-3 dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Blogs
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Deep dives, explainers, and editorial context around Ethereum standards, governance, and ecosystem changes.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reading Surface
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredPosts.length} visible post{filteredPosts.length !== 1 ? "s" : ""}
                {categorySlug ? ` in ${categories.find((item) => item.slug === categorySlug)?.name ?? categorySlug}` : ""}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                <span>Sort</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="h-9 bg-transparent text-foreground outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="featured">Featured</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
              {isAdmin ? (
                <>
                  <Link
                    href="/admin?tab=blogs"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                    Manage
                  </Link>
                  <Link
                    href="/admin/blogs/new"
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition hover:bg-primary/15"
                  >
                    <Plus className="h-4 w-4" />
                    New Post
                  </Link>
                </>
              ) : null}
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/resources/blogs"
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                  !categorySlug
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                All posts ({posts.length})
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/resources/blogs?category=${category.slug}`}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                    categorySlug === category.slug
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {category.name} ({categoryCounts.get(category.slug) ?? 0})
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-8">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card/60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/60 p-10 text-center">
              <div className="mx-auto inline-flex rounded-full border border-border bg-muted/60 p-5">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h2 className="mt-5 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {categorySlug ? "No Posts In This Category" : "No Posts Yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                {categorySlug
                  ? "Try another category or return to all posts to browse the full commentary archive."
                  : "This space will collect commentary, explainers, and standards-focused writing across EIPs, ERCs, RIPs, and upgrade governance."}
              </p>
              {categorySlug ? (
                <Link
                  href="/resources/blogs"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-4 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  View All Posts
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  href="/admin/blogs/new"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm text-primary transition hover:bg-primary/15"
                >
                  <Plus className="h-4 w-4" />
                  Create First Post
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-8">
              {leadPost ? (
                <section className="grid gap-4 xl:grid-cols-12">
                  <Link
                    href={`/resources/blogs/${leadPost.slug}`}
                    className="group overflow-hidden rounded-xl border border-border bg-card/60 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 xl:col-span-8"
                  >
                    <div className="relative aspect-[16/9] bg-muted">
                      {leadPost.coverImage ? (
                        <Image
                          src={leadPost.coverImage}
                          alt={leadPost.title}
                          fill
                          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FileText className="h-14 w-14 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                        {leadPost.featured ? (
                          <span className="inline-flex rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Featured
                          </span>
                        ) : null}
                        {leadPost.category ? (
                          <span className="inline-flex rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                            {leadPost.category.name}
                          </span>
                        ) : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                          Lead story
                        </p>
                        <h2 className="mt-2 dec-title text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                          {leadPost.title}
                        </h2>
                        {leadPost.excerpt ? (
                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                            {leadPost.excerpt}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/70">
                          <span>{leadPost.author.name}</span>
                          <span>•</span>
                          <span>{new Date(leadPost.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{estimateReadTime(leadPost)} min read</span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="space-y-4 xl:col-span-4">
                    {supportingPosts.length > 0 ? (
                      <div className="rounded-xl border border-border bg-card/60 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Editor Picks
                        </p>
                        <div className="mt-3 space-y-3">
                          {supportingPosts.map((post) => (
                            <Link
                              key={post.id}
                              href={`/resources/blogs/${post.slug}`}
                              className="block rounded-lg border border-border bg-muted/25 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                                    {post.title}
                                  </h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {post.category?.name || "Commentary"} • {new Date(post.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-border bg-card/60 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Reading Intent
                      </p>
                      <div className="mt-3 grid gap-2">
                        <Link
                          href="/resources/docs"
                          className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                        >
                          Understand the EIP process
                        </Link>
                        <Link
                          href="/analytics/eips"
                          className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                        >
                          Explore proposal analytics
                        </Link>
                        <Link
                          href="/resources/videos"
                          className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                        >
                          Watch explainers and videos
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {archivePosts.length > 0 ? (
                <section>
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Latest Posts
                    </p>
                    <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      Latest Writing
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Commentary and explainers across governance, standards, and protocol change coordination.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {archivePosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/resources/blogs/${post.slug}`}
                        className="group overflow-hidden rounded-xl border border-border bg-card/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                      >
                        <div className="relative aspect-[16/10] bg-muted">
                          {post.coverImage ? (
                            <Image
                              src={post.coverImage}
                              alt={post.title}
                              fill
                              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          {post.category ? (
                            <span className="absolute bottom-3 left-3 inline-flex rounded-full border border-border bg-card/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur-sm">
                              {post.category.name}
                            </span>
                          ) : null}
                        </div>
                        <div className="p-4">
                          <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                            {post.title}
                          </h3>
                          {post.excerpt ? (
                            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                              {post.excerpt}
                            </p>
                          ) : null}
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{post.author.name}</span>
                            <span>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{estimateReadTime(post)} min read</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BlogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <BlogsContent />
    </Suspense>
  );
}
