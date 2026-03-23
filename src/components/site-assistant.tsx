"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Database, ExternalLink, MessageCircle, RotateCcw, SendHorizontal } from "lucide-react";
import { client } from "@/lib/orpc";
import { InlineBrandLoader } from "@/components/inline-brand-loader";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type AssistantRecommendation = {
  title: string;
  url: string;
  reason: string;
};

type AssistantAnswerResult = {
  answer: string;
  confidence: "high" | "medium" | "low";
  recommendations: AssistantRecommendation[];
  dataQuery?: AssistantDataQuery | null;
};

type AssistantDataQuery = {
  title: string;
  description: string;
  sql: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
};

type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
  recommendations?: AssistantRecommendation[];
  confidence?: AssistantAnswerResult["confidence"];
  dataQuery?: AssistantDataQuery | null;
};

const STARTER_PROMPTS = [
  "What is EIP-1559 in one line?",
  "What does ERC-20 do?",
  "Explain EIP-4844 simply",
  "Where can I track upgrades?",
];

const WELCOME_TURN: AssistantTurn = {
  role: "assistant",
  content:
    "Ask me anything about this site. I will give a short answer first, then links if useful.",
};

export function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<AssistantTurn[]>([WELCOME_TURN]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const history = useMemo(
    () => turns.map((turn) => ({ role: turn.role, content: turn.content })),
    [turns]
  );

  useEffect(() => {
    if (!open) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [open, turns, loading]);

  const submitPrompt = async (textInput: string) => {
    const text = textInput.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setPrompt("");

    const nextTurns: AssistantTurn[] = [...turns, { role: "user", content: text }];
    setTurns(nextTurns);

    try {
      const result = (await client.search.answerAndRecommend({
        query: text,
        limit: 4,
        history,
      })) as AssistantAnswerResult;

      if (result.dataQuery) {
        try {
          window.localStorage.setItem(
            "assistant:last-data-query",
            JSON.stringify({
              ...result.dataQuery,
              savedAt: new Date().toISOString(),
              question: text,
            })
          );
        } catch {
          // Ignore storage errors; assistant response still renders.
        }
      }

      setTurns((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          recommendations: result.recommendations,
          confidence: result.confidence,
          dataQuery: result.dataQuery,
        },
      ]);
    } catch {
      setError("Assistant is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submitPrompt(prompt);
  };

  const resetChat = () => {
    setTurns([WELCOME_TURN]);
    setPrompt("");
    setError(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-4 right-4 z-40 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card/80 px-3.5 text-sm font-semibold text-foreground shadow-[0_8px_20px_rgb(var(--persona-accent-rgb)/0.18)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          Assistant
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[92vw] border-l border-border bg-background p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2 dec-title text-xl font-semibold tracking-tight text-foreground">
                <Bot className="h-4 w-4 text-primary" />
                Site Assistant
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-sm text-muted-foreground">
                Short precise answers, then links if needed.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </SheetHeader>

        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => void submitPrompt(item)}
                  disabled={loading}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={
                  turn.role === "user"
                    ? "ml-8 rounded-xl border border-primary/30 bg-primary/10 p-3"
                    : "mr-8 rounded-xl border border-border bg-card/60 p-3"
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {turn.role === "user" ? "You" : "Assistant"}
                </p>
                <p className="mt-1 text-sm text-foreground">{turn.content}</p>

                {turn.role === "assistant" && turn.confidence && (
                  <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {turn.confidence} confidence
                  </p>
                )}

                {turn.role === "assistant" && turn.recommendations && turn.recommendations.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {turn.recommendations.map((item) => (
                      <li key={`${item.url}-${item.title}`} className="rounded-md border border-border bg-muted/30 p-2">
                        <Link href={item.url} className="text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline" onClick={() => setOpen(false)}>
                          {item.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {turn.role === "assistant" && turn.dataQuery && (() => {
                  const dataQuery = turn.dataQuery;
                  return (
                  <div className="mt-3 rounded-lg border border-primary/25 bg-primary/8 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/85">
                          Data Analysis
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{dataQuery.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{dataQuery.description}</p>
                      </div>
                      <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {dataQuery.rowCount} rows
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Open full result view for detailed rows, filters, and easier scanning.
                    </p>
                    <div className="mt-3 flex justify-start">
                      <Link
                        href="/assistant/results"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/12 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/18"
                      >
                        Open detailed result
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                  );
                })()}
              </div>
            ))}

            {loading && (
              <div className="mr-8 rounded-xl border border-border bg-card/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assistant</p>
                <div className="mt-2 flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <InlineBrandLoader size="sm" label="Analyzing your question..." className="items-start gap-1" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask about EIPsInsight..."
                className="h-10 flex-1 rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary transition-all hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
