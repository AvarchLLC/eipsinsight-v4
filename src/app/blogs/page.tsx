"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { cloudinaryLoader } from "@/lib/cloudinary-loader";
import { ArrowRight, ArrowUpRight, Clock, FileText, Loader2, Plus, Search } from "lucide-react";
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
type SeriesTab = "all" | "weekly" | "articles";
type SortMode = "newest" | "oldest";

const isWeekly = (p: BlogPost) => /ethereum standards weekly/i.test(p.title);

function readTime(post: BlogPost) {
  return (
    post.readingTimeMinutes ??
    Math.max(3, Math.ceil(`${post.title} ${post.excerpt ?? ""}`.split(/\s+/).filter(Boolean).length / 225))
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

function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  const weekly = isWeekly(post);
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
            {weekly ? "Weekly Digest" : post.category?.name ?? "Editorial"}
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
          <div className="flex min-w-0 items-center gap-2">
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

function SkeletonState() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="h-[340px] animate-pulse rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] lg:col-span-3" />
        <div className="h-[340px] animate-pulse rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)] lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  );
}

function BlogsContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("category") ?? "";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tab, setTab] = useState<SeriesTab>("all");
  const [categoryFilter, setCategoryFilter] = useState(initialCat);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setCategoryFilter(initialCat);
  }, [initialCat]);

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

  const weeklyPosts = useMemo(
    () =>
      [...posts]
        .filter(isWeekly)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (tab === "weekly") result = result.filter(isWeekly);
    else if (tab === "articles") result = result.filter((p) => !isWeekly(p));

    if (categoryFilter) {
      result = result.filter((p) => p.category?.slug === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(q)) ||
          p.author.name.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return sortMode === "oldest" ? at - bt : bt - at;
    });
  }, [posts, tab, categoryFilter, searchQuery, sortMode]);

  const isDefaultView = tab === "all" && !categoryFilter && !searchQuery.trim() && sortMode === "newest";
  const leadPost = isDefaultView ? filteredPosts[0] ?? null : null;
  const recentWeekly = isDefaultView ? weeklyPosts.filter((p) => p.id !== leadPost?.id).slice(0, 5) : [];
  const skipIds = new Set([leadPost?.id, ...recentWeekly.map((p) => p.id)].filter(Boolean));
  const archivePosts = isDefaultView ? filteredPosts.filter((p) => !skipIds.has(p.id)) : filteredPosts;
  const visibleArchive = showAll || !isDefaultView ? archivePosts : archivePosts.slice(0, 9);

  return (
    <div data-ledger className="min-h-screen pb-16">
      <PageHead
        eyebrow="EIPsInsight · Editorial"
        title="The Journal"
        lead="Ethereum Standards Weekly digests, fork deep-dives, governance essays, and EIPsInsight milestone reports."
      >
        <span className="mono text-xs">
          Total · <span className="text-[var(--ink)]">{posts.length || "—"} articles</span>
        </span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="mono text-xs">
          Weekly issues · <span className="text-[var(--ink)]">{weeklyPosts.length || "—"}</span>
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
        {/* Clean 3-tab switcher + compact search & topic filter */}
        <div className="mb-8 flex flex-col gap-3 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "All", count: posts.length },
                { id: "weekly", label: "Standards Weekly", count: weeklyPosts.length },
                { id: "articles", label: "Deep Dives & Reports", count: posts.length - weeklyPosts.length },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setShowAll(false);
                }}
                className={cn(
                  "chip cursor-pointer gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  tab === t.id
                    ? "border-[var(--ink)] bg-[var(--ink)] font-semibold text-[var(--surface)]"
                    : "hover:border-[var(--ink)]"
                )}
              >
                <span>{t.label}</span>
                {posts.length > 0 && (
                  <span className={cn("font-mono text-[10px]", tab === t.id ? "opacity-80" : "text-[var(--ink-faint)]")}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                type="text"
                placeholder="Search title, topic, author…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 text-xs text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[var(--ink)] sm:w-56"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by topic"
              className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 font-mono text-[11px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            >
              <option value="">All topics</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort order"
              className="h-8 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 font-mono text-[11px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {loading ? (
          <SkeletonState />
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-[var(--ink-faint)]" />
            <h2 className="mt-3 font-serif text-lg font-bold text-[var(--ink)]">No articles found</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Try clearing your search or switching tabs.</p>
            <button
              type="button"
              onClick={() => {
                setTab("all");
                setCategoryFilter("");
                setSearchQuery("");
                window.history.pushState({}, "", "/blogs");
              }}
              className="chip mt-4 cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Section 01: Lead story + Recent Weekly issues */}
            {isDefaultView && leadPost && (
              <section id="latest">
                <SectionHead index="01" title="Latest" />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                  <Link
                    href={`/blogs/${leadPost.slug}`}
                    className="group flex flex-col overflow-hidden rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--ink)] lg:col-span-3"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)]">
                      {leadPost.coverImage ? (
                        <Image
                          src={leadPost.coverImage}
                          alt={leadPost.title}
                          fill
                          priority
                          loader={cloudinaryLoader}
                          sizes="(max-width: 1024px) 100vw, 60vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FileText className="h-10 w-10 text-[var(--ink-faint)]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-4 p-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <LedgerBadge token="living" className="text-[10px]">
                            Latest
                          </LedgerBadge>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                            {isWeekly(leadPost) ? "Weekly Digest" : leadPost.category?.name ?? "Editorial"}
                          </span>
                        </div>
                        <h2 className="mt-3 font-serif text-2xl font-bold leading-snug tracking-tight text-[var(--ink)] group-hover:text-[var(--brand-strong)]">
                          {leadPost.title}
                        </h2>
                        {leadPost.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--ink-muted)]">
                            {leadPost.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                        <div className="flex items-center gap-2">
                          <AuthorAvatar image={leadPost.author.image} name={leadPost.author.name} size="md" />
                          <span className="text-xs font-medium text-[var(--ink)]">{leadPost.author.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                          {formatDate(leadPost.createdAt, true)} · {readTime(leadPost)}m
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-col justify-between rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-2">
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]">
                          Ethereum Standards Weekly
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab("weekly")}
                          className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] text-[var(--brand-strong)] hover:underline"
                        >
                          All {weeklyPosts.length} <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {recentWeekly.map((w) => (
                          <Link
                            key={w.id}
                            href={`/blogs/${w.slug}`}
                            className="group flex items-start justify-between gap-3 py-3 transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-serif text-sm font-semibold text-[var(--ink)] group-hover:text-[var(--brand-strong)]">
                                {w.title}
                              </p>
                              <p className="mt-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                                {formatDate(w.createdAt)} · {readTime(w)} min read
                              </p>
                            </div>
                            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)] group-hover:text-[var(--ink)]" />
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <button
                        type="button"
                        onClick={() => setTab("articles")}
                        className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
                      >
                        <span>Browse deep dives &amp; milestone reports</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--brand-strong)]" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Section 02: Archive grid */}
            {visibleArchive.length > 0 && (
              <section id="archive">
                <SectionHead
                  index={isDefaultView ? "02" : "01"}
                  title={
                    tab === "weekly"
                      ? "Ethereum Standards Weekly"
                      : tab === "articles"
                        ? "Deep Dives & Reports"
                        : "More from The Journal"
                  }
                  action={
                    <span className="font-mono text-xs text-[var(--ink-muted)]">
                      {archivePosts.length} {archivePosts.length === 1 ? "article" : "articles"}
                    </span>
                  }
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleArchive.map((post, i) => (
                    <BlogCard key={post.id} post={post} priority={i < 3} />
                  ))}
                </div>

                {isDefaultView && archivePosts.length > 9 && !showAll && (
                  <div className="mt-8 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="chip cursor-pointer px-4 py-2 text-xs font-medium text-[var(--ink)] hover:border-[var(--ink)]"
                    >
                      Show all {archivePosts.length} articles
                    </button>
                  </div>
                )}
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
