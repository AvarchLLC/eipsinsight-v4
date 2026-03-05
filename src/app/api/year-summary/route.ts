import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const SUPPORTED_MODELS = [
  "command-a-03-2025",
  "command-r-plus-08-2024",
  "command-r-08-2024",
];

type YearSummaryRequest = {
  year: number;
  isCurrentYear: boolean;
  metrics: {
    newEIPs: number;
    statusChanges: number;
    prs: number;
  };
  deltas: {
    newEIPsPct?: number | null;
    statusChangesPct?: number | null;
    prsPct?: number | null;
  };
  peaks: {
    throughputMonth?: string | null;
    governanceChurnMonth?: string | null;
  };
};

function fallbackSummary(input: YearSummaryRequest): string {
  const { year, isCurrentYear, metrics, peaks } = input;
  if (isCurrentYear) {
    return `${year} is a live year-to-date snapshot. Metrics are still collecting and may shift as new proposals and reviews are indexed. Current activity indicates ${metrics.newEIPs.toLocaleString()} new EIPs, ${metrics.prs.toLocaleString()} PR events, and ${metrics.statusChanges.toLocaleString()} status changes so far${peaks.throughputMonth ? `, with throughput peaking in ${peaks.throughputMonth}` : ""}.`;
  }
  return `${year} shows ${metrics.newEIPs.toLocaleString()} new EIPs, ${metrics.prs.toLocaleString()} PR events, and ${metrics.statusChanges.toLocaleString()} status changes${peaks.throughputMonth ? `, with peak proposal throughput in ${peaks.throughputMonth}` : ""}${peaks.governanceChurnMonth ? ` and governance churn peaking in ${peaks.governanceChurnMonth}` : ""}.`;
}

async function generateWithCohere(input: YearSummaryRequest, apiKey: string): Promise<string | null> {
  const prompt = `Generate a compact governance intelligence summary for Ethereum proposals.

Year: ${input.year}
Current year snapshot: ${input.isCurrentYear ? "yes" : "no"}
Metrics:
- New EIPs: ${input.metrics.newEIPs}
- PR activity: ${input.metrics.prs}
- Status changes: ${input.metrics.statusChanges}
- YoY new EIPs (%): ${input.deltas.newEIPsPct ?? "n/a"}
- YoY PR activity (%): ${input.deltas.prsPct ?? "n/a"}
- YoY status changes (%): ${input.deltas.statusChangesPct ?? "n/a"}
- Peak throughput month: ${input.peaks.throughputMonth ?? "n/a"}
- Peak governance churn month: ${input.peaks.governanceChurnMonth ?? "n/a"}

Return JSON only with this exact schema:
{
  "summary": "2-3 concise sentences, high-signal, no hype",
  "character": "one short label like Expansion Phase or Governance Cleanup Year"
}

Rules:
- If current year snapshot=yes, explicitly mention it's still collecting and directional.
- Mention one key peak month if available.
- Keep language analytical and neutral.
- No markdown. JSON only.`;

  for (const model of SUPPORTED_MODELS) {
    try {
      const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          message: prompt,
          temperature: 0.2,
          chat_history: [],
          connectors: [],
        }),
      });

      const data = (await response.json()) as { text?: string; message?: string };
      if (!response.ok || !data.text) {
        continue;
      }

      try {
        const parsed = JSON.parse(data.text) as { summary?: string };
        if (parsed.summary?.trim()) return parsed.summary.trim();
      } catch {
        // Try lightweight extraction if model returns extra text.
        const match = data.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]) as { summary?: string };
          if (parsed.summary?.trim()) return parsed.summary.trim();
        }
      }
    } catch {
      // Try next model.
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as YearSummaryRequest;
    if (!body?.year || !body?.metrics) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const fallback = fallbackSummary(body);
    const apiKey = env.COHERE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ summary: fallback, source: "fallback" });
    }

    const aiSummary = await generateWithCohere(body, apiKey);
    return NextResponse.json({
      summary: aiSummary ?? fallback,
      source: aiSummary ? "cohere" : "fallback",
    });
  } catch (error) {
    console.error("year-summary error:", error);
    return NextResponse.json({ error: "Failed to generate year summary." }, { status: 500 });
  }
}
