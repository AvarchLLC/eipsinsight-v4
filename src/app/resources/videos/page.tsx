"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Video,
  Loader2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Play,
  Filter,
  X,
  ExternalLink,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { client } from "@/lib/orpc";

type VideoItem = {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  tags?: string[];
  published: boolean;
  displayOrder: number;
  createdAt: Date | string;
};

const VIDEOS_PER_PAGE = 9;

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    client.video
      .getAllTags()
      .then((tags) => setAllTags(tags))
      .catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const offset = (currentPage - 1) * VIDEOS_PER_PAGE;

    Promise.all([
      client.video.list({
        publishedOnly: true,
        limit: VIDEOS_PER_PAGE,
        offset,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      }),
      client.account.getMe().then((user) => user.role === "admin").catch(() => false),
    ])
      .then(([response, admin]) => {
        if (cancelled) return;
        setVideos(response.videos as VideoItem[]);
        setTotal(response.total);
        setIsAdmin(admin);
      })
      .catch(() => {
        if (cancelled) return;
        setVideos([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag) ? previous.filter((value) => value !== tag) : [...previous, tag],
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / VIDEOS_PER_PAGE);
  const featuredVideo = videos[0] ?? null;
  const archiveVideos = featuredVideo ? videos.slice(1) : videos;
  const hasFilters = selectedTags.length > 0;

  const intentLinks = useMemo(
    () => [
      { title: "Watch explainers", href: "#video-library" },
      { title: "Browse protocol walkthroughs", href: "#video-grid" },
      { title: "Open documentation", href: "/resources/docs" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Resources
              </div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Videos
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Watch explainers, talks, and walkthroughs that make Ethereum standards, governance shifts, and proposal mechanics easier to understand.
              </p>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin?tab=videos"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card/60 px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                  Manage Videos
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {intentLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="inline-flex h-8 items-center rounded-full border border-border bg-muted/50 px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </section>

        <section
          id="video-library"
          className="mb-8 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Video Library</p>
              <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Watch by topic
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Filter talks and explainers by tags to narrow in on upgrades, standards, or governance themes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <Filter className="h-4 w-4" />
                {total} video{total === 1 ? "" : "s"}
              </span>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {allTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-all ${
                      selected
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {hasFilters && (
            <p className="mt-4 text-sm text-muted-foreground">
              Showing {total} video{total === 1 ? "" : "s"} for {selectedTags.join(", ")}.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-28">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading videos…</p>
          </div>
        ) : videos.length === 0 ? (
          <section className="mx-auto max-w-2xl rounded-xl border border-border bg-card/60 px-6 py-16 text-center backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/50">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-6 dec-title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              No videos yet
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We&apos;re curating walkthroughs, talks, and standards explainers. Use documentation and blogs for now, then come back for recorded deep dives.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/resources/docs"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:bg-primary/15"
              >
                Open Documentation
              </Link>
              <Link
                href="/resources/blogs"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                Read Commentary
              </Link>
            </div>
          </section>
        ) : (
          <>
            {featuredVideo && (
              <section className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
                <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <iframe
                      src={`https://www.youtube.com/embed/${featuredVideo.youtubeVideoId}`}
                      title={featuredVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Featured Video</p>
                  <h2 className="mt-2 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {featuredVideo.title}
                  </h2>
                  {featuredVideo.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {featuredVideo.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(featuredVideo.createdAt)}</span>
                    {featuredVideo.tags && featuredVideo.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{featuredVideo.tags.slice(0, 3).join(" • ")}</span>
                      </>
                    )}
                  </div>

                  {featuredVideo.tags && featuredVideo.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {featuredVideo.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="inline-flex h-8 items-center rounded-full border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <a
                      href={featuredVideo.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:bg-primary/15"
                    >
                      <Play className="h-4 w-4" />
                      Watch on YouTube
                    </a>
                    <a
                      href={featuredVideo.youtubeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      Share video
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </section>
            )}

            <section id="video-grid">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Library</p>
                  <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    More videos
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Browse explainers, interviews, and protocol walkthroughs from the current selection.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages || 1}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {archiveVideos.map((video) => (
                  <article
                    key={video.id}
                    className="group overflow-hidden rounded-xl border border-border bg-card/60 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
                  >
                    <div className="aspect-video overflow-hidden bg-muted">
                      <iframe
                        src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{formatDate(video.createdAt)}</span>
                        {video.tags && video.tags.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{video.tags[0]}</span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{video.description}</p>
                      )}
                      {video.tags && video.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {video.tags.slice(0, 4).map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {totalPages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-all ${
                          page === currentPage
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
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
