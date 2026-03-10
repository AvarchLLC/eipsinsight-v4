"use client";

import React, { useEffect, useMemo, useState } from "react";
import { client } from "@/lib/orpc";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Flame,
  Info,
  Minus,
  RotateCcw,
  Search,
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
};

const GOV_STATES = [
  {
    state: "WAITING_ON_EDITOR",
    label: "Awaiting Editor",
    icon: "⏳",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
  },
  {
    state: "WAITING_ON_AUTHOR",
    label: "Waiting on Author",
    icon: "✍️",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
  },
  {
    state: "STALLED",
    label: "Stalled",
    icon: "🔴",
    bg: "bg-red-500/10",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500/30",
  },
  {
    state: "DRAFT",
    label: "Draft PR",
    icon: "📝",
    bg: "bg-slate-500/10",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/30",
  },
  {
    state: "NO_STATE",
    label: "Uncategorized",
    icon: "❓",
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
  },
] as const;

const PT_COLORS: Record<string, string> = {
  Typo: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "NEW EIP": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Website: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20",
  "EIP-1": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  Tooling: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20",
  "Status Change": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  Other: "bg-muted text-muted-foreground border-border",
};

const PROCESS_ORDER = ["Status Change", "NEW EIP", "DRAFT", "Typo", "Website", "EIP-1", "Tooling", "Other"];

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
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `${w}w`;
  }
  return `${days}d`;
}

function fmtDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function priorityOf(days: number) {
  if (days > 28) return { color: "text-red-600 dark:text-red-400", Icon: Flame };
  if (days > 7) return { color: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle };
  return { color: "text-emerald-600 dark:text-emerald-400", Icon: Minus };
}

