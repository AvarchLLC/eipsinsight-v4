"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Plus,
  Search,
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
  readingTimeMinutes?: number | null;
  featured?: boolean;
  category?: { id: string; slug: string; name: string } | null;
  author: { id: string; name: string; image: string | null };
};

type BlogCategory = { id: string; slug: string; name: string };
type SortMode = "newest" | "featured" | "oldest";

function readTime(post: BlogPost) {
  return (
    post.readingTimeMinutes ??
    Math.max(3, Math.ceil(
      `${post.title} ${post.excerpt ?? ""}`.split(/\s+/).filter(Boolean).length / 225
    ))
  );
}

function AuthorAvatar({ image, name, size = 8 }: { image: string | null; name: string; size?: number }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full border border-border bg-muted", `h-${size} w-${size}`)}>
      {image ? (
        <Image src={image} alt={name} fill sizes={`${size * 4}px`} unoptimized className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return (
    <Link
      href={`/resources/blogs/${post.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card/60 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority={priority}
            loader={cloudinaryLoader}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {post.category && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex rounded-md border border-white/20 bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {post.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="dec-title line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <AuthorAvatar image={post.author.image} name={post.author.name} size={6} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground leading-none">{post.author.name}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" />
            {readTime(post)} min
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroPost({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/resources/blogs/${post.slug}`}
      className="group relative grid grid-cols-1 gap-8 overflow-hidden rounded-xl border border-border bg-card/60 transition-all duration-300 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 lg:grid-cols-5"
    >
      {/* Image — 3 / 5 cols */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted lg:col-span-3 lg:aspect-auto lg:min-h-[360px]">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            loader={cloudinaryLoader}
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-r from-transparent to-card/40 hidden lg:block" />
      </div>

      {/* Content — 2 / 5 cols */}
      <div className="flex flex-col justify-center gap-5 p-6 lg:col-span-2 lg:py-10 lg:pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3 w-3" />
            Featured
          </span>
          {post.category && (
            <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {post.category.name}
            </span>
          )}
        </div>

        <h2 className="dec-title persona-title text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AuthorAvatar image={post.author.image} name={post.author.name} size={8} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{post.author.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
            Read <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="aspect-[16/9] w-full animate-pulse bg-muted" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-px bg-border/60" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function BlogsContent() {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client.blog.list({ publishedOnly: true, limit: 100 }),
      client.account.getMe().then((u) => u.role === "admin" || u.role === "editor").catch(() => false),
      client.blog.listCategories(),
    ])
      .then(([res, canManage, cats]) => {
        if (cancelled) return;
        setPosts(res.posts as BlogPost[]);
        setIsAdmin(canManage);
        setCategories(cats);
      })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredPosts = useMemo(() => {
    let result = categorySlug ? posts.filter((p) => p.category?.slug === categorySlug) : posts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.excerpt && p.excerpt.toLowerCase().includes(q))
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      if (sortMode === "featured") {
        const d = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (d !== 0) return d;
      }
      const at = new Date(a.createdAt).getTime(), bt = new Date(b.createdAt).getTime();
      return sortMode === "oldest" ? at - bt : bt - at;
    });
    return sorted;
  }, [posts, categorySlug, sortMode, searchQuery]);

  const showHero = !searchQuery && !categorySlug;
  const heroPost = showHero ? (filteredPosts.find((p) => p.featured) ?? filteredPosts[0]) : null;
  const gridPosts = heroPost ? filteredPosts.filter((p) => p.id !== heroPost.id) : filteredPosts;

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell py-8 lg:py-12">

        {/* ── Top bar ── */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Resources
          </Link>
          {isAdmin && (
            <Link
              href="/admin/blogs/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-md persona-gradient px-4 text-xs font-semibold uppercase tracking-wider text-black shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Write
            </Link>
          )}
        </div>

        {/* ── Page header ── */}
        <div className="mb-10">
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            The Journal
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            In-depth coverage of Ethereum upgrades, governance decisions, and protocol standards.
          </p>
        </div>

        {/* ── Category filter + search toolbar ── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Category pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/resources/blogs"
              className={cn(
                "rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                !categorySlug
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/resources/blogs?category=${cat.slug}`}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                  categorySlug === cat.slug
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 rounded-md border border-border bg-muted/60 pl-9 pr-3 text-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 sm:w-56"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-9 rounded-md border border-border bg-muted/60 px-3 text-xs font-semibold uppercase tracking-wider focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="featured">Featured</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="space-y-8">
            <div className="h-[360px] animate-pulse rounded-xl border border-border bg-muted/30" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-6">
              <Search className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="dec-title text-xl font-semibold text-foreground">No posts found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try a different search term or category.</p>
            <button
              onClick={() => { setSearchQuery(""); window.history.pushState({}, "", "/resources/blogs"); }}
              className="mt-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary transition hover:bg-primary/20"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero featured post */}
            {heroPost && <HeroPost post={heroPost} />}

            {/* Grid */}
            {gridPosts.length > 0 && (
              <>
                {heroPost && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      More stories
                    </span>
                    <div className="flex-1 border-t border-border/60" />
                    <span className="text-[10px] text-muted-foreground">{gridPosts.length} articles</span>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {gridPosts.map((post, i) => (
                    <BlogCard key={post.id} post={post} priority={i < 3} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
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
