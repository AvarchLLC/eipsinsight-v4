"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import { ArrowUpRight, Clock, FileText, Loader2, Plus, Search } from "lucide-react";
import { client } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { PageHead } from "@/components/ledger/page-head";
import { SectionHead } from "@/components/ledger/section-head";
import { LedgerBadge } from "@/components/ledger/badge";

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
    Math.max(
      3,
      Math.ceil(`${post.title} ${post.excerpt ?? ""}`.split(/\s+/).filter(Boolean).length / 225)
    )
  );
}

function formatDate(d: Date | string, long = false) {
  return new Date(d).toLocaleDateString("en-US", {
    month: long ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });
}

function AuthorAvatar({ image, name, size = "sm" }: { image: string | null; name: string; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-7 w-7" : "h-6 w-6";
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-2)]", dim)}>
      {image ? (
        <Image src={image} alt={name} fill sizes="28px" unoptimized className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[10px] font-bold text-[var(--ink-muted)]">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function HeroPost({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className="group grid grid-cols-1 overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--ink)] lg:grid-cols-5"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] lg:col-span-3 lg:aspect-auto lg:min-h-[340px] lg:border-b-0 lg:border-r">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            loader={cloudinaryLoader}
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-12 w-12 text-[var(--ink-faint)]" />
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between gap-5 p-6 lg:col-span-2 lg:p-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <LedgerBadge token="living" className="text-[10px]">
              Featured
            </LedgerBadge>
            {post.category && (
              <span className="rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                {post.category.name}
              </span>
            )}
          </div>

          <h2 className="mt-4 font-serif text-2xl font-bold leading-snug tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--brand-strong)] sm:text-[1.75rem]">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--ink-muted)]">
              {post.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2.5">
            <AuthorAvatar image={post.author.image} name={post.author.name} size="md" />
            <div>
              <p className="text-xs font-semibold text-[var(--ink)]">{post.author.name}</p>
              <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                {formatDate(post.createdAt, true)} · {readTime(post)} min read
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--ink)]" />
        </div>
      </div>
    </Link>
  );
}

function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--ink)]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)]">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority={priority}
            loader={cloudinaryLoader}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-8 w-8 text-[var(--ink-faint)]" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--brand-strong)]">
            {post.category?.name ?? "Editorial"}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-faint)]">
            <Clock className="h-3 w-3" />
            {readTime(post)}m
          </span>
        </div>

        <h3 className="line-clamp-2 font-serif text-lg font-bold leading-snug tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--brand-strong)]">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <AuthorAvatar image={post.author.image} name={post.author.name} />
            <span className="truncate text-xs font-medium text-[var(--ink)]">{post.author.name}</span>
          </div>
          <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">
            {formatDate(post.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-[16/9] w-full animate-pulse bg-[var(--surface-2)]" />
      <div className="flex flex-col gap-3 p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
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

  const filteredPosts = useMemo(() => {
    let result = categorySlug ? posts.filter((p) => p.category?.slug === categorySlug) : posts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(q)) ||
          p.author.name.toLowerCase().includes(q)
      );
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      if (sortMode === "featured") {
        const d = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (d !== 0) return d;
      }
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return sortMode === "oldest" ? at - bt : bt - at;
    });
    return sorted;
  }, [posts, categorySlug, sortMode, searchQuery]);

  const showHero = !searchQuery && !categorySlug;
  const heroPost = showHero ? (filteredPosts.find((p) => p.featured) ?? filteredPosts[0]) : null;
  const gridPosts = heroPost ? filteredPosts.filter((p) => p.id !== heroPost.id) : filteredPosts;

  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight · Editorial"
        title="The Journal"
        lead="Weekly Ethereum recaps, upgrade deep-dives, governance decisions, and protocol standards coverage."
      >
        <span className="mono text-xs">
          Articles · <span className="text-[var(--ink)]">{posts.length || "—"}</span>
        </span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">
          Categories · <span className="text-[var(--ink)]">{categories.length || "—"}</span>
        </span>
        <span className="text-[var(--border-strong)]">·</span>
        <Link href="/insights" className="mono text-xs text-[var(--brand-strong)] hover:underline">
          Monthly Insights →
        </Link>
        {isAdmin && (
          <>
            <span className="text-[var(--border-strong)]">·</span>
            <Link
              href="/admin/blogs/new"
              className="inline-flex items-center gap-1 mono text-xs font-semibold text-[var(--brand-strong)] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Write post
            </Link>
          </>
        )}
      </PageHead>

      <div className="wrap py-8 sm:py-10">
        {/* Category filter + search toolbar */}
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href="/blogs"
              className={cn(
                "chip px-3 py-1 text-xs transition-colors",
                !categorySlug
                  ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--surface)]"
                  : "hover:border-[var(--ink)]"
              )}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blogs?category=${cat.slug}`}
                className={cn(
                  "chip px-3 py-1 text-xs transition-colors",
                  categorySlug === cat.slug
                    ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--surface)]"
                    : "hover:border-[var(--ink)]"
                )}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                type="text"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)] sm:w-56"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            >
              <option value="newest">Newest</option>
              <option value="featured">Featured</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-[340px] animate-pulse rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)]" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-[var(--ink-faint)]" />
            <h2 className="mt-3 font-serif text-lg font-bold text-[var(--ink)]">No articles found</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Try a different search term or category.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                window.history.pushState({}, "", "/blogs");
              }}
              className="chip mt-4 cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {heroPost && (
              <section id="featured">
                <SectionHead index="01" title="Lead story" />
                <HeroPost post={heroPost} />
              </section>
            )}

            {gridPosts.length > 0 && (
              <section id="archive">
                <SectionHead
                  index={heroPost ? "02" : "01"}
                  title={categorySlug ? categories.find((c) => c.slug === categorySlug)?.name ?? "Articles" : "All articles"}
                  action={
                    <span className="font-mono text-xs text-[var(--ink-muted)]">
                      {gridPosts.length} {gridPosts.length === 1 ? "article" : "articles"}
                    </span>
                  }
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {gridPosts.map((post, i) => (
                    <BlogCard key={post.id} post={post} priority={i < 3} />
                  ))}
                </div>
              </section>
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
        <div data-ledger className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--ink-muted)]" />
        </div>
      }
    >
      <BlogsContent />
    </Suspense>
  );
}
