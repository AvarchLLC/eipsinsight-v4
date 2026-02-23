"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { client } from "@/lib/orpc";
import {
  Loader2,
  Download,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  GitCommitHorizontal,
  RotateCcw,
  ChevronDown,
  Filter,
  BarChart3,
  GitMerge,
  Users,
  Trophy,
  Rss,
  Shield,
  Eye,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { StandardsPageHeader } from "@/app/standards/_components/standards-page-header";
import { CopyLinkButton } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ──────── Types ────────
type RepoTab = "all" | "eips" | "ercs" | "rips";

interface KPIs {
  total: number;
  inReview: number;
  finalized: number;
  newThisYear: number;
}

interface RIPKPIs {
  total: number;
  active: number;
  recentCommits: number;
  mostActiveRip: number | null;
  mostActiveTitle: string | null;
  mostActiveCommits: number;
}

interface StatusDist {
  status: string;
  repo: string;
  count: number;
}

interface TrendItem {
  year: number;
  repo: string;
  count: number;
}

interface CategoryItem {
  category: string;
  count: number;
}

interface TableRow {
  repo: string;
  number: number;
  title: string | null;
  author: string | null;
  status: string;
  type: string | null;
  category: string | null;
  createdAt: string | null;
  updatedAt: string;
  daysInStatus: number;
  linkedPRs: number;
}

interface RIPRow {
  number: number;
  title: string | null;
  status: string | null;
  author: string | null;
  createdAt: string | null;
  lastCommit: string | null;
  commits: number;
}

interface RIPActivity {
  month: string;
  count: number;
}

type ChartMode = "repository" | "category" | "status";

interface RecentClosedMergedPR {
  number: string;
  title: string;
  status: string;
  closedAt: string;
  repoShort: string;
}

interface EditorReview {
  prNumber: string;
  title: string;
  reviewer: string;
  submittedAt: string;
  repoShort: string;
}

interface LeaderboardEntry {
  actor: string;
  totalReviews?: number;
  prsTouched?: number;
  total?: number;
  reviews?: number;
  prsAuthored?: number;
  prsReviewed?: number;
}

// ──────── Colors ────────
const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee",
  Review: "#60a5fa",
  "Last Call": "#fbbf24",
  Final: "#34d399",
  Living: "#a78bfa",
  Stagnant: "#94a3b8",
  Withdrawn: "#ef4444",
};

const REPO_COLORS: Record<string, string> = {
  eips: "#34d399",
  ercs: "#60a5fa",
  rips: "#fbbf24",
  unknown: "#94a3b8",
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Core: "#60a5fa",
  Interface: "#f472b6",
  Networking: "#fb923c",
  ERC: "#34d399",
  Informational: "#a78bfa",
  Meta: "#9f7aea",
  Other: "#94a3b8",
};

const CATEGORY_COLORS = [
  "#60a5fa",
  "#f472b6",
  "#fb923c",
  "#34d399",
  "#a78bfa",
  "#9f7aea",
  "#94a3b8",
];

