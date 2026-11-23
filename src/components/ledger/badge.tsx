import React from "react";
import { cn } from "@/lib/utils";

export type LedgerToken =
  | "draft"
  | "review"
  | "lastcall"
  | "final"
  | "living"
  | "stagnant"
  | "withdrawn"
  | "moved"
  | "core"
  | "networking"
  | "interface"
  | "erc"
  | "rip"
  | "meta"
  | "informational"
  | "standards"
  | "editor"
  | "reviewer";

export function normalizeToken(token: string | null | undefined): LedgerToken {
  if (!token) return "standards";
  const s = token.toLowerCase().trim().replace(/[\s-_]/g, "");
  if (s === "draft") return "draft";
  if (s === "review") return "review";
  if (s === "lastcall") return "lastcall";
  if (s === "final") return "final";
  if (s === "living") return "living";
  if (s === "stagnant") return "stagnant";
  if (s === "withdrawn") return "withdrawn";
  if (s === "moved") return "moved";
  if (s === "core") return "core";
  if (s === "networking") return "networking";
  if (s === "interface") return "interface";
  if (s === "erc") return "erc";
  if (s === "rip") return "rip";
  if (s === "meta") return "meta";
  if (s === "informational") return "informational";
  if (s === "standards" || s === "standardstrack") return "standards";
  if (s === "editor") return "editor";
  if (s === "reviewer") return "reviewer";
  return "standards";
}

/**
 * Ledger Badge (docs/DESIGN.md §5):
 * The semantic constant. Squared (4px radius), tinted with `--token`,
 * font in Geist Mono. Reads `--token` dynamically via `data-token`.
 */
export function LedgerBadge({
  token,
  label,
  className,
  children,
}: {
  token?: string | LedgerToken;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const norm = token ? normalizeToken(token) : undefined;
  const content = children || label || token;

  return (
    <span
      data-token={norm}
      className={cn("l-badge font-mono", className)}
    >
      {content}
    </span>
  );
}
