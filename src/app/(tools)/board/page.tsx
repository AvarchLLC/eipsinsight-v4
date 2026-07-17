"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { client } from "@/lib/orpc";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Flame,
  GitMerge,
  Info,
  Minus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PRRow = {
  prNumber: number;
  title: string | null;
  author: string | null;
  createdAt: string;
  labels: string[];
  repo: string;
  repoShort: string;
  govState: string;
  waitDays: number;
  processType: string;
  needsAttention: boolean;
  attentionReason: string | null;
  hasConflicts: boolean;
  stagnantPreamble: boolean;
  ethbotReview: boolean;
  authorIsPreambleAuthor: boolean;
  hasParticipants: boolean;
};

type BoardData = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rows: PRRow[];
};

type StatsData = {
  processTypes: { type: string; count: number }[];
  govStates: { state: string; label: string; count: number }[];
  totalOpen: number;
  needsAttention: number;
  hasConflicts: number;
};

type RepoKey = "" | "eips" | "ercs" | "rips";
type SortBy = "wait" | "pr" | "created";
type SortDir = "asc" | "desc";

const GOV_STATES = [
  {
    state: "Waiting on Editor",
    label: "Waiting on Editor",
    icon: "⏳",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
  },
  {
    state: "Waiting on Author",
    label: "Waiting on Author",
    icon: "✍️",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
  },
  {
    state: "AWAITED",
    label: "Awaited",
    icon: "📝",
    bg: "bg-slate-500/10",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/30",
  },
  {
    state: "Uncategorized",
    label: "Uncategorized",
    icon: "❓",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
] as const;

const PT_COLORS: Record<string, string> = {
  Typo: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "New EIP": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Website: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "EIP-1": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "Status Change": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  "PR DRAFT": "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20",
  "Content Edit": "bg-muted text-muted-foreground border-border",
  Misc: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
};

/** Unknown process types fall back to the Misc chip rather than rendering unstyled. */
const ptColor = (type: string) => PT_COLORS[type] ?? PT_COLORS.Misc;

const PROCESS_ORDER = ["Status Change", "New EIP", "PR DRAFT", "Typo", "Website", "EIP-1", "Content Edit", "Misc"];

const DEFAULT_GOV_STATES = ["Waiting on Editor"];
const DEFAULT_SORT: SortBy = "wait";
const DEFAULT_DIR: SortDir = "desc";
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZES = [10, 25, 50, 100];

const isDefaultStatuses = (s: string[]) =>
  s.length === DEFAULT_GOV_STATES.length && s.every((x) => DEFAULT_GOV_STATES.includes(x));

function getLabelColor(label: string): string {
  if (label.startsWith("c-")) return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300";
  if (label.startsWith("t-")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (label.startsWith("w-")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (label.startsWith("e-")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (label.startsWith("a-")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (label === "dependencies" || label === "ruby") return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
  return "bg-muted text-muted-foreground";
}

function fmtWait(days: number): string {
  if (days >= 7) return `${Math.floor(days / 7)}w`;
  return `${days}d`;
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityOf(days: number) {
  if (days > 28) return { color: "text-red-600 dark:text-red-400", Icon: Flame, note: "Waiting over 4 weeks" };
  if (days > 7) return { color: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle, note: "Waiting over a week" };
  return { color: "text-emerald-600 dark:text-emerald-400", Icon: Minus, note: "Recently active" };
}

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <BoardBrowser />
    </Suspense>
  );
}

function BoardBrowser() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Filters initialise from the URL, so a shared board link opens exactly as sent.
  const [repo, setRepo] = useState<RepoKey>(() => {
    const r = searchParams.get("repo");
    return r === "eips" || r === "ercs" || r === "rips" ? r : "";
  });
  const [selectedGovStates, setSelectedGovStates] = useState<string[]>(() => {
    const s = searchParams.get("status");
    if (s === null) return DEFAULT_GOV_STATES;
    if (s === "none") return [];
    return s.split(",").filter(Boolean);
  });
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>(() => {
    const p = searchParams.get("process");
    return p ? p.split(",").filter(Boolean) : [];
  });
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [pageSize, setPageSize] = useState(() => {
    const s = Number(searchParams.get("size"));
    return PAGE_SIZES.includes(s) ? s : DEFAULT_PAGE_SIZE;
  });
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const s = searchParams.get("sort");
    return s === "pr" || s === "created" || s === "wait" ? s : DEFAULT_SORT;
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => (searchParams.get("dir") === "asc" ? "asc" : "desc"));
  const [needsAttention, setNeedsAttention] = useState(() => searchParams.get("attn") === "1");
  const [hasConflicts, setHasConflicts] = useState(() => searchParams.get("conflict") === "1");

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [data, setData] = useState<BoardData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [csvExporting, setCsvExporting] = useState(false);
  const [mdExporting, setMdExporting] = useState(false);

  // Computed once, not on every render (a bare new Date() in the body is an impure render).
  const [monthLabel] = useState(() => new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }));

  // One debounced value drives BOTH queries, so typing no longer fires a stats request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const typedRepo = repo || undefined;
  const govFilter = selectedGovStates.length ? selectedGovStates : undefined;
  const processFilter = selectedProcessTypes.length ? selectedProcessTypes : undefined;
  const searchFilter = debouncedSearch || undefined;
  const attnFilter = needsAttention || undefined;
  const conflictFilter = hasConflicts || undefined;

  // Mirror state into the URL so "Copy link" (and browser back/refresh) actually work.
  useEffect(() => {
    const p = new URLSearchParams();
    if (repo) p.set("repo", repo);
    if (selectedGovStates.length === 0) p.set("status", "none");
    else if (!isDefaultStatuses(selectedGovStates)) p.set("status", selectedGovStates.join(","));
    if (selectedProcessTypes.length) p.set("process", selectedProcessTypes.join(","));
    if (debouncedSearch) p.set("q", debouncedSearch);
    if (page > 1) p.set("page", String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) p.set("size", String(pageSize));
    if (sortBy !== DEFAULT_SORT) p.set("sort", sortBy);
    if (sortDir !== DEFAULT_DIR) p.set("dir", sortDir);
    if (needsAttention) p.set("attn", "1");
    if (hasConflicts) p.set("conflict", "1");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [repo, selectedGovStates, selectedProcessTypes, debouncedSearch, page, pageSize, sortBy, sortDir, needsAttention, hasConflicts, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    // Deferred so the state updates don't run synchronously inside the effect body.
    const timer = setTimeout(async () => {
      setStatsLoading(true);
      try {
        const s = await client.tools.getOpenPRBoardStats({ repo: typedRepo, govState: govFilter, search: searchFilter });
        if (!cancelled) setStats(s);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedRepo, govFilter, searchFilter]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const d = await client.tools.getOpenPRBoard({
          repo: typedRepo,
          govState: govFilter,
          processType: processFilter,
          search: searchFilter,
          page,
          pageSize,
          sortBy,
          sortDir,
          needsAttention: attnFilter,
          hasConflicts: conflictFilter,
        });
        if (!cancelled) setData(d);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedRepo, govFilter, processFilter, searchFilter, page, pageSize, sortBy, sortDir, attnFilter, conflictFilter]);

  const totalMatching = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const startIdx = totalMatching > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(page * pageSize, totalMatching);

  const hasActiveFilters =
    Boolean(repo) ||
    !isDefaultStatuses(selectedGovStates) ||
    selectedProcessTypes.length > 0 ||
    Boolean(search) ||
    sortBy !== DEFAULT_SORT ||
    sortDir !== DEFAULT_DIR ||
    needsAttention ||
    hasConflicts;

  const toggleGovState = (state: string) => {
    setPage(1);
    setSelectedGovStates((prev) => (prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]));
  };

  const toggleProcessType = (type: string) => {
    setPage(1);
    setSelectedProcessTypes((prev) => (prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]));
  };

  const toggleSort = (col: SortBy) => {
    setPage(1);
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const resetFilters = () => {
    setRepo("");
    setSelectedGovStates(DEFAULT_GOV_STATES);
    setSelectedProcessTypes([]);
    setSearch("");
    setSortBy(DEFAULT_SORT);
    setSortDir(DEFAULT_DIR);
    setNeedsAttention(false);
    setHasConflicts(false);
    setPage(1);
  };

  const toggleAttention = () => {
    setPage(1);
    setNeedsAttention((v) => !v);
  };
  const toggleConflicts = () => {
    setPage(1);
    setHasConflicts((v) => !v);
  };

  const orderedProcessTypes = useMemo(() => {
    const all = (stats?.processTypes ?? []).map((p) => p.type);
    const sorted = PROCESS_ORDER.filter((p) => all.includes(p));
    const rest = all.filter((p) => !PROCESS_ORDER.includes(p));
    return [...sorted, ...rest];
  }, [stats]);

  const csvEscape = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll(`"`, `""`)}"`;

  const getAllFilteredRows = async (): Promise<PRRow[]> => {
    const exportPageSize = 500;
    const query = {
      repo: typedRepo,
      govState: govFilter,
      processType: processFilter,
      search: searchFilter,
      sortBy,
      sortDir,
      needsAttention: attnFilter,
      hasConflicts: conflictFilter,
    };
    const firstPage = await client.tools.getOpenPRBoard({ ...query, page: 1, pageSize: exportPageSize });

    let exportRows = firstPage.rows ?? [];
    for (let p = 2; p <= (firstPage.totalPages ?? 1); p++) {
      const next = await client.tools.getOpenPRBoard({ ...query, page: p, pageSize: exportPageSize });
      exportRows = exportRows.concat(next.rows ?? []);
    }
    return exportRows;
  };

  const downloadCSV = async () => {
    if (csvExporting) return;
    setCsvExporting(true);
    try {
      const exportRows = await getAllFilteredRows();
      if (!exportRows.length) return;

      const headers = ["Month", "Repo", "Process", "Participants", "PRNumber", "PRLink", "Title", "Author", "CreatedAt", "WaitDays", "Labels"];
      const lines = [headers.join(",")];
      exportRows.forEach((row) => {
        const repoName = row.repo.split("/")[1] ?? row.repo;
        const values = [
          monthLabel,
          repoName,
          row.processType,
          row.govState,
          row.prNumber,
          `https://github.com/${row.repo}/pull/${row.prNumber}`,
          row.title ?? "",
          row.author ?? "",
          row.createdAt ? new Date(`${row.createdAt}T00:00:00`).toISOString() : "",
          row.waitDays,
          (row.labels ?? []).join("|"),
        ];
        lines.push(values.map(csvEscape).join(","));
      });
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `board_${(repo || "all").toLowerCase()}_${monthLabel.replace(/\s+/g, "-")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded", { description: `${exportRows.length} PR rows exported.` });
    } catch (err) {
      console.error("CSV export failed:", err);
      toast.error("Failed to export CSV");
    } finally {
      setCsvExporting(false);
    }
  };

  const copyAsMarkdown = async () => {
    if (mdExporting) return;
    setMdExporting(true);
    try {
      const exportRows = await getAllFilteredRows();
      if (!exportRows.length) return;
      const grouped = new Map<string, PRRow[]>();
      exportRows.forEach((row) => {
        const process = row.processType || "Other";
        if (!grouped.has(process)) grouped.set(process, []);
        grouped.get(process)!.push(row);
      });

      const order = PROCESS_ORDER.concat([...grouped.keys()].filter((p) => !PROCESS_ORDER.includes(p)));
      let markdown = `## Open PR Board — ${monthLabel}\n\n`;
      for (const process of order) {
        const sectionRows = grouped.get(process);
        if (!sectionRows?.length) continue;
        markdown += `### ${process}\n`;
        sectionRows.forEach((row) => {
          const title = (row.title ?? "Untitled").replace(/\]/g, "\\]");
          const url = `https://github.com/${row.repo}/pull/${row.prNumber}`;
          markdown += `- [${title} #${row.prNumber}](${url}) — ${row.govState} · waiting ${fmtWait(row.waitDays)}\n`;
        });
        markdown += "\n";
      }

      await navigator.clipboard.writeText(markdown.trim());
      toast.success("Copied as markdown", { description: `${exportRows.length} PRs copied to clipboard.` });
    } catch {
      toast.error("Failed to copy markdown");
    } finally {
      setMdExporting(false);
    }
  };

  // The URL is already in sync with the filters, so sharing is just the current href.
  const copyFilterLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Filter link copied", { description: "Opens this board with the same filters and sort." });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <Link
            href="/tools"
            className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tools
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
                EIP / ERC / RIP Board
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Open pull requests by type and status for {monthLabel}. Sorted by longest wait first — the editorial queue,
                oldest at the top.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/board/agenda"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Agenda maker
              </Link>
              <button
                onClick={() => setShowInfo((v) => !v)}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
              >
                <Info className="h-3.5 w-3.5" />
                Info
                {showInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mt-3 grid gap-3 rounded-lg border border-border bg-card/60 p-3 sm:grid-cols-2">
              <InfoItem
                title="What does this page show?"
                body="Open PRs by process and participant status. You can select multiple statuses and process types together."
              />
              <InfoItem
                title="How do I triage?"
                body="Click any column header with arrows to sort. Wait descending (the default) puts the most-neglected PRs first."
              />
              <InfoItem
                title="How can I export/share?"
                body="Download CSV, Copy as MD, and Copy link all reflect the current filters and sort. The link restores them exactly."
              />
              <InfoItem
                title="Default focus"
                body="Waiting on Editor is selected by default so pending editorial work is front-and-center."
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6">
        <section className="rounded-xl border border-border bg-card/60 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search title, author, PR #"
                aria-label="Search pull requests"
                className="h-9 w-full rounded-md border border-border bg-muted/60 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 lg:col-span-4">
              {(
                [
                  { key: "", label: "All" },
                  { key: "eips", label: "EIPs" },
                  { key: "ercs", label: "ERCs" },
                  { key: "rips", label: "RIPs" },
                ] as const
              ).map((r) => (
                <button
                  key={r.key || "all"}
                  onClick={() => {
                    setRepo(r.key);
                    setPage(1);
                  }}
                  className={cn(
                    "h-9 rounded-md border px-3 text-xs transition-colors",
                    repo === r.key
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 lg:col-span-3">
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">{totalMatching.toLocaleString()}</span> matching
              </span>
              <button
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Status (multi-select)
            </p>
            <div className="flex flex-wrap gap-2">
              {GOV_STATES.map((gs) => {
                const active = selectedGovStates.includes(gs.state);
                const count = stats?.govStates.find((s) => s.state === gs.state)?.count ?? 0;
                return (
                  <button
                    key={gs.state}
                    onClick={() => toggleGovState(gs.state)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? `${gs.bg} ${gs.border} ${gs.text}`
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {gs.icon} {gs.label}{" "}
                    <span className={cn("opacity-70 transition-opacity", statsLoading && "animate-pulse opacity-40")}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Process (multi-select)
            </p>
            <div className="flex flex-wrap gap-2">
              {orderedProcessTypes.map((type) => {
                const count = stats?.processTypes.find((p) => p.type === type)?.count ?? 0;
                const active = selectedProcessTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleProcessType(type)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? ptColor(type)
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {type}{" "}
                    <span className={cn("opacity-70 transition-opacity", statsLoading && "animate-pulse opacity-40")}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Editor signals
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleAttention}
                aria-pressed={needsAttention}
                title="PRs the scheduler flagged as needing an editor's attention"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  needsAttention
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Bell className="h-3.5 w-3.5" /> Needs attention{" "}
                <span className={cn("opacity-70 transition-opacity", statsLoading && "animate-pulse opacity-40")}>
                  ({stats?.needsAttention ?? 0})
                </span>
              </button>
              <button
                onClick={toggleConflicts}
                aria-pressed={hasConflicts}
                title="PRs with merge conflicts — the author must resolve before review"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  hasConflicts
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <GitMerge className="h-3.5 w-3.5" /> Merge conflicts{" "}
                <span className={cn("opacity-70 transition-opacity", statsLoading && "animate-pulse opacity-40")}>
                  ({stats?.hasConflicts ?? 0})
                </span>
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {repo && <ActiveFilter label={`Repo: ${repo.toUpperCase()}`} onClear={() => setRepo("")} />}
                {selectedGovStates.map((s) => (
                  <ActiveFilter
                    key={s}
                    label={`Status: ${GOV_STATES.find((g) => g.state === s)?.label ?? s}`}
                    onClear={() => toggleGovState(s)}
                  />
                ))}
                {selectedProcessTypes.map((p) => (
                  <ActiveFilter key={p} label={`Process: ${p}`} onClear={() => toggleProcessType(p)} />
                ))}
                {needsAttention && <ActiveFilter label="Needs attention" onClear={() => setNeedsAttention(false)} />}
                {hasConflicts && <ActiveFilter label="Merge conflicts" onClear={() => setHasConflicts(false)} />}
                {search && <ActiveFilter label={`Search: ${search}`} onClear={() => setSearch("")} />}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="text-foreground">
                  {startIdx}–{endIdx}
                </span>{" "}
                of <span className="text-foreground">{totalMatching.toLocaleString()}</span> PRs
              </p>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded-md border border-border bg-muted/60 px-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                  aria-label="Rows per page"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={downloadCSV}
                disabled={!rows.length || loading || csvExporting}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {csvExporting ? "Exporting..." : "Download CSV"}
              </button>
              <button
                onClick={copyAsMarkdown}
                disabled={!rows.length || loading || mdExporting}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mdExporting ? "Copying..." : "Copy as MD"}
              </button>
              <button
                onClick={copyFilterLink}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:bg-muted"
              >
                Copy link
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70">
                  <SortableTh label="PR" col="pr" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} w="w-24" />
                  <Th>Title</Th>
                  <Th w="w-28">Author</Th>
                  <SortableTh label="Opened" col="created" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} w="w-24" />
                  <SortableTh label="Wait" col="wait" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} w="w-20" />
                  <Th w="w-28">Process</Th>
                  <Th w="w-36">Status</Th>
                  <Th w="w-44">Labels</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows colCount={8} rowCount={Math.min(pageSize, 10)} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                      No PRs match the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const p = priorityOf(row.waitDays);
                    const gsConf = GOV_STATES.find((g) => g.state === row.govState) ?? GOV_STATES[GOV_STATES.length - 1];
                    const labels = row.labels ?? [];
                    const showLabels = labels.slice(0, 2);
                    const extra = labels.length - showLabels.length;
                    const prUrl = `https://github.com/${row.repo}/pull/${row.prNumber}`;
                    return (
                      <tr
                        key={`${row.repo}-${row.prNumber}`}
                        className="group border-b border-border/60 transition-colors hover:bg-muted/40"
                      >
                        {/* The PR number is the primary link — no more hunting for an icon in the last column. */}
                        <td className="px-3 py-2">
                          <a
                            href={prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-semibold text-primary underline-offset-2 hover:underline"
                          >
                            #{row.prNumber}
                          </a>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{row.repoShort}</p>
                        </td>
                        <td className="max-w-0 px-3 py-2">
                          <a
                            href={prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.title ?? "Untitled"}
                            className="flex items-center gap-1.5 text-foreground transition-colors hover:text-primary"
                          >
                            <span className="truncate leading-snug">{row.title || "Untitled"}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                          </a>
                          <SignalBadges row={row} />
                          {row.attentionReason && (
                            <p className="mt-1 truncate text-[10px] text-rose-600 dark:text-rose-400" title={row.attentionReason}>
                              {row.attentionReason}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.author ? (
                            <a
                              href={`https://github.com/${row.author}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate underline-offset-2 transition-colors hover:text-foreground hover:underline"
                            >
                              {row.author}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={fmtDate(row.createdAt)}>
                          {fmtDateShort(row.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn("inline-flex items-center gap-1 text-[11px] font-medium", p.color)}
                            title={`${row.waitDays} days — ${p.note}`}
                          >
                            <p.Icon className="h-3 w-3" />
                            {fmtWait(row.waitDays)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              ptColor(row.processType),
                            )}
                          >
                            {row.processType}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              gsConf.bg,
                              gsConf.text,
                              gsConf.border,
                            )}
                          >
                            {gsConf.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {showLabels.map((l) => (
                              <span
                                key={l}
                                className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[10px]", getLabelColor(l))}
                              >
                                {l}
                              </span>
                            ))}
                            {extra > 0 && (
                              <span
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                title={labels.slice(2).join(", ")}
                              >
                                +{extra}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page <span className="text-foreground">{page}</span> of{" "}
              <span className="text-foreground">{data.totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <PgBtn disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} label="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" />
              </PgBtn>
              {pageRange(page, data.totalPages).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={cn(
                    "h-7 w-7 rounded-md border text-xs font-medium transition-colors",
                    n === page
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
              <PgBtn
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </PgBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact editorial-signal pills, shown under a PR's title. */
function SignalBadges({ row }: { row: PRRow }) {
  const badges: { key: string; label: string; title: string; cls: string; Icon?: typeof GitMerge }[] = [];
  if (row.hasConflicts)
    badges.push({
      key: "conflict",
      label: "Conflicts",
      title: "Merge conflicts — author must resolve before this can be reviewed",
      cls: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
      Icon: GitMerge,
    });
  if (row.stagnantPreamble)
    badges.push({
      key: "stagnant",
      label: "Stale preamble",
      title: "Preamble status has gone stale",
      cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    });
  if (row.ethbotReview)
    badges.push({
      key: "ethbot",
      label: "Bot escalated",
      title: "The eth-bot flagged this for editor review",
      cls: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    });
  if (row.authorIsPreambleAuthor)
    badges.push({
      key: "author",
      label: "By EIP author",
      title: "Opened by the EIP's own preamble author",
      cls: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    });
  if (row.hasParticipants)
    badges.push({
      key: "participants",
      label: "Discussed",
      title: "Other people are already participating on this PR",
      cls: "border-border bg-muted text-muted-foreground",
      Icon: Users,
    });

  if (badges.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b.key}
          title={b.title}
          className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium", b.cls)}
        >
          {b.Icon && <b.Icon className="h-2.5 w-2.5" />}
          {b.label}
        </span>
      ))}
    </div>
  );
}

function InfoItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function ActiveFilter({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] text-primary">
      {label}
      <button onClick={onClear} className="rounded p-0.5 hover:bg-primary/15" aria-label={`Clear ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Th({ children, w, center }: { children: React.ReactNode; w?: string; center?: boolean }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        center ? "text-center" : "text-left",
        w,
      )}
    >
      {children}
    </th>
  );
}

function SortableTh({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
  w,
}: {
  label: string;
  col: SortBy;
  sortBy: SortBy;
  sortDir: SortDir;
  onSort: (col: SortBy) => void;
  w?: string;
}) {
  const active = sortBy === col;
  const Icon = !active ? ArrowUpDown : sortDir === "desc" ? ArrowDown : ArrowUp;
  return (
    <th className={cn("px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider", w)}>
      <button
        onClick={() => onSort(col)}
        aria-label={`Sort by ${label}${active ? (sortDir === "desc" ? ", descending" : ", ascending") : ""}`}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
      </button>
    </th>
  );
}

function PgBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-border bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function SkeletonRows({ colCount, rowCount = 10 }: { colCount: number; rowCount?: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          {Array.from({ length: colCount }).map((_, j) => (
            <td key={j} className="px-3 py-2.5">
              <div className="h-3 animate-pulse rounded bg-muted" style={{ width: `${50 + ((i * 17 + j * 13) % 40)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function pageRange(current: number, total: number): number[] {
  const size = Math.min(5, total);
  const start = Math.max(1, Math.min(current - 2, total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}