// ──────── Page Content ────────
function StandardsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── URL-driven state ──
  const repo = (searchParams.get("repo") as RepoTab) || "all";

  // ── Filter state ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // ── Column search state ──
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  // export progress state
  const [exportingId, setExportingId] = useState<string | null>(null);

  // ── Sort + Pagination ──
  const [sortBy, setSortBy] = useState<string>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  // ── Data state ──
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [ripKpis, setRipKpis] = useState<RIPKPIs | null>(null);
  const [statusDist, setStatusDist] = useState<StatusDist[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [ripTableData, setRipTableData] = useState<RIPRow[]>([]);
  const [ripActivity, setRipActivity] = useState<RIPActivity[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    types: string[];
    categories: string[];
  }>({ statuses: [], types: [], categories: [] });

  // ── Chart mode (Repository / Category / Status) ──
  const [chartMode, setChartMode] = useState<ChartMode>("repository");
  const [timelineCatStatus, setTimelineCatStatus] = useState<Array<{ year: number; breakdown: Array<{ primary: string; secondary: string; count: number }> }>>([]);

  // ── Activity & leaderboards ──
  const [recentClosedMergedPRs, setRecentClosedMergedPRs] = useState<RecentClosedMergedPR[]>([]);
  const [editorReviewsLast24h, setEditorReviewsLast24h] = useState<EditorReview[]>([]);
  const [reviewActivityTotal, setReviewActivityTotal] = useState<number>(0);
  const [editorsLeaderboard, setEditorsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reviewersLeaderboard, setReviewersLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [contributorsLeaderboard, setContributorsLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"editors" | "reviewers" | "contributors">("editors");

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Tab switch helper ──
  const setRepo = useCallback(
    (newRepo: RepoTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newRepo === "all") {
        params.delete("repo");
      } else {
        params.set("repo", newRepo);
      }
      router.replace(`/standards?${params.toString()}`);
      setPage(1);
    },
    [router, searchParams]
  );

  const repoParam = repo === "all" ? undefined : repo;
  const isRIP = repo === "rips";

  // Reset sort to valid value when switching to/from RIPs
  React.useEffect(() => {
    if (isRIP) {
      // Valid RIP sortBy values: number, title, status, author, created_at, last_commit, commits
      const validRIPSorts = ['number', 'title', 'status', 'author', 'created_at', 'last_commit', 'commits'];
      if (!validRIPSorts.includes(sortBy)) {
        setSortBy('number');
      }
    } else {
      // Valid EIP/ERC sortBy values
      const validEIPSorts = ['number', 'title', 'status', 'type', 'category', 'created_at', 'updated_at', 'days_in_status', 'linked_prs'];
      if (!validEIPSorts.includes(sortBy)) {
        setSortBy('number');
      }
    }
  }, [isRIP, sortBy]);

  // ── Fetch filter options ──
  useEffect(() => {
    if (!isRIP) {
      client.standards.getFilterOptions({ repo: repoParam }).then(setFilterOptions).catch(console.error);
    }
  }, [repoParam, isRIP]);

  // ── Fetch KPIs + Charts ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isRIP) {
          const [rk, ra] = await Promise.all([
            client.standards.getRIPKPIs(),
            client.standards.getRIPActivity(),
          ]);
          setRipKpis(rk);
          setRipActivity(ra);
        } else {
          const [k, sd, tr, cat] = await Promise.all([
            client.standards.getKPIs({ repo: repoParam }),
            client.standards.getStatusDistribution({ repo: repoParam }),
            client.standards.getCreationTrends({ repo: repoParam }),
            client.standards.getCategoryBreakdown({ repo: repoParam }),
          ]);
          setKpis(k);
          setStatusDist(sd);
          setTrends(tr);
          setCategoryData(cat);
        }
      } catch (err) {
        console.error("Failed to load KPIs/charts:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [repoParam, isRIP]);

  // ── Fetch timeline by category/status (for chart switcher) ──
  useEffect(() => {
    if (isRIP || (chartMode !== "category" && chartMode !== "status")) return;
    const primary = chartMode === "category" ? "category" : "status";
    const includeRIPs = repoParam === undefined;
    client.governanceTimeline
      .getTimelineByCategoryAndStatus({ includeRIPs, primaryDimension: primary })
      .then(setTimelineCatStatus)
      .catch(console.error);
  }, [chartMode, repoParam, isRIP]);

  // ── Fetch activity & leaderboards (for EIPs/ERCs) ──
  useEffect(() => {
    if (isRIP) return;
    Promise.all([
      client.analytics.getRecentClosedMergedPRs({ limit: 25, repo: repoParam }),
      client.analytics.getEditorReviewsLast24h({ limit: 50, repo: repoParam }),
      client.analytics.getReviewActivityTotal({ hours: 24, repo: repoParam }),
      client.analytics.getEditorsLeaderboard({ limit: 10, repo: repoParam }),
      client.analytics.getReviewersLeaderboard({ limit: 10, repo: repoParam }),
      client.analytics.getContributorRankings({ limit: 10, repo: repoParam, sortBy: "total" }),
    ])
      .then(([prs, reviews, totalRes, eds, revs, contribs]) => {
        setRecentClosedMergedPRs(prs);
        setEditorReviewsLast24h(reviews);
        setReviewActivityTotal(totalRes.total);
        setEditorsLeaderboard(eds);
        setReviewersLeaderboard(revs);
        setContributorsLeaderboard(
          contribs.map((c) => ({
            actor: c.actor,
            total: c.total,
            reviews: c.reviews,
            prsAuthored: c.prsAuthored,
            prsReviewed: c.prsReviewed,
          }))
        );
      })
      .catch(console.error);
  }, [repoParam, isRIP]);

  // ── Fetch table ──
  useEffect(() => {
    const loadTable = async () => {
      try {
        if (isRIP) {
          const res = await client.standards.getRIPsTable({
            search: debouncedSearch || undefined,
            sortBy: sortBy as "number" | "title" | "status" | "author" | "created_at" | "last_commit" | "commits",
            sortDir,
            page,
            pageSize,
          });
          setRipTableData(res.rows);
          setTotalRows(res.total);
          setTotalPages(res.totalPages);
        } else {
          const res = await client.standards.getTable({
            repo: repoParam,
            status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
            type: selectedTypes.length > 0 ? selectedTypes : undefined,
            category: selectedCategories.length > 0 ? selectedCategories : undefined,
            yearFrom,
            yearTo,
            search: debouncedSearch || undefined,
            sortBy: sortBy as "number" | "title" | "status" | "type" | "category" | "created_at" | "updated_at" | "days_in_status" | "linked_prs",
            sortDir,
            page,
            pageSize,
          });
          setTableData(res.rows);
          setTotalRows(res.total);
          setTotalPages(res.totalPages);
        }
      } catch (err) {
        console.error("Failed to load table:", err);
      }
    };
    loadTable();
  }, [
    repoParam,
    isRIP,
    selectedStatuses,
    selectedTypes,
    selectedCategories,
    yearFrom,
    yearTo,
    debouncedSearch,
    sortBy,
    sortDir,
    page,
    pageSize,
  ]);

  // ── CSV Download Helpers ──
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVDownload = useCallback(async () => {
    try {
      const result = await client.standards.exportCSV({
        repo: repoParam,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        type: selectedTypes.length > 0 ? selectedTypes : undefined,
        category: selectedCategories.length > 0 ? selectedCategories : undefined,
      });
      downloadCSV(result.filename, result.csv);
    } catch (err) {
      console.error("CSV export failed:", err);
    }
  }, [repoParam, selectedStatuses, selectedTypes, selectedCategories]);

  // ── Reset filters ──
  const resetFilters = () => {
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedCategories([]);
    setYearFrom(undefined);
    setYearTo(undefined);
    setSearchQuery("");
    setPage(1);
  };

  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    selectedTypes.length > 0 ||
    selectedCategories.length > 0 ||
    yearFrom !== undefined ||
    yearTo !== undefined ||
    searchQuery.trim() !== "";

  // ── Sort handler ──
  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 text-slate-600 dark:text-slate-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    );
  };

  // ── Column-filtered table data ──
  const filteredTableData = useMemo(() => {
    if (!tableData.length) return tableData;
    return tableData.filter(row => {
      return Object.entries(columnSearch).every(([col, search]) => {
        if (!search) return true;
        const value = String(row[col as keyof TableRow] ?? '').toLowerCase();
        return value.includes(search.toLowerCase());
      });
    });
  }, [tableData, columnSearch]);

  const filteredRipTableData = useMemo(() => {
    if (!ripTableData.length) return ripTableData;
    return ripTableData.filter(row => {
      return Object.entries(columnSearch).every(([col, search]) => {
        if (!search) return true;
        const value = String(row[col as keyof RIPRow] ?? '').toLowerCase();
        return value.includes(search.toLowerCase());
      });
    });
  }, [ripTableData, columnSearch]);

  // ── Chart Data Transforms ──
  const stackedStatusData = useMemo(() => {
    if (!statusDist || statusDist.length === 0) return [];

    const byStatus: Record<string, Record<string, number>> = {};
    const reposSeen = new Set<string>();
    for (const d of statusDist) {
      reposSeen.add(d.repo);
      if (!byStatus[d.status]) byStatus[d.status] = {};
      byStatus[d.status][d.repo] = d.count;
    }

    const result = Object.entries(byStatus).map(([status, repos]) => {
      const entry: { status: string; [key: string]: number | string } = { status };
      let total = 0;
      for (const [repoKey, cnt] of Object.entries(repos)) {
        entry[repoKey] = Number(cnt || 0);
        total += Number(cnt || 0);
      }
      entry.total = total;
      return entry;
    }).filter((d) => Number(d.total) > 0);

    // Attach repo order for rendering
    return result;
  }, [statusDist]);

  const handleSegmentDownload = useCallback(async (segmentRepo: string, status: string) => {
    const exportRepo = repo === "all" ? segmentRepo : repo;
    const id = `seg-${exportRepo}-${status}`;
    setExportingId(id);
    try {
      const result = await client.standards.exportCSV({
        repo: exportRepo === "all" ? undefined : (exportRepo as "eips" | "ercs" | "rips"),
        status: [status],
      });
      downloadCSV(result.filename.replace(".csv", `-${exportRepo}-${status}.csv`), result.csv);
    } catch (err) {
      console.error("Segment CSV export failed:", err);
    } finally {
      setExportingId((cur) => (cur === id ? null : cur));
    }
  }, [repo, repoParam]);

  // repo keys present in statusDist, ordered by preferred order
  const stackedRepoOrder = useMemo(() => {
    const seen = new Set<string>(statusDist.map((d) => d.repo));
    const pref = ["eips", "ercs", "rips", "unknown"];
    const ordered = pref.filter((p) => seen.has(p));
    // any other repos appended
    for (const s of Array.from(seen)) {
      if (!ordered.includes(s)) ordered.push(s);
    }
    return ordered;
  }, [statusDist]);
 

  const barsNodes = useMemo(() => {
    if (repo === "all") {
      return stackedRepoOrder.map((repoKey) => (
        <Bar
          key={repoKey}
          dataKey={repoKey}
          stackId="a"
          fill={REPO_COLORS[repoKey] ?? REPO_COLORS.unknown}
          name={repoKey.toUpperCase()}
          radius={[
            repoKey === stackedRepoOrder[stackedRepoOrder.length - 1] ? 4 : 0,
            repoKey === stackedRepoOrder[stackedRepoOrder.length - 1] ? 4 : 0,
            0,
            0,
          ]}
          onClick={(data: { payload?: { status?: string } }) => {
            const status = data?.payload?.status;
            if (status) handleSegmentDownload(repoKey, status);
          }}
        />
      ));
    }
    return (
      <Bar
        dataKey="total"
        fill={REPO_COLORS[repo] ?? "#34d399"}
        radius={[4, 4, 0, 0]}
        name="Count"
        onClick={(payload) => {
          if (payload && payload.status) handleSegmentDownload(repo, payload.status);
        }}
      />
    );
  }, [repo, stackedRepoOrder, handleSegmentDownload]);

  // Normalize category names (use type when category empty) and normalize casing
  const normalizedCategoryData = useMemo(() => {
    if (!categoryData || categoryData.length === 0) return [];
    const normalize = (raw: string | null) => {
      const s = (raw ?? "").trim();
      if (!s) return "Other";
      const low = s.toLowerCase();
      if (low === "erc" || low === "ercs") return "ERC";
      if (low === "eip" || low === "eips") return "EIP";
      if (low === "core") return "Core";
      if (low === "interface") return "Interface";
      if (low === "networking") return "Networking";
      if (low === "informational") return "Informational";
      if (low === "meta") return "Meta";
      // Title case fallback
      return s
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    // Map and aggregate counts if normalization causes duplicates
    const map: Record<string, number> = {};
    for (const d of categoryData) {
      const cat = normalize(d.category);
      map[cat] = (map[cat] || 0) + Number(d.count);
    }
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  }, [categoryData]);

  // Category visibility toggles (legend filters)
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const allCategories = useMemo(() => normalizedCategoryData.map((d) => d.category), [normalizedCategoryData]);
  const includedCategories = useMemo(() => {
    if (!allCategories || allCategories.length === 0) return [];
    return allCategories.filter((c) => !disabledCategories.includes(c));
  }, [allCategories, disabledCategories]);
  const categoryDataToRender = useMemo(() => {
    if (!normalizedCategoryData) return [];
    if (includedCategories.length === 0) return normalizedCategoryData;
    return normalizedCategoryData.filter((d) => includedCategories.includes(d.category));
  }, [normalizedCategoryData, includedCategories]);
  const categoryTotalCount = useMemo(() => categoryDataToRender.reduce((s, d) => s + Number(d.count), 0), [categoryDataToRender]);

  const toggleCategory = useCallback((cat: string) => {
    setDisabledCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((p) => p !== cat);
      return [...prev, cat];
    });
  }, []);

  const trendLineData = useMemo(() => {
    const byYear: Record<number, Record<string, number>> = {};
    for (const t of trends) {
      if (!byYear[t.year]) byYear[t.year] = {};
      byYear[t.year][t.repo] = t.count;
    }
    return Object.entries(byYear)
      .map(([year, repos]) => ({
        year: Number(year),
        eips: repos.eips ?? 0,
        ercs: repos.ercs ?? 0,
        rips: repos.rips ?? 0,
      }))
      .sort((a, b) => a.year - b.year);
  }, [trends]);

  // Progress Over Time: transform timelineCatStatus into stacked bar data
  const progressTimelineData = useMemo(() => {
    if (chartMode === "repository") return trendLineData;
    if (timelineCatStatus.length === 0) return [];
    return timelineCatStatus.map(({ year, breakdown }) => {
      const entry: Record<string, number | string> = { year };
      for (const { primary, count } of breakdown) {
        entry[primary] = (Number(entry[primary]) || 0) + count;
      }
      return entry;
    });
  }, [chartMode, trendLineData, timelineCatStatus]);

  const progressTimelineKeys = useMemo(() => {
    if (chartMode === "repository") return ["eips", "ercs", "rips"];
    if (timelineCatStatus.length === 0) return [];
    const keys = new Set<string>();
    for (const { breakdown } of timelineCatStatus) {
      for (const { primary } of breakdown) keys.add(primary);
    }
    return Array.from(keys);
  }, [chartMode, timelineCatStatus]);

  // Top Status (Core Protocol Insights)
  const topStatusCounts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const d of statusDist) {
      byStatus[d.status] = (byStatus[d.status] ?? 0) + d.count;
    }
    return Object.entries(byStatus)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([status, count]) => ({ status, count }));
  }, [statusDist]);

  const donutData = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const d of statusDist) {
      byStatus[d.status] = (byStatus[d.status] ?? 0) + d.count;
    }
    return Object.entries(byStatus).map(([name, value]) => ({
      name,
      value,
    }));
  }, [statusDist]);

  // ── CSV Handlers for detailed data (must come after data transforms) ──
  const handleStatusDistCSV = useCallback(async (status?: string) => {
    const id = `status-${status || "all"}-${repoParam ?? "all"}`;
    setExportingId(id);
    try {
      const result = await client.standards.exportCSV({
        repo: repoParam,
        status: status ? [status] : undefined,
        type: undefined,
        category: undefined,
      });
      downloadCSV(result.filename.replace(".csv", `-status-${status || "all"}.csv`), result.csv);
    } catch (err) {
      console.error("Status distribution CSV export failed:", err);
    } finally {
      setExportingId((cur) => (cur === id ? null : cur));
    }
  }, [repoParam]);

  const handleCategoryCSV = useCallback(async (category?: string) => {
    const id = `category-${category || "all"}-${repoParam ?? "all"}`;
    setExportingId(id);
    try {
      const categoriesToSend = category
        ? [category]
        : (includedCategories.length > 0 && includedCategories.length !== allCategories.length
            ? includedCategories
            : undefined);

      const result = await client.standards.exportCSV({
        repo: repoParam,
        status: undefined,
        type: undefined,
        category: categoriesToSend,
      });
      downloadCSV(result.filename.replace(".csv", `-category-${category || "all"}.csv`), result.csv);
    } catch (err) {
      console.error("Category CSV export failed:", err);
    } finally {
      setExportingId((cur) => (cur === id ? null : cur));
    }
  }, [repoParam]);

  const handleTrendsCSV = useCallback(async () => {
    const id = `trends-${repoParam ?? "all"}`;
    setExportingId(id);
    try {
      const result = await client.standards.exportCSV({
        repo: repoParam,
        status: undefined,
        type: undefined,
        category: undefined,
      });
      downloadCSV(result.filename.replace(".csv", "-all-standards.csv"), result.csv);
    } catch (err) {
      console.error("Trends CSV export failed:", err);
    } finally {
      setExportingId((cur) => (cur === id ? null : cur));
    }
  }, [repoParam]);

 

  // ── Render helpers ──
  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: `${STATUS_COLORS[status] ?? "#94a3b8"}20`,
        color: STATUS_COLORS[status] ?? "#94a3b8",
        border: `1px solid ${STATUS_COLORS[status] ?? "#94a3b8"}40`,
      }}
    >
      {status}
    </span>
  );

  const TypeBadge = ({ value }: { value: string | null }) =>
    value ? (
      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
        {value}
      </span>
    ) : null;

  // ─────────────────────────────────
  // ─── RENDER ──────────────────────
  // ─────────────────────────────────
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Subtle background accent (matches dashboard/public) */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.03),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.05),transparent_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12 space-y-4">
      {/* ── Page Header ── */}
      <StandardsPageHeader />

      <div className="space-y-4">
        {/* ── Repo Tabs ── */}
        <div className="flex items-center gap-3 flex-wrap">
        {(
            [
              { value: "all", label: "All Standards" },
              { value: "eips", label: "EIPs" },
              { value: "ercs", label: "ERCs" },
              { value: "rips", label: "RIPs" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRepo(tab.value)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-all duration-300",
                repo === tab.value
                  ? "bg-primary/10 text-primary border-primary/40 shadow-[0_0_12px_rgba(34,211,238,0.15)] dark:shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : "bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <hr className="border-slate-200 dark:border-slate-800/50" />

        {/* ── Filters Bar ── */}
        {!isRIP && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 shadow-sm dark:shadow-slate-950/30">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-foreground">
                  Filters
                </span>
                {hasActiveFilters && (
                  <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    Active
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-600 dark:text-slate-400 transition-transform",
                  filtersOpen && "rotate-180"
                )}
              />
            </button>

            {filtersOpen && (
              <div className="border-t border-slate-200 dark:border-slate-700/50 px-4 py-4 space-y-4">
                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by number, title, or author..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-9 pl-10 pr-10 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                  {/* Status */}
                  <MultiSelect
                    label="Status"
                    options={filterOptions.statuses}
                    selected={selectedStatuses}
                    onChange={(v) => {
                      setSelectedStatuses(v);
                      setPage(1);
                    }}
                  />

                  {/* Type */}
                  <MultiSelect
                    label="Type"
                    options={filterOptions.types}
                    selected={selectedTypes}
                    onChange={(v) => {
                      setSelectedTypes(v);
                      setPage(1);
                    }}
                  />

                  {/* Category */}
                  <MultiSelect
                    label="Category"
                    options={filterOptions.categories}
                    selected={selectedCategories}
                    onChange={(v) => {
                      setSelectedCategories(v);
                      setPage(1);
                    }}
                  />

                  {/* Year Range */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Year Range
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="From"
                        min={2015}
                        max={new Date().getFullYear()}
                        value={yearFrom ?? ""}
                        onChange={(e) => {
                          setYearFrom(
                            e.target.value ? Number(e.target.value) : undefined
                          );
                          setPage(1);
                        }}
                        className="w-full h-9 py-1.5 px-2 text-sm rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring"
                      />
                      <span className="text-slate-600 dark:text-slate-400 text-xs">to</span>
                      <input
                        type="number"
                        placeholder="To"
                        min={2015}
                        max={new Date().getFullYear()}
                        value={yearTo ?? ""}
                        onChange={(e) => {
                          setYearTo(
                            e.target.value ? Number(e.target.value) : undefined
                          );
                          setPage(1);
                        }}
                        className="w-full h-9 py-1.5 px-2 text-sm rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring"
                      />
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── RIP Search (simple) ── */}
        {isRIP && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search RIPs by number, title, or author..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full h-9 pl-10 pr-10 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ────── KPI Cards ────── */}
            {isRIP && ripKpis ? (
              <div id="standards-kpis" className="scroll-mt-24">
                <div className="flex items-center justify-end mb-3">
                  <CopyLinkButton sectionId="standards-kpis" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total RIPs"
                  value={ripKpis.total}
                  icon={<FileText className="h-6 w-6 text-primary" />}
                  color="cyan"
                />
                <KPICard
                  label="Active RIPs"
                  value={ripKpis.active}
                  icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
                  color="emerald"
                />
                <KPICard
                  label="Recent Commits (30d)"
                  value={ripKpis.recentCommits}
                  icon={
                    <GitCommitHorizontal className="h-6 w-6 text-amber-400" />
                  }
                  color="amber"
                />
                <KPICard
                  label="Most Active RIP"
                  value={
                    ripKpis.mostActiveRip
                      ? `RIP-${ripKpis.mostActiveRip}`
                      : "N/A"
                  }
                  subtitle={
                    ripKpis.mostActiveTitle
                      ? `${ripKpis.mostActiveCommits} commits`
                      : undefined
                  }
                  icon={<Sparkles className="h-6 w-6 text-purple-400" />}
                  color="purple"
                />
                </div>
              </div>
            ) : !isRIP && kpis ? (
              <div id="standards-kpis" className="scroll-mt-24">
                <div className="flex items-center justify-end mb-3">
                  <CopyLinkButton sectionId="standards-kpis" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  label="Total Standards"
                  value={kpis.total}
                  icon={<FileText className="h-6 w-6 text-primary" />}
                  color="cyan"
                />
                <KPICard
                  label="Active in Review"
                  value={kpis.inReview}
                  icon={<Clock className="h-6 w-6 text-amber-400" />}
                  color="amber"
                />
                <KPICard
                  label="Finalized"
                  value={kpis.finalized}
                  icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
                  color="emerald"
                />
                <KPICard
                  label="New This Year"
                  value={kpis.newThisYear}
                  icon={<Sparkles className="h-6 w-6 text-purple-400" />}
                  color="purple"
                />
                </div>
              </div>
            ) : null}

            {/* ────── Core Protocol Insights (Top Status) ────── */}
            {!isRIP && topStatusCounts.length > 0 && (
              <div id="core-protocol-insights" className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 scroll-mt-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Core Protocol Insights
                  </h3>
                  <CopyLinkButton sectionId="core-protocol-insights" />
                </div>
                <div className="flex flex-wrap gap-4">
                  {topStatusCounts.map(({ status, count }) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[status] ?? "#94a3b8" }}
                      />
                      <span className="text-sm font-medium text-foreground">{status}</span>
                      <span className="text-sm font-bold text-primary">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ────── Repo Intro (EIPs / ERCs / RIPs) ────── */}
            {!isRIP && repo !== "all" && (
              <div id="repo-intro" className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 scroll-mt-24">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {repo === "eips"
                      ? "Ethereum Improvement Proposals (EIPs)"
                      : repo === "ercs"
                        ? "Ethereum Request for Comment (ERCs)"
                        : "Rollup Improvement Proposals (RIPs)"}
                  </h3>
                  <CopyLinkButton sectionId="repo-intro" />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {repo === "eips"
                    ? "EIPs are standards for the Ethereum platform, including core protocol specifications, client APIs, and contract standards."
                    : repo === "ercs"
                      ? "ERCs are standards for application-level interfaces and contract behaviors on Ethereum. The goal is to standardize and provide high-quality documentation for the Ethereum application layer."
                      : "RIPs are standards for rollup-specific improvements and interfaces."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://github.com/ethereum/${repo === "eips" ? "EIPs" : repo === "ercs" ? "ERCs" : "RIPs"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 border border-primary/40 rounded-lg transition-colors"
                  >
                    <Rss className="h-4 w-4" />
                    Subscribe / Watch on GitHub
                  </a>
                  <a
                    href={`https://github.com/ethereum/${repo === "eips" ? "EIPs" : repo === "ercs" ? "ERCs" : "RIPs"}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Repository
                  </a>
                </div>
              </div>
            )}

            {/* ────── Charts ────── */}
            {isRIP ? (
              /* RIP Activity Over Time */
              <div id="standards-charts" className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 scroll-mt-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    RIP Activity Over Time
                  </h3>
                  <CopyLinkButton sectionId="standards-charts" />
                </div>
                {ripActivity.length > 0 ? (
                  <ChartContainer
                    config={
                      {
                        commits: {
                          label: "Commits",
                          color: REPO_COLORS.rips,
                        },
                      } satisfies ChartConfig
                    }
                    className="h-[300px] w-full"
                  >
                    <LineChart data={ripActivity}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#94a3b8"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        tickFormatter={(v: string) => {
                          const [y, m] = v.split("-");
                          return `${m}/${y.slice(2)}`;
                        }}
                      />
                      <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Commits"
                        stroke={REPO_COLORS.rips}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No data available</p>
                )}
              </div>
            ) : (
              <div id="standards-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4 scroll-mt-24">
                {/* Status Distribution */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Status Distribution
                    </h3>
                    <div className="flex items-center gap-2">
                      <CopyLinkButton sectionId="standards-charts" />
                      {stackedStatusData.length > 0 && (
                      <button
                        onClick={() => handleStatusDistCSV()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors"
                        title="Download detailed EIP data with all metadata"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Detailed CSV
                      </button>
                    )}
                    </div>
                  </div>
                  {stackedStatusData.length > 0 ? (
                    <>
                      <ChartContainer
                        config={
                          {
                            eips: {
                              label: "EIPs",
                              color: REPO_COLORS.eips,
                            },
                            ercs: {
                              label: "ERCs",
                              color: REPO_COLORS.ercs,
                            },
                            rips: {
                              label: "RIPs",
                              color: REPO_COLORS.rips,
                            },
                          } satisfies ChartConfig
                        }
                        className="h-[300px] w-full"
                      >
                        <BarChart data={stackedStatusData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#94a3b8"
                          />
                          <XAxis
                            dataKey="status"
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend
                            wrapperStyle={{ fontSize: 12 }}
                          />
                        {barsNodes}
                        </BarChart>
                      </ChartContainer>

                  
                    </>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">No data available</p>
                  )}
                </div>

                {/* Status Donut (for single-repo views) */}
                {repo !== "all" ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">
                      Status Breakdown
                    </h3>
                    {donutData.length > 0 ? (
                      <ChartContainer
                        config={
                          Object.fromEntries(
                            donutData.map((d) => [
                              d.name,
                              {
                                label: d.name,
                                color:
                                  STATUS_COLORS[d.name] ?? "#94a3b8",
                              },
                            ])
                          ) as ChartConfig
                        }
                        className="h-[300px] w-full"
                      >
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                          >
                            {donutData.map((d, i) => (
                              <Cell
                                key={`cell-${i}`}
                                fill={
                                  STATUS_COLORS[d.name] ?? "#94a3b8"
                                }
                              />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend
                            wrapperStyle={{ fontSize: 12 }}
                          />
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        No data available
                      </p>
                    )}
                  </div>
                ) : (
                  /* Progress Over Time (switchable: Repository / Category / Status) */
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Progress Over Time
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                          {[
                            { value: "repository" as const, label: "By Repository" },
                            { value: "category" as const, label: "By Category" },
                            { value: "status" as const, label: "By Status" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setChartMode(opt.value)}
                              className={cn(
                                "px-3 py-1.5 text-xs font-medium transition-colors",
                                chartMode === opt.value
                                  ? "bg-primary/20 text-primary border-primary/40"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {progressTimelineData.length > 0 && (
                          <button
                            onClick={handleTrendsCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            CSV
                          </button>
                        )}
                      </div>
                    </div>
                    {chartMode === "repository" && trendLineData.length > 0 ? (
                      <ChartContainer
                        config={
                          {
                            eips: { label: "EIPs", color: REPO_COLORS.eips },
                            ercs: { label: "ERCs", color: REPO_COLORS.ercs },
                            rips: { label: "RIPs", color: REPO_COLORS.rips },
                          } satisfies ChartConfig
                        }
                        className="h-[300px] w-full"
                      >
                        <LineChart data={trendLineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                          <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="eips" stroke={REPO_COLORS.eips} strokeWidth={2} name="EIPs" dot={false} />
                          <Line type="monotone" dataKey="ercs" stroke={REPO_COLORS.ercs} strokeWidth={2} name="ERCs" dot={false} />
                          <Line type="monotone" dataKey="rips" stroke={REPO_COLORS.rips} strokeWidth={2} name="RIPs" dot={false} />
                        </LineChart>
                      </ChartContainer>
                    ) : (chartMode === "category" || chartMode === "status") && progressTimelineData.length > 0 ? (
                      <ChartContainer
                        config={
                          Object.fromEntries(
                            progressTimelineKeys.map((k, i) => [
                              k,
                              {
                                label: k,
                                color: chartMode === "category" ? (CATEGORY_COLOR_MAP[k] ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length]) : (STATUS_COLORS[k] ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
                              },
                            ])
                          ) as ChartConfig
                        }
                        className="h-[300px] w-full"
                      >
                        <BarChart data={progressTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                          <XAxis dataKey="year" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          {progressTimelineKeys.map((key) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              stackId="a"
                              fill={chartMode === "category" ? (CATEGORY_COLOR_MAP[key] ?? "#94a3b8") : (STATUS_COLORS[key] ?? "#94a3b8")}
                              name={key}
                              radius={[0, 0, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        {chartMode !== "repository" ? "Loading..." : "No data available"}
                      </p>
                    )}
                  </div>
                )}

                {/* Category Breakdown (always shown for non-RIP) */}
                <div id="category-breakdown" className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 lg:col-span-2 scroll-mt-24">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Category Breakdown
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Core, Interface, Networking are part of Standards Track
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyLinkButton sectionId="category-breakdown" />
                      {normalizedCategoryData.length > 0 && (
                        <button
                          onClick={() => handleCategoryCSV()}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-foreground bg-slate-800/40 border border-slate-700/40 rounded-lg hover:bg-slate-700/50 hover:text-white transition-colors"
                          title="Download detailed EIP data with all metadata (applies current legend filters)"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Detailed CSV
                        </button>
                      )}
                    </div>
                  </div>

                  {normalizedCategoryData.length > 0 ? (
                    <>
                      <ChartContainer
                        config={
                          Object.fromEntries(
                            categoryDataToRender.map((d, i) => [
                              d.category,
                              {
                                label: d.category,
                                color:
                                  CATEGORY_COLOR_MAP[d.category] ??
                                  CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                              },
                            ])
                          ) as ChartConfig
                        }
                        className="h-[300px] w-full"
                      >
                        <BarChart data={categoryDataToRender} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#94a3b8"
                          />
                          <XAxis
                            type="number"
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="category"
                            type="category"
                            width={120}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Count">
                            {categoryDataToRender.map((d, i) => (
                              <Cell
                                key={`cat-${i}`}
                                fill={
                                  CATEGORY_COLOR_MAP[d.category] ??
                                  CATEGORY_COLORS[i % CATEGORY_COLORS.length]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>

                      {/* Category summary with percentages */}
                      <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        {normalizedCategoryData.map((d) => {
                          const pct = categoryTotalCount > 0 ? ((d.count / categoryTotalCount) * 100).toFixed(1) : "0";
                          return (
                            <span key={d.category}>
                              {d.category} {d.count} ({pct}%)
                            </span>
                          );
                        })}
                        <span className="font-medium text-foreground">
                          All {repo === "all" ? "Standards" : repo.toUpperCase()} {categoryTotalCount} (100%)
                        </span>
                      </div>

                      {/* Bottom controls: legend filters, CSV, total */}
                      <div className="mt-4 flex items-center justify-between gap-4 px-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm text-foreground mr-2">Show:</div>
                          {normalizedCategoryData.map((d) => {
                            const disabled = disabledCategories.includes(d.category);
                            return (
                              <button
                                key={d.category}
                                onClick={() => toggleCategory(d.category)}
                                className={cn(
                                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all",
                                  disabled
                                    ? "bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"
                                    : "bg-slate-100 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/50 shadow-sm"
                                )}
                                title={disabled ? `Show ${d.category}` : `Hide ${d.category}`}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOR_MAP[d.category] ?? CATEGORY_COLORS[0] }} />
                                {d.category}
                              </button>
                            );
                          })}
                        </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Total: {categoryTotalCount}</span>
                    </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">No data available</p>
                  )}
                </div>

                {/* Trends Over Time (for single-repo view) */}
                {repo !== "all" && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Standards Created Over Time
                      </h3>
                      {trendLineData.length > 0 && (
                        <button
                          onClick={handleTrendsCSV}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors"
                          title="Download detailed EIP data with all metadata"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Detailed CSV
                        </button>
                      )}
                    </div>
                    {trendLineData.length > 0 ? (
                      <ChartContainer
                        config={
                          {
                            [repo]: {
                              label: repo.toUpperCase(),
                              color:
                                REPO_COLORS[repo] ?? "#34d399",
                            },
                          } satisfies ChartConfig
                        }
                        className="h-[250px] w-full"
                      >
                        <LineChart data={trendLineData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#94a3b8"
                          />
                          <XAxis
                            dataKey="year"
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                          />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                          />
                          <Line
                            type="monotone"
                            dataKey={repo}
                            stroke={REPO_COLORS[repo] ?? "#34d399"}
                            strokeWidth={2}
                            name={repo.toUpperCase()}
                            dot={false}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        No data available
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ────── Recently Closed/Merged PRs & Review Activity & Leaderboards ────── */}
            {!isRIP && (
              <div id="standards-activity" className="grid grid-cols-1 lg:grid-cols-3 gap-4 scroll-mt-24">
                {/* Recently Closed/Merged PRs */}
                <div className="flex flex-col h-[380px] rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <GitMerge className="h-4 w-4 text-primary" />
                      Recently Closed/Merged PRs
                    </h3>
                    <CopyLinkButton sectionId="standards-activity" />
                  </div>
                  <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                    {recentClosedMergedPRs.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">No recent activity</p>
                    ) : (
                      recentClosedMergedPRs.map((pr) => (
                        <a
                          key={`${pr.repoShort}-${pr.number}`}
                          href={`https://github.com/ethereum/${pr.repoShort === "eips" ? "EIPs" : pr.repoShort === "ercs" ? "ERCs" : "RIPs"}/pull/${pr.number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-primary">#{pr.number}</span>
                            <span
                              className={cn(
                                "text-[11px] font-medium px-1.5 py-0.5 rounded",
                                pr.status === "Merged" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              {pr.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5" title={pr.title}>
                            {pr.title || "Untitled"}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                            {new Date(pr.closedAt).toLocaleDateString()}
                          </p>
                        </a>
                      ))
                    )}
                  </div>
                </div>

                {/* Review Activity */}
                <div className="flex flex-col h-[380px] rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 shrink-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Review Activity
                    </h3>
                    <CopyLinkButton sectionId="standards-activity" />
                  </div>
                  <div className="mb-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 shrink-0">
                    <p className="text-2xl font-bold text-primary">{reviewActivityTotal}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Reviews (Last 24 Hours)</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 shrink-0">
                    Editor Reviews (Last 24 Hours)
                  </p>
                  <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                    {editorReviewsLast24h.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">No reviews in last 24h</p>
                    ) : (
                      editorReviewsLast24h.slice(0, 15).map((r, i) => (
                        <a
                          key={`${r.repoShort}-${r.prNumber}-${i}`}
                          href={`https://github.com/ethereum/${r.repoShort === "eips" ? "EIPs" : r.repoShort === "ercs" ? "ERCs" : "RIPs"}/pull/${r.prNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <span className="text-sm font-medium text-primary">#{r.prNumber}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 ml-2">Reviewer: {r.reviewer}</span>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5" title={r.title}>
                            {r.title || "Untitled"}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400">
                            {new Date(r.submittedAt).toLocaleString()}
                          </p>
                        </a>
                      ))
                    )}
                  </div>
                </div>

                {/* Leaderboards */}
                <div className="flex flex-col h-[380px] rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 overflow-hidden">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      Leaderboards
                    </h3>
                    <CopyLinkButton sectionId="standards-activity" />
                  </div>
                  <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 mb-3 shrink-0">
                    {[
                      { id: "editors" as const, label: "Editors", icon: Shield },
                      { id: "reviewers" as const, label: "Reviewers", icon: Eye },
                      { id: "contributors" as const, label: "Contributors", icon: Users },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setLeaderboardTab(tab.id)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                            leaderboardTab === tab.id
                              ? "bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {leaderboardTab === "editors" && (
                      <ul className="space-y-2">
                        {editorsLeaderboard.slice(0, 10).map((e, i) => (
                          <li key={e.actor} className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium w-5">{i + 1}</span>
                            <Avatar className="h-8 w-8 shrink-0 border border-slate-200 dark:border-slate-700/50">
                              <AvatarImage
                                src={`https://github.com/${e.actor.replace(/\[bot\]$/, "")}.png`}
                                alt={e.actor}
                              />
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {e.actor.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground truncate flex-1">{e.actor}</span>
                            <span className="text-primary font-semibold text-sm shrink-0">{e.totalReviews ?? 0}</span>
                          </li>
                        ))}
                        {editorsLeaderboard.length === 0 && (
                          <li className="text-sm text-slate-600 dark:text-slate-400 py-4">No data</li>
                        )}
                      </ul>
                    )}
                    {leaderboardTab === "reviewers" && (
                      <ul className="space-y-2">
                        {reviewersLeaderboard.slice(0, 10).map((r, i) => (
                          <li key={r.actor} className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium w-5">{i + 1}</span>
                            <Avatar className="h-8 w-8 shrink-0 border border-slate-200 dark:border-slate-700/50">
                              <AvatarImage
                                src={`https://github.com/${r.actor.replace(/\[bot\]$/, "")}.png`}
                                alt={r.actor}
                              />
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {r.actor.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground truncate flex-1">{r.actor}</span>
                            <span className="text-primary font-semibold text-sm shrink-0">{r.totalReviews ?? 0}</span>
                          </li>
                        ))}
                        {reviewersLeaderboard.length === 0 && (
                          <li className="text-sm text-slate-600 dark:text-slate-400 py-4">No data</li>
                        )}
                      </ul>
                    )}
                    {leaderboardTab === "contributors" && (
                      <ul className="space-y-2">
                        {contributorsLeaderboard.slice(0, 10).map((c, i) => (
                          <li key={c.actor} className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-400 text-xs font-medium w-5">{i + 1}</span>
                            <Avatar className="h-8 w-8 shrink-0 border border-slate-200 dark:border-slate-700/50">
                              <AvatarImage
                                src={`https://github.com/${c.actor.replace(/\[bot\]$/, "")}.png`}
                                alt={c.actor}
                              />
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {c.actor.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-foreground truncate flex-1">{c.actor}</span>
                            <span className="text-primary font-semibold text-sm shrink-0">{c.total ?? 0}</span>
                          </li>
                        ))}
                        {contributorsLeaderboard.length === 0 && (
                          <li className="text-sm text-slate-600 dark:text-slate-400 py-4">No data</li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            <hr className="border-slate-200 dark:border-slate-800/50" />

            {/* ────── Table ────── */}
            <div id="standards-table" className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm scroll-mt-24">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {isRIP ? "RIPs" : "Standards"}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Showing {(isRIP ? filteredRipTableData : filteredTableData).length.toLocaleString()} of {totalRows.toLocaleString()} results
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Use the filter inputs below each column header to search within specific columns
                  </p>
                </div>
                <CopyLinkButton sectionId="standards-table" />
              </div>

              <div className="overflow-x-auto">
                {isRIP ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30">
                        <TH
                          label="RIP #"
                          col="number"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Title"
                          col="title"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Status"
                          col="status"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Author"
                          col="author"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Created"
                          col="created_at"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Last Commit"
                          col="last_commit"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Commits"
                          col="commits"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700/50">
                        {['number', 'title', 'status', 'author', 'created_at', 'last_commit', 'commits'].map(col => (
                          <td key={col} className="px-4 py-2">
                            <input
                              type="text"
                              placeholder={`Filter...`}
                              value={columnSearch[col] || ''}
                              onChange={(e) => setColumnSearch({...columnSearch, [col]: e.target.value})}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            />
                          </td>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRipTableData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-12 text-center text-slate-600 dark:text-slate-400"
                          >
                            No RIPs found
                          </td>
                        </tr>
                      ) : (
                        filteredRipTableData.map((row) => (
                          <tr
                            key={row.number}
                            className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-primary">
                              RIP-{row.number}
                            </td>
                            <td className="px-4 py-3 text-foreground max-w-[300px] truncate">
                              {row.title ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              {row.status ? (
                                <StatusBadge status={row.status} />
                              ) : (
                                <span className="text-slate-600 dark:text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground text-xs">
                              {row.author ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                              {row.createdAt ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                              {row.lastCommit ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {row.commits}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30">
                        {repo === "all" && (
                          <TH
                            label="Repo"
                            col="repo"
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={handleSort}
                            noSort
                          />
                        )}
                        <TH
                          label="#"
                          col="number"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Title"
                          col="title"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Status"
                          col="status"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Type"
                          col="type"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Category"
                          col="category"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Created"
                          col="created_at"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Updated"
                          col="updated_at"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="Days in Status"
                          col="days_in_status"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TH
                          label="PRs"
                          col="linked_prs"
                          sortBy={sortBy}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <th className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400"></th>
                      </tr>
                      <tr className="bg-slate-50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700/50">
                        {repo === "all" && (
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="Filter..."
                              value={columnSearch.repo || ''}
                              onChange={(e) => setColumnSearch({...columnSearch, repo: e.target.value})}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            />
                          </td>
                        )}
                        {['number', 'title', 'status', 'type', 'category', 'createdAt', 'updatedAt', 'daysInStatus', 'linkedPRs'].map(col => (
                          <td key={col} className="px-4 py-2">
                            <input
                              type="text"
                              placeholder="Filter..."
                              value={columnSearch[col] || ''}
                              onChange={(e) => setColumnSearch({...columnSearch, [col]: e.target.value})}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2"></td>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTableData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={repo === "all" ? 11 : 10}
                            className="py-12 text-center text-slate-600 dark:text-slate-400"
                          >
                            No standards found
                          </td>
                        </tr>
                      ) : (
                        filteredTableData.map((row) => {
                          const repoShort = row.repo
                            .split("/")
                            .pop()
                            ?.toLowerCase() ?? "eips";
                          const kind = repoShort === "ercs" ? "ercs" : repoShort === "rips" ? "rips" : "eips";
                          return (
                            <tr
                              key={`${row.repo}-${row.number}`}
                              className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {repo === "all" && (
                                <td className="px-4 py-3">
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      backgroundColor: `${REPO_COLORS[kind] ?? "#94a3b8"}20`,
                                      color: REPO_COLORS[kind] ?? "#94a3b8",
                                    }}
                                  >
                                    {kind.toUpperCase()}
                                  </span>
                                </td>
                              )}
                              <td className="px-4 py-3 font-medium text-primary">
                                {row.number}
                              </td>
                              <td
                                className="px-4 py-3 text-foreground max-w-[250px] truncate"
                                title={row.title ?? ""}
                              >
                                {row.title ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3">
                                <TypeBadge value={row.type} />
                              </td>
                              <td className="px-4 py-3">
                                <TypeBadge value={row.category} />
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                {row.createdAt ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                                {row.updatedAt}
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {row.daysInStatus}d
                              </td>
                              <td className="px-4 py-3 text-foreground">
                                {row.linkedPRs}
                              </td>
                              <td className="px-4 py-3">
                                <a
                                  href={`https://github.com/${row.repo}/blob/master/EIPS/eip-${row.number}.md`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Page {page} of {totalPages} ({totalRows.toLocaleString()}{" "}
                    total)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                            page === pageNum
                              ? "bg-cyan-500/20 text-primary border-cyan-500/40"
                              : "border-slate-700/50 bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-white"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// ──────── Reusable Sub-components ────────

function KPICard({
  label,
  value,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500/20 text-cyan-600 dark:text-primary",
    emerald: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4 shadow-sm dark:shadow-slate-950/30 hover:border-cyan-400/50 dark:hover:border-cyan-400/50 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("rounded-full p-3", colorMap[color] ?? colorMap.cyan)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-1.5 px-2 text-sm h-9 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-100 hover:border-ring transition-colors"
      >
        <span className="truncate">
          {selected.length === 0
            ? `All ${label}`
            : `${selected.length} selected`}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-600 dark:text-slate-400 transition-transform shrink-0 ml-2",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto scrollbar-thin">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, opt]);
                  } else {
                    onChange(selected.filter((s) => s !== opt));
                  }
                }}
                className="rounded border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 text-primary focus:ring-ring/30"
              />
              <span className="text-sm text-foreground">{opt}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">No options</p>
          )}
        </div>
      )}
    </div>
  );
}

function TH({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
  noSort,
}: {
  label: string;
  col: string;
  sortBy: string;
  sortDir: string;
  onSort: (col: string) => void;
  noSort?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400 text-left whitespace-nowrap",
        !noSort && "cursor-pointer hover:text-foreground transition-colors select-none"
      )}
      onClick={noSort ? undefined : () => onSort(col)}
    >
      <span className="inline-flex items-center">
        {label}
        {!noSort &&
          (sortBy === col ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3 ml-1 text-primary" />
            ) : (
              <ArrowDown className="h-3 w-3 ml-1 text-primary" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 ml-1 text-slate-600 dark:text-slate-400" />
          ))}
      </span>
    </th>
  );
}

// ──────── Suspense wrapper (Next.js 16 requirement) ────────
export default function StandardsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StandardsPageContent />
    </Suspense>
  );
}
