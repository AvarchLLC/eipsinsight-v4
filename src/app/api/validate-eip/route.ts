import { NextRequest, NextResponse } from "next/server";
import {
  validateEIPMarkdown,
  lineOfText,
  type RepoKind,
  type ValidationMessage,
  type ValidationResult,
} from "@/lib/eip-validation";
import { prisma } from "@/lib/prisma";

const REPOS: RepoKind[] = ["eip", "erc", "rip"];

/** Pull the number field and `requires:` out of the frontmatter without a full parse. */
function readPreamble(md: string, repo: RepoKind): { eipNum: number | null; requires: number[] } {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  const raw = fm ? fm[1] : "";
  const numberKey = repo === "rip" ? "rip" : "eip";
  const eipLine = raw.match(new RegExp(`^${numberKey}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  const eipNum = /^\d+$/.test(eipLine) ? parseInt(eipLine, 10) : null;
  const reqLine = raw.match(/^requires:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const requires = reqLine
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return { eipNum, requires };
}

/**
 * DB-backed checks that the pure validator can't do: that `requires:` entries
 * actually exist (and aren't withdrawn/stagnant), and that a brand-new proposal
 * isn't reusing a number that already exists. Best-effort — if the DB is
 * unreachable, these are silently skipped so validation still works offline.
 */
async function dbChecks(md: string, repo: RepoKind, isNew: boolean): Promise<ValidationMessage[]> {
  const msgs: ValidationMessage[] = [];
  const { eipNum, requires } = readPreamble(md, repo);
  const requiresLine = lineOfText(md, "requires:");
  const eipLine = lineOfText(md, "eip:");

  try {
    // 1. requires must reference real proposals.
    if (requires.length > 0) {
      const found = await prisma.$queryRawUnsafe<Array<{ n: number; status: string | null }>>(
        `SELECT e.eip_number AS n, s.status
           FROM eips e
           LEFT JOIN LATERAL (
             SELECT status FROM eip_snapshots WHERE eip_id = e.id ORDER BY updated_at DESC LIMIT 1
           ) s ON true
          WHERE e.eip_number = ANY($1::int[])
          UNION ALL
         SELECT r.rip_number AS n, r.status
           FROM rips r
          WHERE r.rip_number = ANY($1::int[])`,
        requires
      );
      const statusByNum = new Map<number, string | null>();
      for (const row of found) statusByNum.set(Number(row.n), row.status);

      for (const n of requires) {
        if (!statusByNum.has(n)) {
          msgs.push({
            level: "warning",
            message: `requires: ${n} — no proposal numbered ${n} exists yet`,
            section: "Preamble",
            field: "requires",
            line: requiresLine,
          });
        } else {
          const st = statusByNum.get(n);
          if (st === "Withdrawn" || st === "Stagnant") {
            msgs.push({
              level: "info",
              message: `requires: ${n} points at a proposal that is ${st}`,
              section: "Preamble",
              field: "requires",
              line: requiresLine,
            });
          }
        }
      }
    }

    // 2. New proposals shouldn't reuse an existing number.
    if (isNew && eipNum != null) {
      const table = repo === "rip" ? "rips" : "eips";
      const col = repo === "rip" ? "rip_number" : "eip_number";
      const dup = await prisma.$queryRawUnsafe<Array<{ one: number }>>(
        `SELECT 1 AS one FROM ${table} WHERE ${col} = $1 LIMIT 1`,
        eipNum
      );
      if (dup.length > 0) {
        msgs.push({
          level: "warning",
          message: `${repo.toUpperCase()}-${eipNum} already exists — pick a new number or leave it as a placeholder until assigned`,
          section: "Preamble",
          field: "eip",
          line: eipLine,
        });
      }
    }
  } catch {
    // DB unreachable — skip DB-backed checks, keep the rest of validation.
  }

  return msgs;
}

export async function POST(req: NextRequest) {
  try {
    const bodyJson = await req.json();
    const markdownContent: unknown = bodyJson?.markdownContent;
    const repoRaw: unknown = bodyJson?.repo;
    const filename: string | undefined = typeof bodyJson?.filename === "string" ? bodyJson.filename : undefined;
    const isNew = Boolean(bodyJson?.isNew);
    const repo: RepoKind = REPOS.includes(repoRaw as RepoKind) ? (repoRaw as RepoKind) : "eip";

    if (!markdownContent || typeof markdownContent !== "string") {
      return NextResponse.json(
        { success: false, messages: [{ level: "error", message: "Markdown content is required" }] } satisfies ValidationResult,
        { status: 400 }
      );
    }

    const result = validateEIPMarkdown(markdownContent, { repo, filename, isNew });
    const dbMsgs = await dbChecks(markdownContent, repo, isNew);
    const messages = [...result.messages, ...dbMsgs];
    const success = !messages.some((m) => m.level === "error");

    return NextResponse.json({ success, messages } satisfies ValidationResult, { status: success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, messages: [{ level: "error", message: "Validation failed" }] } satisfies ValidationResult,
      { status: 500 }
    );
  }
}
