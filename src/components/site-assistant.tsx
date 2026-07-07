"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  ExternalLink,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  User,
} from "lucide-react";
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

type AssistantDataQuery = {
  title: string;
  description: string;
  sql: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
};

type AssistantAnswerResult = {
  answer: string;
  confidence: "high" | "medium" | "low";
  recommendations: AssistantRecommendation[];
  dataQuery?: AssistantDataQuery | null;
};

type AssistantTurn = {
  role: "user" | "assistant";
  content: string;
  recommendations?: AssistantRecommendation[];
  confidence?: AssistantAnswerResult["confidence"];
  dataQuery?: AssistantDataQuery | null;
};

const STARTER_PROMPTS = [
  "Top editors by reviews this year",
  "PRs waiting on editor 30+ days",
  "EIPs that reached Final each year",
  "Most active contributors this month",
];

const WELCOME_TURN: AssistantTurn = {
  role: "assistant",
  content:
    "Ask me anything about EIPs, ERCs, editors, and governance activity. I can query the live database to answer data questions.",
};

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-emerald-500",
  medium: "bg-yellow-400",
  low: "bg-red-400",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const PREVIEW_ROWS = 5;

function truncateCell(val: string | number | boolean | null, max = 36): string {
  if (val == null) return "—";
  const s = String(val);
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function DataQueryCard({
  dataQuery,
  onViewAll,
}: {
  dataQuery: AssistantDataQuery;
  onViewAll: () => void;
}) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const previewRows = dataQuery.rows.slice(0, PREVIEW_ROWS);
  const hasMore = dataQuery.rowCount > PREVIEW_ROWS;

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            <Database className="h-3 w-3" />
            Data Query
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {dataQuery.title}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{dataQuery.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
          {dataQuery.rowCount} rows
        </span>
      </div>

      {/* Inline mini-table */}
      {previewRows.length > 0 && dataQuery.columns.length > 0 && (
        <div className="overflow-x-auto border-t border-border/40">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-muted/30">
              <tr>
                {dataQuery.columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-border/40 px-2.5 py-1.5 font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  {dataQuery.columns.map((col) => (
                    <td key={col} className="px-2.5 py-1.5 text-foreground/90">
                      {truncateCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-2">
        <button
          type="button"
          onClick={() => setSqlOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {sqlOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {sqlOpen ? "Hide SQL" : "View SQL"}
        </button>
        {hasMore && (
          <Link
            href="/assistant/results"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-[10px] text-primary transition-colors hover:underline"
          >
            View all {dataQuery.rowCount} rows
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* SQL disclosure */}
      {sqlOpen && (
        <div className="border-t border-border/40 px-3 pb-3">
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Generated SQL
            </span>
            <CopyButton text={dataQuery.sql} />
          </div>
          <pre className="mt-1.5 overflow-x-auto rounded-md border border-border/50 bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-all">
            {dataQuery.sql}
          </pre>
        </div>
      )}
    </div>
  );
}

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
          className="fixed bottom-4 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/80 text-foreground shadow-[0_8px_20px_rgb(var(--persona-accent-rgb)/0.18)] backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Open AI assistant"
          title="Ask AI Assistant"
        >
          <Sparkles className="h-4.5 w-4.5 text-primary" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[92vw] border-l border-border bg-background p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="border-b border-border px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="dec-title text-base font-semibold leading-none tracking-tight text-foreground">
                  EIPsInsight AI
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-[11px] leading-none text-muted-foreground">
                  Queries the live database · Llama 3.3 70B
                </SheetDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </SheetHeader>

        <div className="flex h-full min-h-0 flex-col">
          {/* Starter prompts */}
          <div className="border-b border-border px-3 py-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Try asking
            </p>
            <div className="flex flex-wrap gap-1.5">
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

          {/* Chat turns */}
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3"
          >
            {turns.map((turn, index) => (
              <div key={`${turn.role}-${index}`}>
                {turn.role === "user" ? (
                  /* User bubble — right-aligned */
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="max-w-[82%] rounded-2xl rounded-tr-sm border border-primary/30 bg-primary/10 px-3 py-2">
                      <p className="text-sm text-foreground">{turn.content}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant bubble — left-aligned */
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="rounded-2xl rounded-tl-sm border border-border bg-card/70 px-3 py-2.5">
                        <p className="text-sm leading-relaxed text-foreground">{turn.content}</p>
                        {turn.confidence && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${CONFIDENCE_DOT[turn.confidence] ?? "bg-muted-foreground"}`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {CONFIDENCE_LABEL[turn.confidence]}
                            </span>
                          </div>
                        )}
                      </div>

                      {turn.dataQuery && (
                        <DataQueryCard
                          dataQuery={turn.dataQuery}
                          onViewAll={() => setOpen(false)}
                        />
                      )}

                      {turn.recommendations && turn.recommendations.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {turn.recommendations.map((item) => (
                            <Link
                              key={`${item.url}-${item.title}`}
                              href={item.url}
                              onClick={() => setOpen(false)}
                              className="flex items-start gap-2 rounded-xl border border-border bg-card/50 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-primary/5"
                            >
                              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-foreground">
                                  {item.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                                  {item.reason}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-card/70 px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-border px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask about EIPs, editors, governance..."
                className="h-10 flex-1 rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-40"
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
