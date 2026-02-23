import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const SUPPORTED_MODELS = [
  "command-a-03-2025",
  "command-r-plus-08-2024",
  "command-r-08-2024",
];

function formatSummaryForDisplay(summary: string): string {
  return summary
    .trim()
    .replace(/^###\s*/gm, "")
    .replace(/^\*\*(.+?)\*\*$/gm, '<h4 class="font-semibold text-cyan-600 dark:text-cyan-400 mt-4 mb-2">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-600 dark:text-cyan-400">$1</strong>')
    .replace(/^\d+\.\s+\*\*(.*?)\*\*:\s*/gm, '<div class="ml-4 mb-2"><strong class="text-emerald-600 dark:text-emerald-400">$1:</strong> ')
    .replace(/^-\s+\*\*(.*?)\*\*:\s*/gm, '<div class="ml-4 mb-1"><strong class="text-violet-600 dark:text-violet-400">$1:</strong> ')
    .replace(/\n\n/g, '</div></p><p class="mb-3 text-slate-600 dark:text-slate-400">')
    .replace(/\n/g, " ")
    .replace(/^(Purpose|Technical Approach|Benefits & Impact|Impact|Significance):\s*/gm, '<h4 class="font-semibold text-cyan-600 dark:text-cyan-400 mt-4 mb-2">$1</h4><p class="mb-3 text-slate-600 dark:text-slate-400">')
    .replace(/<\/div><\/p>/g, "</div>")
    .replace(/<p class="mb-3"><\/p>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = env.COHERE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI summary is not configured. COHERE_API_KEY is missing." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { eipNo, content } = body;

    if (!content || !eipNo) {
      return NextResponse.json(
        { error: "Missing eipNo or content" },
        { status: 400 }
      );
    }

    // Truncate content to avoid token limits (Cohere has large context but be safe)
    const maxChars = 100_000;
    const truncatedContent =
      typeof content === "string" && content.length > maxChars
        ? content.slice(0, maxChars) + "\n\n[... content truncated ...]"
        : content;

    let lastError: unknown = null;

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
            message: `Analyze EIP ${eipNo} and create a concise, well-structured summary in 80-120 words.

**Format your response with these sections:**

**Purpose**
What problem does this EIP solve? (1-2 sentences)

**Technical Approach**
Key changes or mechanisms introduced (2-3 key points)

**Impact**
How it benefits developers, users, or the network (1-2 sentences)

**Significance**
Why this EIP matters for Ethereum (1 sentence)

Keep it concise, technical but accessible. Use bullet points for multiple items.

EIP ${eipNo} Content:
${truncatedContent}`,
            temperature: 0.4,
            chat_history: [],
            connectors: [],
          }),
        });

        const data = (await response.json()) as {
          text?: string;
          message?: string;
        };

        if (response.ok && data.text) {
          const summary = formatSummaryForDisplay(data.text);
          return NextResponse.json({ summary });
        }

        lastError = data;
        if (
          data.message?.includes("removed") ||
          data.message?.includes("deprecated")
        ) {
          continue;
        }
        return NextResponse.json(
          { error: data.message || "Cohere API error" },
          { status: 500 }
        );
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    console.error("All models failed. Last error:", lastError);
    return NextResponse.json(
      {
        error:
          "Failed to generate summary with any available model. Please try again later.",
      },
      { status: 500 }
    );
  } catch (err) {
    console.error("EIP summary error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
