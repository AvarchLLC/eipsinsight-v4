import { CANONICAL_EIP_REVIEWERS } from "@/data/eip-contributor-roles";

export interface ReviewerLeaderboardRow {
  actor: string;
  totalReviews: number;
  prsTouched: number;
  medianResponseDays: number | null;
  updatedAt?: string | null;
}

export interface CyclesData {
  cycles: number;
  count: number;
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

export interface ReviewerActionDetailRow {
  actor: string;
  eventType: string;
  actedAt: string;
  prNumber: number;
  repoShort: string;
  title: string;
  eventUrl: string | null;
}

export const REVIEWER_PALETTE = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
];

export function reviewerColor(idx: number): string {
  return REVIEWER_PALETTE[((idx % REVIEWER_PALETTE.length) + REVIEWER_PALETTE.length) % REVIEWER_PALETTE.length];
}

export function reviewerAreaColor(idx: number): string {
  return `${reviewerColor(idx)}18`;
}

export const repoColors: Record<string, string> = {
  "ethereum/EIPs": "#22d3ee",
  "ethereum/ERCs": "#60a5fa",
  "ethereum/RIPs": "#fb923c",
  EIPs: "#22d3ee",
  ERCs: "#60a5fa",
  RIPs: "#fb923c",
};

export const OFFICIAL_REVIEWERS: string[] = Array.from(CANONICAL_EIP_REVIEWERS);

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