export default function BoardPage() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [repo, setRepo] = useState<"" | "eips" | "ercs" | "rips">("");
  const [selectedGovStates, setSelectedGovStates] = useState<string[]>(["WAITING_ON_EDITOR"]);
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [data, setData] = useState<BoardData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);

  const typedRepo = repo || undefined;

  useEffect(() => {
    setStatsLoading(true);
    client.tools
      .getOpenPRBoardStats({
        repo: typedRepo,
        govState: selectedGovStates.length ? selectedGovStates : undefined,
        search: search || undefined,
      })
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [typedRepo, selectedGovStates, search]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await client.tools.getOpenPRBoard({
          repo: typedRepo,
          govState: selectedGovStates.length ? selectedGovStates : undefined,
          processType: selectedProcessTypes.length ? selectedProcessTypes : undefined,
          search: search || undefined,
          page,
          pageSize: 10,
        });
        setData(d);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [typedRepo, selectedGovStates, selectedProcessTypes, search, page]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const totalMatching = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const startIdx = totalMatching > 0 ? (page - 1) * 10 + 1 : 0;
  const endIdx = Math.min(page * 10, totalMatching);

  const hasActiveFilters = Boolean(repo || selectedGovStates.length || selectedProcessTypes.length || search);

  const toggleGovState = (state: string) => {
    setPage(1);
    setSelectedGovStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  };

  const toggleProcessType = (type: string) => {
    setPage(1);
    setSelectedProcessTypes((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type],
    );
  };

  const resetFilters = () => {
    setRepo("");
    setSelectedGovStates(["WAITING_ON_EDITOR"]);
    setSelectedProcessTypes([]);
    setSearch("");
    setPage(1);
  };

  const orderedProcessTypes = useMemo(() => {
    const all = (stats?.processTypes ?? []).map((p) => p.type);
    const sorted = PROCESS_ORDER.filter((p) => all.includes(p));
    const rest = all.filter((p) => !PROCESS_ORDER.includes(p));
    return [...sorted, ...rest];
  }, [stats]);

  const csvEscape = (value: string | number | null | undefined) => `"${String(value ?? "").replaceAll(`"`, `""`)}` + `"`;

  const downloadCSV = () => {
    if (!rows.length) return;
    const headers = ["Month", "Repo", "Process", "Participants", "PRNumber", "PRLink", "Title", "Author", "CreatedAt", "Labels"];
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      const repoName = row.repo.split("/")[1] ?? row.repo;
      const prLink = `https://github.com/${row.repo}/pull/${row.prNumber}`;
      const values = [
        monthLabel,
        repoName,
        row.processType,
        row.govState,
        row.prNumber,
        prLink,
        row.title ?? "",
        row.author ?? "",
        row.createdAt ? new Date(`${row.createdAt}T00:00:00`).toISOString() : "",
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
    toast.success("CSV downloaded", {
      description: `${rows.length} PR rows exported.`,
    });
  };

  const copyAsMarkdown = async () => {
    if (!rows.length) return;
    const grouped = new Map<string, PRRow[]>();
    rows.forEach((row) => {
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
        markdown += `- [${title} #${row.prNumber}](${url}) — ${row.govState}\n`;
      });
      markdown += "\n";
    }
    try {
      await navigator.clipboard.writeText(markdown.trim());
      toast.success("Copied as markdown", {
        description: `${rows.length} PRs copied to clipboard.`,
      });
    } catch {
      toast.error("Failed to copy markdown");
    }
  };

  const copyFilterLink = async () => {
    const url = new URL(window.location.href);
    if (repo) url.searchParams.set("repo", repo);
    else url.searchParams.delete("repo");

    if (selectedGovStates.length) url.searchParams.set("status", selectedGovStates.join(","));
    else url.searchParams.delete("status");

    if (selectedProcessTypes.length) url.searchParams.set("process", selectedProcessTypes.join(","));
    else url.searchParams.delete("process");

    if (search) url.searchParams.set("q", search);
    else url.searchParams.delete("q");

    url.searchParams.set("page", String(page));
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Filter link copied", {
        description: "Shareable board URL copied to clipboard.",
      });
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <Link href="/tools" className="mb-2 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Tools
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">EIP / ERC / RIP Board</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Open pull requests by type and status for {monthLabel}. Filter by repo, process type, and participant status.
              </p>
            </div>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <Info className="h-3.5 w-3.5" />
              Info
              {showInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {showInfo && (
            <div className="mt-3 grid gap-3 rounded-lg border border-border bg-card/60 p-3 sm:grid-cols-2">
              <InfoItem title="What does this page show?" body="Open PRs by process and participant status. You can select multiple statuses and process types together." />
              <InfoItem title="How can I filter?" body="Use top filters for repo, status chips, process chips, and search. Filters combine together." />
              <InfoItem title="How can I export/share?" body="Download CSV, Copy as MD, and Copy link all reflect current filters." />
              <InfoItem title="Default focus" body="Awaiting Editor is selected by default so pending editorial work is front-and-center." />
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
                className="h-9 w-full rounded-md border border-border bg-muted/60 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 lg:col-span-4">
              {([
                { key: "", label: "All" },
                { key: "eips", label: "EIPs" },
                { key: "ercs", label: "ERCs" },
                { key: "rips", label: "RIPs" },
              ] as const).map((r) => (
                <button
                  key={r.key || "all"}
                  onClick={() => {
                    setRepo(r.key);
                    setPage(1);
                  }}
                  className={cn(
                    "h-9 rounded-md border px-3 text-xs transition-colors",
                    repo === r.key ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 lg:col-span-3">
              <span className="text-xs text-muted-foreground"><span className="font-semibold text-primary">{totalMatching.toLocaleString()}</span> matching</span>
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
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Status (multi-select)</p>
            <div className="flex flex-wrap gap-2">
              {GOV_STATES.map((gs) => {
                const active = selectedGovStates.includes(gs.state);
                const count = stats?.govStates.find((s) => s.state === gs.state)?.count ?? 0;
                return (
                  <button
                    key={gs.state}
                    onClick={() => toggleGovState(gs.state)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs transition-colors",
                      active ? `${gs.bg} ${gs.border} ${gs.text}` : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {gs.icon} {gs.label} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Process (multi-select)</p>
            <div className="flex flex-wrap gap-2">
              {orderedProcessTypes.map((type) => {
                const count = stats?.processTypes.find((p) => p.type === type)?.count ?? 0;
                const active = selectedProcessTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleProcessType(type)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      active ? PT_COLORS[type] ?? PT_COLORS.Other : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {type} <span className="opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {(selectedGovStates.length > 0 || selectedProcessTypes.length > 0 || search || repo) && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {repo && <ActiveFilter label={`Repo: ${repo.toUpperCase()}`} onClear={() => setRepo("")} />}
                {selectedGovStates.map((s) => (
                  <ActiveFilter key={s} label={`Status: ${GOV_STATES.find((g) => g.state === s)?.label ?? s}`} onClear={() => toggleGovState(s)} />
                ))}
                {selectedProcessTypes.map((p) => (
                  <ActiveFilter key={p} label={`Process: ${p}`} onClear={() => toggleProcessType(p)} />
                ))}
                {search && <ActiveFilter label={`Search: ${search}`} onClear={() => setSearch("")} />}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Showing <span className="text-foreground">{startIdx}–{endIdx}</span> of <span className="text-foreground">{totalMatching.toLocaleString()}</span> PRs
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={downloadCSV} disabled={!rows.length || loading} className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50">Download CSV</button>
              <button onClick={copyAsMarkdown} disabled={!rows.length || loading} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">Copy as MD</button>
              <button onClick={copyFilterLink} className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 text-xs text-foreground transition-colors hover:bg-muted">Copy link</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70">
                  <Th w="w-20">PR</Th>
                  <Th>Title</Th>
                  <Th w="w-28">Author</Th>
                  <Th w="w-20">Wait</Th>
                  <Th w="w-28">Process</Th>
                  <Th w="w-36">Status</Th>
                  <Th w="w-52">Labels</Th>
                  <Th w="w-16" center>Open</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows colCount={8} />
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">No PRs match the current filters.</td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const p = priorityOf(row.waitDays);
                    const gsConf = GOV_STATES.find((g) => g.state === row.govState) ?? GOV_STATES[4];
                    const labels = row.labels ?? [];
                    const showLabels = labels.slice(0, 2);
                    const extra = labels.length - showLabels.length;
                    return (
                      <tr key={`${row.repo}-${row.prNumber}`} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                        <td className="px-3 py-2 font-mono font-semibold text-primary">#{row.prNumber}</td>
                        <td className="px-3 py-2">
                          <p className="truncate leading-snug text-foreground">{row.title || "Untitled"}</p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{fmtDate(row.createdAt)}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.author || "—"}</td>
                        <td className="px-3 py-2"><span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", p.color)}><p.Icon className="h-3 w-3" />{fmtWait(row.waitDays)}</span></td>
                        <td className="px-3 py-2"><span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", PT_COLORS[row.processType] ?? PT_COLORS.Other)}>{row.processType}</span></td>
                        <td className="px-3 py-2"><span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium", gsConf.bg, gsConf.text, gsConf.border)}>{gsConf.label}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {showLabels.map((l) => (
                              <span key={l} className={cn("whitespace-nowrap rounded px-1.5 py-0.5 text-[10px]", getLabelColor(l))}>{l}</span>
                            ))}
                            {extra > 0 && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{extra}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <a href={`https://github.com/${row.repo}/pull/${row.prNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/15"><ExternalLink className="h-2.5 w-2.5" /></a>
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
            <p className="text-xs text-muted-foreground">Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{data.totalPages}</span></p>
            <div className="flex items-center gap-1.5">
              <PgBtn disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-3.5 w-3.5" /></PgBtn>
              {pageRange(page, data.totalPages).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={cn("h-7 w-7 rounded-md border text-xs font-medium transition-colors", n === page ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>{n}</button>
              ))}
              <PgBtn disabled={page === data.totalPages} onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}><ChevronRight className="h-3.5 w-3.5" /></PgBtn>
            </div>
          </div>
        )}
      </div>
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
    <th className={cn("px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", center ? "text-center" : "text-left", w)}>
      {children}
    </th>
  );
}

function PgBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded-md border border-border bg-muted/50 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30">
      {children}
    </button>
  );
}

function SkeletonRows({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
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
