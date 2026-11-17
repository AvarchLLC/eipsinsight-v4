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

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "EIPsInsight-PR-Inspector",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    // 1. Fetch PR details
    const prRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}`, {
      headers,
    });

    if (!prRes.ok) {
      if (prRes.status === 404) {
        return NextResponse.json({ error: `PR #${prNumber} not found in ${targetRepo}` }, { status: 404 });
      }
      return NextResponse.json({ error: `GitHub API error: ${prRes.statusText}` }, { status: prRes.status });
    }

    const prData = await prRes.json();
    const headSha = prData.head?.sha;

    // 2. Fetch changed files in the PR
    const filesRes = await fetch(`https://api.github.com/repos/${targetRepo}/pulls/${prNumber}/files`, {
      headers,
    });

    if (!filesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch files from PR" }, { status: filesRes.status });
    }

    const files: PullFile[] = await filesRes.json();

    // Match proposal markdown file: EIPS/eip-*.md, ERCS/erc-*.md, RIPS/rip-*.md
    const proposalFile = files.find((f) =>
      /^(EIPS\/eip-|ERCS\/erc-|RIPS\/rip-)[a-zA-Z0-9_-]+\.md$/i.test(f.filename)
    ) || files.find((f) => f.filename.endsWith(".md"));

    if (!proposalFile) {
      return NextResponse.json(
        {
          error: `No EIP/ERC/RIP proposal markdown file found in PR #${prNumber}. Files changed: ${files.map((f) => f.filename).join(", ")}`,
        },
        { status: 404 }
      );
    }

    // 3. Construct durable raw.githubusercontent.com URL using PR head sha or raw_url
    let rawUrl = proposalFile.raw_url;
    if (headSha) {
      rawUrl = `https://raw.githubusercontent.com/${targetRepo}/${headSha}/${proposalFile.filename}`;
    }

    const contentRes = await fetch(rawUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!contentRes.ok) {
      return NextResponse.json({ error: `Failed to fetch raw file: ${proposalFile.filename}` }, { status: 500 });
    }

    const markdownContent = await contentRes.text();

    return NextResponse.json({
      success: true,
      repo: targetRepo,
      prNumber: parseInt(prNumber, 10),
      prTitle: prData.title,
      prAuthor: prData.user?.login,
      prUrl: prData.html_url,
      prState: prData.state,
      filename: proposalFile.filename,
      markdownContent,
    });
  } catch (err) {
    return NextResponse.json({ error: `Unexpected error: ${String(err)}` }, { status: 500 });
  }
}
