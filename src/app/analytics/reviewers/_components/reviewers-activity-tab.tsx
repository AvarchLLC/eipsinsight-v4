"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronDown,
  Calendar,
  GitPullRequest,
  CheckCircle2,
  MessageSquare,
  GitCommit,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ReviewerActionDetailRow,
  getGitHubAvatarUrl,
  downloadCsv,
} from "./types";

interface ReviewersActivityTabProps {
  reviewerActionDetails: ReviewerActionDetailRow[];
  selectedReviewer?: string;
  onSelectReviewer?: (actor: string) => void;
}

export function ReviewersActivityTab({
  reviewerActionDetails,
  selectedReviewer,
  onSelectReviewer,
}: ReviewersActivityTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState<string>("all");
  const [reviewerFilter, setReviewerFilter] = useState<string>(selectedReviewer || "all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(25);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Options
  const repoOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((r) => r.repoShort))).filter(Boolean).sort();
  }, [reviewerActionDetails]);

  const reviewerOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((r) => r.actor))).filter(Boolean).sort();
  }, [reviewerActionDetails]);

  const actionOptions = useMemo(() => {
    return Array.from(new Set(reviewerActionDetails.map((r) => r.eventType.toLowerCase()))).filter(Boolean).sort();
  }, [reviewerActionDetails]);

  // Filtered Feed
  const filteredFeed = useMemo(() => {
    return reviewerActionDetails.filter((row) => {
      if (repoFilter !== "all" && row.repoShort !== repoFilter) return false;
      if (reviewerFilter !== "all" && row.actor !== reviewerFilter) return false;
      if (actionFilter !== "all" && row.eventType.toLowerCase() !== actionFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesActor = row.actor.toLowerCase().includes(query);
        const matchesTitle = row.title ? row.title.toLowerCase().includes(query) : false;
        const matchesPR = String(row.prNumber).includes(query);
        if (!matchesActor && !matchesTitle && !matchesPR) return false;
      }

      return true;
    });
  }, [reviewerActionDetails, repoFilter, reviewerFilter, actionFilter, searchQuery]);

  const visibleFeed = useMemo(() => {
    return filteredFeed.slice(0, visibleCount);
  }, [filteredFeed, visibleCount]);

  const hasMore = visibleCount < filteredFeed.length;

  const formatEventLabel = (eventType: string) => {
    const norm = eventType.toLowerCase();
    if (norm === "reviewed") return "Reviewed";
    if (norm === "commented") return "Commented";
    if (norm === "opened") return "Opened PR";
    if (norm === "closed") return "Closed PR";
    if (norm === "committed") return "Committed";
    if (norm === "merged") return "Merged PR";
    if (norm === "reopened") return "Reopened";
    return eventType;
  };

  const getActionBadgeClass = (eventType: string) => {
    const norm = eventType.toLowerCase();
    if (norm === "reviewed") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-400";
    if (norm === "commented") return "border-cyan-500/35 bg-cyan-500/12 text-cyan-400";
    if (norm === "committed") return "border-blue-500/35 bg-blue-500/12 text-blue-400";
    if (norm === "opened") return "border-violet-500/35 bg-violet-500/12 text-violet-400";
    if (norm === "closed") return "border-rose-500/35 bg-rose-500/12 text-rose-400";
    if (norm === "merged") return "border-amber-500/35 bg-amber-500/12 text-amber-400";
    return "border-border/60 bg-muted/40 text-foreground/80";
  };

  const formatTime = (actedAt: string) => {
    const parsed = new Date(actedAt.includes("T") ? actedAt : `${actedAt.replace(" ", "T")}Z`);
    if (Number.isNaN(parsed.getTime())) return actedAt;
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  };

  const handleExportCSV = useCallback(() => {
    const headers = ["Reviewer", "Action", "Repository", "PR Number", "Title", "Date (UTC)"];
    const rows = filteredFeed.map((r) => [
      r.actor,
      r.eventType,
      r.repoShort,
      r.prNumber,
      r.title || "",
      r.actedAt,
    ]);
    downloadCsv(`reviewer-activity-feed-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [filteredFeed]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title, PR #, or reviewer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(25);
              }}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Repo Selector */}
          <select
            value={repoFilter}
            onChange={(e) => {
              setRepoFilter(e.target.value);
              setVisibleCount(25);
            }}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Repositories</option>
            {repoOptions.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>

          {/* Reviewer Selector */}
          <select
            value={reviewerFilter}
            onChange={(e) => {
              setReviewerFilter(e.target.value);
              setVisibleCount(25);
            }}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Reviewers</option>
            {reviewerOptions.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>

          {/* Action Selector */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setVisibleCount(25);
            }}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Action Types</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {formatEventLabel(act)}
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {filteredFeed.length.toLocaleString()} actions
          </span>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 px-2.5 text-xs font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Activity Timeline Card */}
      <div className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Reviewer Activity Stream</h3>
            <p className="text-xs text-muted-foreground">
              Real-time feed of reviews, comments, and PR triage events by reviewers
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            Showing {Math.min(visibleCount, filteredFeed.length)} of {filteredFeed.length}
          </span>
        </div>

        <div className="divide-y divide-border/40">
          {visibleFeed.map((row, idx) => {
            const key = `${row.actor}-${row.prNumber}-${row.actedAt}-${row.eventType}-${idx}`;
            const expanded = Boolean(expandedKeys[key]);
            const eventLabel = formatEventLabel(row.eventType);

            return (
              <div key={key} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                          getActionBadgeClass(row.eventType),
                        )}
                      >
                        {eventLabel}
                      </span>

                      <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                        {row.repoShort}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setReviewerFilter(row.actor);
                          onSelectReviewer?.(row.actor);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        <img
                          src={getGitHubAvatarUrl(row.actor)}
                          alt={row.actor}
                          className="h-4 w-4 rounded-full border border-border/80 object-cover"
                        />
                        <span>{row.actor}</span>
                      </button>

                      <Link
                        href={`/pr/${row.repoShort}/${row.prNumber}`}
                        className="text-xs font-mono text-primary hover:underline"
                      >
                        #{row.prNumber}
                      </Link>
                    </div>

                    {row.title && (
                      <p className="mt-2 text-sm font-medium text-foreground/90 line-clamp-2">
                        <Link
                          href={`/pr/${row.repoShort}/${row.prNumber}`}
                          className="hover:text-primary transition-colors"
                        >
                          {row.title}
                        </Link>
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {formatTime(row.actedAt)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
                    />
                    <span>{expanded ? "Hide Details" : "Show Details"}</span>
                  </button>

                  {row.eventUrl && (
                    <a
                      href={row.eventUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View on GitHub</span>
                    </a>
                  )}
                </div>

                {expanded && (
                  <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5 font-mono">
                    <div>
                      <span className="text-foreground font-semibold">Event Type:</span> {row.eventType}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Repository:</span> {row.repoShort}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">PR Number:</span> #{row.prNumber}
                    </div>
                    <div>
                      <span className="text-foreground font-semibold">Timestamp:</span> {row.actedAt}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleFeed.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No reviewer actions match your search or filter settings.
            </div>
          )}
        </div>

        {hasMore && (
          <div className="p-3 border-t border-border/60 text-center bg-muted/20">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 25)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <span>Load More Actions</span>
              <span className="text-muted-foreground">({filteredFeed.length - visibleCount} remaining)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
