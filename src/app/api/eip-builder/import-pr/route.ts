import { NextRequest, NextResponse } from "next/server";

interface PullFile {
  filename: string;
  status: string;
  raw_url: string;
  patch?: string;
  additions: number;
  deletions: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = (searchParams.get("repo") || "eip").toLowerCase(); // eip | erc | rip
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

  // ── Strategy A: GitHub REST API (Used when valid quota exists) ──
  if (token) {
    try {
      const authHeaders: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "EIPsInsight-PR-Inspector",
        Authorization: `Bearer ${token}`,
      };

      const prRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}`, {
        headers: authHeaders,
      });

      if (prRes.ok) {
        const prData = await prRes.json();
        const headSha = prData.head?.sha;

        const filesRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}/files`, {
          headers: authHeaders,
        });

        if (filesRes.ok) {
          const files: PullFile[] = await filesRes.json();
          const proposalFile = files.find((f) =>
            /^(EIPS\/eip-|ERCS\/erc-|RIPS\/rip-)[a-zA-Z0-9_-]+\.md$/i.test(f.filename)
          ) || files.find((f) => f.filename.endsWith(".md"));

          if (proposalFile && headSha) {
            const rawUrl = `https://raw.githubusercontent.com/${targetRepo}/${headSha}/${proposalFile.filename}`;
            const contentRes = await fetch(rawUrl);
            if (contentRes.ok) {
              const markdownContent = await contentRes.text();
              const isMerged = Boolean(prData.merged_at);
              const isDraft = Boolean(prData.draft);
              const resolvedState: "merged" | "draft" | "closed" | "open" = isMerged
                ? "merged"
                : prData.state === "closed"
                ? "closed"
                : isDraft
                ? "draft"
                : "open";

              return NextResponse.json({
                success: true,
                repo: targetRepo,
                prNumber: parseInt(prNumber, 10),
                prTitle: prData.title,
                prAuthor: prData.user?.login,
                prUrl: prData.html_url,
                prState: resolvedState,
                filename: proposalFile.filename,
                markdownContent,
              });
            }
          }
        }
      }
    } catch {
      // Fall through to Git patch scraping
    }
  }

  // ── Strategy B: Git Patch & Commit Raw Fallback (Zero Rate-Limit) ──
  // GitHub exposes public .patch and .diff endpoints for every PR without hitting API token rate limits!
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

    // Extract latest commit SHA
    const commitMatch = patchText.match(/^From ([a-f0-9]{40})/m);
    const headSha = commitMatch ? commitMatch[1] : null;

    // Extract PR title / commit subject
    const subjectMatch = patchText.match(/^Subject: (?:\[PATCH\]\s*)?(.*)$/m);
    const prTitle = subjectMatch ? subjectMatch[1].trim() : `PR #${prNumber}`;

    // Extract author
    const authorMatch = patchText.match(/^From:\s*(.*?)\s*<.*?>/m);
    const prAuthor = authorMatch ? authorMatch[1].trim() : undefined;

    // Find changed proposal file
    const fileMatches = [...patchText.matchAll(/diff --git a\/([^\s]+) b\/([^\s]+)/g)];
    let targetFilename: string | null = null;

    for (const m of fileMatches) {
      const fn = m[2];
      if (/^(EIPS\/eip-|ERCS\/erc-|RIPS\/rip-)[a-zA-Z0-9_-]+\.md$/i.test(fn)) {
        targetFilename = fn;
        break;
      }
      if (fn.endsWith(".md")) {
        targetFilename = fn;
      }
    }

    if (!targetFilename || !headSha) {
      return NextResponse.json(
        { error: `Could not locate an EIP/ERC/RIP markdown file in PR #${prNumber}` },
        { status: 404 }
      );
    }

    // Fetch raw markdown using the commit hash
    const rawUrl = `https://raw.githubusercontent.com/${targetRepo}/${headSha}/${targetFilename}`;
    const rawRes = await fetch(rawUrl);

    if (!rawRes.ok) {
      return NextResponse.json({ error: `Failed to fetch proposal content from commit ${headSha.slice(0, 7)}` }, { status: 500 });
    }

    const markdownContent = await rawRes.text();

    // Determine actual PR status from GitHub HTML page (merged, draft, closed, or open)
    let prState: "merged" | "draft" | "closed" | "open" = "open";
    try {
      const pageRes = await fetch(`https://github.com/${targetRepo}/pull/${prNumber}`, {
        headers: { "User-Agent": "EIPsInsight-PR-Inspector" },
      });
      if (pageRes.ok) {
        const pageHtml = await pageRes.text();
        const isMerged = Boolean(pageHtml.match(/octicon-git-merge/i) || pageHtml.match(/>Merged<\/span>/i));
        const isClosed = Boolean(pageHtml.match(/octicon-git-pull-request-closed/i) || pageHtml.match(/>Closed<\/span>/i));
        const isDraft = Boolean(pageHtml.match(/octicon-git-pull-request-draft/i) || pageHtml.match(/>Draft<\/span>/i));
        prState = isMerged ? "merged" : isClosed ? "closed" : isDraft ? "draft" : "open";
      }
    } catch {
      // Keep default "open" if page fetch fails
    }

    return NextResponse.json({
      success: true,
      repo: targetRepo,
      prNumber: parseInt(prNumber, 10),
      prTitle,
      prAuthor,
      prUrl: `https://github.com/${targetRepo}/pull/${prNumber}`,
      prState,
      filename: targetFilename,
      markdownContent,
    });
  } catch (err) {
    return NextResponse.json({ error: `Unexpected error: ${String(err)}` }, { status: 500 });
  }
}
