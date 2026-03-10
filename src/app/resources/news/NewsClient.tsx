"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Newspaper,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  Tag,
  Filter,
  Clock3,
  Radio,
} from "lucide-react";

type NewsItem = {
  id: number;
  title: string;
  summary: string;
  date: string;
  link?: string;
  categories: string[];
  source?: string;
  thumbnail?: string | null;
};

const ITEMS_PER_PAGE = 12;

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const readingTime = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const relativeTime = (dateStr: string) => {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-3 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function NewsCard({ item, featured = false }: { item: NewsItem; featured?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80">
      {item.thumbnail && (
        <div className={`overflow-hidden bg-muted ${featured ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      )}

      <div className={featured ? "p-6" : "p-5"}>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {item.source && (
            <span className="inline-flex h-6 items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 text-primary">
              {item.source}
            </span>
          )}
          <span>{formatDate(item.date)}</span>
          <span>•</span>
          <span>{relativeTime(item.date)}</span>
          <span>•</span>
          <span>{readingTime(item.summary)}</span>
        </div>

        <a
          href={item.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-start gap-2"
        >
          <h3
            className={`leading-snug text-foreground transition-colors group-hover:text-primary ${
              featured ? "dec-title text-2xl font-semibold tracking-tight sm:text-3xl" : "text-lg font-semibold"
            }`}
          >
            {item.title}
          </h3>
          <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </a>

        <p className={`mt-3 leading-relaxed text-muted-foreground ${featured ? "text-sm sm:text-base" : "text-sm"}`}>
          {item.summary}
        </p>

        {item.categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.categories.slice(0, featured ? 4 : 3).map((category) => (
              <span
                key={category}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {capitalize(category)}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function NewsClient({ updates }: { updates: NewsItem[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, sortOrder]);

  const allCategories = useMemo(
    () =>
      Array.from(new Set(updates.flatMap((item) => item.categories.map((category) => category.toLowerCase())))).sort(),
    [updates],
  );

  const filteredUpdates = useMemo(() => {
    return updates
      .filter((item) => {
        const matchesCategory =
          categoryFilter === "all" || item.categories.some((category) => category.toLowerCase() === categoryFilter);
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.categories.some((category) => category.toLowerCase().includes(query)) ||
          item.source?.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === "latest" ? diff : -diff;
      });
  }, [updates, categoryFilter, search, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUpdates.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUpdates = filteredUpdates.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const featuredStory = paginatedUpdates[0] ?? null;
  const storyGrid = featuredStory ? paginatedUpdates.slice(1) : paginatedUpdates;

  const latestDate =
    updates.length > 0
      ? new Date(Math.max(...updates.map((item) => new Date(item.date).getTime())))
      : null;

  const hasFilters = Boolean(search) || categoryFilter !== "all" || sortOrder !== "latest";

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setSortOrder("latest");
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pageNumbers: (number | "…")[] = (() => {
    const range: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) range.push(page);
      return range;
    }

    range.push(1);
    if (safePage > 3) range.push("…");
    for (let page = Math.max(2, safePage - 1); page <= Math.min(totalPages - 1, safePage + 1); page += 1) {
      range.push(page);
    }
    if (safePage < totalPages - 2) range.push("…");
    range.push(totalPages);
    return range;
  })();

  return (
    <div className="min-h-screen bg-background">
      <div ref={topRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>

          <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Resources
          </div>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            News
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ethereum standards and ecosystem coverage syndicated from <span className="text-foreground/80">EtherWorld</span>, organized for faster discovery inside the EIPsInsight resources hub.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Newspaper} label="Stories" value={updates.length} />
            <StatCard
              icon={Calendar}
              label="Latest sync"
              value={
                latestDate
                  ? latestDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"
              }
            />
            <StatCard icon={Filter} label="Topics" value={allCategories.length} />
            <StatCard icon={Radio} label="Source" value="EtherWorld" />
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">News Feed</p>
              <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Filter EtherWorld coverage
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Search by headline, narrow by topic, or switch chronology to scan the latest protocol and governance coverage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <Clock3 className="h-4 w-4" />
                {filteredUpdates.length} result{filteredUpdates.length === 1 ? "" : "s"}
              </span>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search EtherWorld coverage..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-ring/30"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-ring/30"
            >
              <option value="all">All Topics</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {capitalize(category)}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as "latest" | "oldest")}
              className="h-10 rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:bg-card focus:ring-2 focus:ring-ring/30"
            >
              <option value="latest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {categoryFilter !== "all" && (
                <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3">
                  Topic: {capitalize(categoryFilter)}
                </span>
              )}
              {search && (
                <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3">
                  Search: “{search}”
                </span>
              )}
            </div>
          )}
        </section>

        {filteredUpdates.length === 0 ? (
          <section className="mx-auto max-w-2xl rounded-xl border border-border bg-card/60 px-6 py-16 text-center backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/50">
              <Newspaper className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-6 dec-title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              No stories match this filter
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Try a broader topic or clear search terms to return to the full EtherWorld feed.
            </p>
            <button
              onClick={clearFilters}
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:bg-primary/15"
            >
              Reset filters
            </button>
          </section>
        ) : (
          <>
            {featuredStory && (
              <section className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
                <NewsCard item={featuredStory} featured />

                <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source Context</p>
                  <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    EtherWorld coverage inside EIPsInsight
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    This page pulls stories from EtherWorld and reshapes them into a searchable archive for standards, upgrades, and governance-related reading.
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Best for</p>
                      <p className="mt-1 text-sm text-foreground">Following protocol updates, governance commentary, and ecosystem milestones around EIPs.</p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Use with</p>
                      <p className="mt-1 text-sm text-foreground">Blogs for commentary, Docs for process references, and Videos for guided walkthroughs.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <a
                      href="https://etherworld.co/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:bg-primary/15"
                    >
                      Open EtherWorld
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link
                      href="/resources/blogs"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      Read commentary
                    </Link>
                  </div>
                </div>
              </section>
            )}

            <section>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Latest Stories</p>
                  <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    More from the feed
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Recent EtherWorld headlines organized for browsing by topic and time.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {storyGrid.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            </section>

            {totalPages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => goToPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
                    {pageNumbers.map((pageNumber, index) =>
                      pageNumber === "…" ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                          …
                        </span>
                      ) : (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-all ${
                            pageNumber === safePage
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
