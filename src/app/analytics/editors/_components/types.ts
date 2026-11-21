import { CANONICAL_EIP_EDITORS } from "@/data/eip-contributor-roles";

export interface EditorLeaderboardRow {
  actor: string;
  totalActions: number;
  prsTouched: number;
  reviews: number;
  comments: number;
  medianResponseDays: number | null;
  updatedAt?: string | null;
}

export interface CategoryCoverage {
  category: string;
  actors: string[];
  actorCounts?: Array<{
    actor: string;
    count: number;
    reviews: number;
    comments: number;
    commits: number;
    other: number;
  }>;
}

export interface RepoDistribution {
  actor: string;
  repo: string;
  count: number;
  pct: number;
}

export interface MonthlyTrendPoint {
  month: string;
  [actor: string]: string | number;
}

export interface DailyActivityStackedRow {
  date: string;
  actor: string;
  count: number;
}

export const EDITOR_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#84cc16",
];

export function editorColor(idx: number): string {
  return EDITOR_PALETTE[((idx % EDITOR_PALETTE.length) + EDITOR_PALETTE.length) % EDITOR_PALETTE.length];
}

export function editorAreaColor(idx: number): string {
  return `${editorColor(idx)}18`;
}

export const categoryColors: Record<string, string> = {
  core: "#34d399",
  erc: "#60a5fa",
  networking: "#a78bfa",
  interface: "#f472b6",
  meta: "#fbbf24",
  informational: "#94a3b8",
  governance: "#ef4444",
  rip: "#fb923c",
};

export const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#fb923c",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const OFFICIAL_EDITOR_HANDLES: string[] = Array.from(CANONICAL_EIP_EDITORS);

export function getGitHubAvatarUrl(handle: string): string {
  return `https://github.com/${handle}.png?size=80`;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getTimeWindow(
  timeRange: string,
  customFromMonth?: string,
  customToMonth?: string,
): { from: string | undefined; to: string | undefined } {
  if (timeRange === "all") {
    return { from: undefined, to: undefined };
  }
  if (timeRange === "custom") {
    const from = customFromMonth ? `${customFromMonth}-01` : undefined;

    let to: string | undefined = undefined;
    if (customToMonth) {
      const [yearStr, monthStr] = customToMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const date = new Date(year, month, 0); // Last day of month
      to = date.toISOString().split("T")[0];
    }

    return { from, to };
  }

  const now = new Date();
  const to = now.toISOString().split("T")[0];
  let from: Date;
  switch (timeRange) {
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "15d":
      from = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { from: from.toISOString().split("T")[0], to };
}
