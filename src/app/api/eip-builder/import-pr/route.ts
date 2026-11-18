import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface PullFile {
  filename: string;
  status: string;
  raw_url: string;
  patch?: string;
  additions: number;
  deletions: number;
}

type RepoKey = "eip" | "erc" | "rip";

const PROPOSAL_FILE_RE = /^(EIPS\/eip-|ERCS\/erc-|RIPS\/rip-)[a-zA-Z0-9_-]+\.md$/i;

interface Governance {
  state?: string;
  category?: string | null;
  subcategory?: string | null;
  needsEditorAttention?: boolean;
  ciState?: string | null;
  failingChecks?: string | null;
  hasMergeConflicts?: boolean;
  hasFailingRequiredChecks?: boolean;
  reason?: string | null;
  waitingSince?: string | null;
  numReviews?: number | null;
}

interface StatusTransition {
  eipNumber: number;
  from: string | null;
  to: string | null;
}

/** Read the `status:` and number field from fetched proposal markdown. */
function readPreambleStatus(md: string, repo: RepoKey): { status: string | null; eipNum: number | null } {
  const fm = md.match(/^---\n([\s\S]*?)\n---/);
  const raw = fm ? fm[1] : "";
  const status = raw.match(/^status:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const numberKey = repo === "rip" ? "rip" : "eip";
  const eipLine = raw.match(new RegExp(`^${numberKey}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  const eipNum = /^\d+$/.test(eipLine) ? parseInt(eipLine, 10) : null;
  return { status, eipNum };
}

/**
 * Enrich a PR with what EIPsInsight uniquely knows: the editor-review posture
 * from the governance tables, and the status transition this PR represents
 * (current on-chain-of-record status → the status in the PR). Best-effort —
 * silently degrades if the DB is unreachable.
 */
async function enrich(
  targetRepo: string,
  prNumber: number,
  repo: RepoKey,
  md: string
): Promise<{ governance?: Governance; statusTransition?: StatusTransition }> {
  const { status: toStatus, eipNum } = readPreambleStatus(md, repo);
  const result: { governance?: Governance; statusTransition?: StatusTransition } = {};

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      state: string | null; num_reviews: number | null;
      current_state: string | null; category: string | null; subcategory: string | null;
      needs_editor_attention: boolean | null; ci_state: string | null; failing_checks: string | null;
      has_merge_conflicts: boolean | null; has_failing_required_checks: boolean | null;
      reason: string | null; waiting_since: Date | null;
    }>>(
      `SELECT pr.state, pr.num_reviews,
              g.current_state, g.category, g.subcategory, g.needs_editor_attention,
              g.ci_state, g.failing_checks, g.has_merge_conflicts, g.has_failing_required_checks,
              g.reason, g.waiting_since
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN pr_governance_state g
                ON g.pr_number = pr.pr_number AND g.repository_id = pr.repository_id
        WHERE LOWER(r.name) = LOWER($1) AND pr.pr_number = $2
        LIMIT 1`,
      targetRepo,
      prNumber
    );
    const g = rows[0];
    if (g) {
      result.governance = {
        state: g.state ?? undefined,
        category: g.category,
        subcategory: g.subcategory,
        needsEditorAttention: g.needs_editor_attention ?? undefined,
        ciState: g.ci_state,
        failingChecks: g.failing_checks,
        hasMergeConflicts: g.has_merge_conflicts ?? undefined,
        hasFailingRequiredChecks: g.has_failing_required_checks ?? undefined,
        reason: g.reason,
        waitingSince: g.waiting_since ? g.waiting_since.toISOString() : null,
        numReviews: g.num_reviews,
      };
    }
  } catch {
    // DB down — skip governance.
  }

  // Status transition: compare the PR's target status with the current record.
  try {
    if (eipNum != null && toStatus) {
      let fromStatus: string | null = null;
      if (repo === "rip") {
        const r = await prisma.$queryRawUnsafe<Array<{ status: string | null }>>(
          `SELECT status FROM rips WHERE rip_number = $1 LIMIT 1`,
          eipNum
        );
        fromStatus = r[0]?.status ?? null;
      } else {
        const r = await prisma.$queryRawUnsafe<Array<{ status: string | null }>>(
          `SELECT s.status
             FROM eips e
             LEFT JOIN LATERAL (
               SELECT status FROM eip_snapshots WHERE eip_id = e.id ORDER BY updated_at DESC LIMIT 1
             ) s ON true
            WHERE e.eip_number = $1 LIMIT 1`,
          eipNum
        );
        fromStatus = r[0]?.status ?? null;
      }
      if (fromStatus && fromStatus !== toStatus) {
        result.statusTransition = { eipNumber: eipNum, from: fromStatus, to: toStatus };
      }
    }
  } catch {
    // DB down — skip transition.
  }

  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = ((searchParams.get("repo") || "eip").toLowerCase()) as RepoKey;
  const prNumber = searchParams.get("pr")?.replace(/[^0-9]/g, "");

  if (!prNumber) {
    return NextResponse.json({ error: "PR number is required" }, { status: 400 });
  }

  const repoNames: Record<string, string> = {
    eip: "ethereum/EIPs",
    erc: "ethereum/ERCs",
    rip: "ethereum/RIPs",
  };

  const targetRepo = repoNames[repo] || repoNames.eip;
  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  const prNum = parseInt(prNumber, 10);

  // ── Strategy A: GitHub REST API ──
  if (token) {
    try {
      const authHeaders: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "EIPsInsight-PR-Inspector",
        Authorization: `Bearer ${token}`,
      };

      const prRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}`, { headers: authHeaders });
      if (prRes.ok) {
        const prData = await prRes.json();
        const headSha = prData.head?.sha;

        const filesRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}/files`, { headers: authHeaders });
        if (filesRes.ok) {
          const files: PullFile[] = await filesRes.json();
          const proposalFiles = files.filter((f) => PROPOSAL_FILE_RE.test(f.filename)).map((f) => f.filename);
          const proposalFile =
            files.find((f) => PROPOSAL_FILE_RE.test(f.filename)) || files.find((f) => f.filename.endsWith(".md"));

          if (proposalFile && headSha) {
            const rawUrl = `https://raw.githubusercontent.com/${targetRepo}/${headSha}/${proposalFile.filename}`;
            const contentRes = await fetch(rawUrl);
            if (contentRes.ok) {
              const markdownContent = await contentRes.text();
              const isMerged = Boolean(prData.merged_at);
              const isDraft = Boolean(prData.draft);
              const resolvedState: "merged" | "draft" | "closed" | "open" = isMerged
                ? "merged"
                : prData.state === "closed" ? "closed"
                : isDraft ? "draft"
                : "open";

              const extra = await enrich(targetRepo, prNum, repo, markdownContent);

              return NextResponse.json({
                success: true,
                repo: targetRepo,
                prNumber: prNum,
                prTitle: prData.title,
                prAuthor: prData.user?.login,
                prUrl: prData.html_url,
                prState: resolvedState,
                filename: proposalFile.filename,
                proposalFiles: proposalFiles.length > 1 ? proposalFiles : undefined,
                markdownContent,
                ...extra,
              });
            }
          }
        }
      }
    } catch {
      // Fall through to patch scraping.
    }
  }

  // ── Strategy B: Public .patch fallback (no token / rate limit) ──
  try {
    const patchRes = await fetch(`https://github.com/${targetRepo}/pull/${prNumber}.patch`, {
      headers: { "User-Agent": "EIPsInsight-PR-Inspector" },
    });

    if (!patchRes.ok) {
      if (patchRes.status === 404) {
        return NextResponse.json({ error: `PR #${prNumber} not found in ${targetRepo}` }, { status: 404 });
      }
      return NextResponse.json({ error: `Failed to inspect PR #${prNumber}` }, { status: patchRes.status });
    }

    const patchText = await patchRes.text();
    const commitMatch = patchText.match(/^From ([a-f0-9]{40})/m);
    const headSha = commitMatch ? commitMatch[1] : null;
    const subjectMatch = patchText.match(/^Subject: (?:\[PATCH\]\s*)?(.*)$/m);
    const prTitle = subjectMatch ? subjectMatch[1].trim() : `PR #${prNumber}`;
    const authorMatch = patchText.match(/^From:\s*(.*?)\s*<.*?>/m);
    const prAuthor = authorMatch ? authorMatch[1].trim() : undefined;

    const fileMatches = [...patchText.matchAll(/diff --git a\/([^\s]+) b\/([^\s]+)/g)];
    const allProposalFiles: string[] = [];
    let targetFilename: string | null = null;
    for (const m of fileMatches) {
      const fn = m[2];
      if (PROPOSAL_FILE_RE.test(fn)) {
        allProposalFiles.push(fn);
        if (!targetFilename) targetFilename = fn;
      } else if (fn.endsWith(".md") && !targetFilename) {
        targetFilename = fn;
      }
    }

    if (!targetFilename || !headSha) {
      return NextResponse.json({ error: `Could not locate an EIP/ERC/RIP markdown file in PR #${prNumber}` }, { status: 404 });
    }

    const rawUrl = `https://raw.githubusercontent.com/${targetRepo}/${headSha}/${targetFilename}`;
    const rawRes = await fetch(rawUrl);
    if (!rawRes.ok) {
      return NextResponse.json({ error: `Failed to fetch proposal content from commit ${headSha.slice(0, 7)}` }, { status: 500 });
    }
    const markdownContent = await rawRes.text();

    // Resolve PR state — prefer our DB, fall back to scraping GitHub's HTML.
    let prState: "merged" | "draft" | "closed" | "open" = "open";
    const extra = await enrich(targetRepo, prNum, repo, markdownContent);
    const dbState = extra.governance?.state;
    if (dbState === "merged" || dbState === "closed" || dbState === "open") {
      prState = dbState;
    } else {
      try {
        const pageRes = await fetch(`https://github.com/${targetRepo}/pull/${prNumber}`, { headers: { "User-Agent": "EIPsInsight-PR-Inspector" } });
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const isMerged = Boolean(pageHtml.match(/octicon-git-merge/i) || pageHtml.match(/>Merged<\/span>/i));
          const isClosed = Boolean(pageHtml.match(/octicon-git-pull-request-closed/i) || pageHtml.match(/>Closed<\/span>/i));
          const isDraft = Boolean(pageHtml.match(/octicon-git-pull-request-draft/i) || pageHtml.match(/>Draft<\/span>/i));
          prState = isMerged ? "merged" : isClosed ? "closed" : isDraft ? "draft" : "open";
        }
      } catch {
        // keep "open"
      }
    }

    return NextResponse.json({
      success: true,
      repo: targetRepo,
      prNumber: prNum,
      prTitle,
      prAuthor,
      prUrl: `https://github.com/${targetRepo}/pull/${prNumber}`,
      prState,
      filename: targetFilename,
      proposalFiles: allProposalFiles.length > 1 ? allProposalFiles : undefined,
      markdownContent,
      ...extra,
    });
  } catch (err) {
    return NextResponse.json({ error: `Unexpected error: ${String(err)}` }, { status: 500 });
  }
}
