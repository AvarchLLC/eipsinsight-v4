'use client';

import { Fragment, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Linkify EIP references in the AI answer. */
function renderAnswer(text: string) {
  return text.split(/(\bEIP-\d+\b)/g).map((part, i) =>
    /^EIP-\d+$/.test(part) ? (
      <a key={i} href={`/eip/${part.slice(4)}`} className="font-mono font-semibold text-primary hover:underline">
        {part}
      </a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export function CallAskAi({
  series,
  number,
  suggestions = [],
}: {
  series: string;
  number: string;
  suggestions?: string[];
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setQuestion(trimmed);
    try {
      const res = await fetch('/api/calls/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ series, number, question: trimmed }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.');
      } else {
        setAnswer(data.answer ?? '');
      }
    } catch {
      setError('Network error - please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Ask about this call
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Answered from this call&apos;s summary and transcript only.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What was decided about PeerDAS?"
          className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </form>

      {suggestions.length > 0 && !answer && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(answer || error || loading) && (
        <div
          className={cn(
            'mt-3 rounded-lg border px-3 py-2.5 text-sm leading-relaxed',
            error
              ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300'
              : 'border-border bg-card/60 text-muted-foreground'
          )}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the call…
            </span>
          ) : error ? (
            error
          ) : (
            <p>{renderAnswer(answer ?? '')}</p>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground/60">AI-generated - verify against the recording.</p>
    </section>
  );
}
