'use client';

import { useMemo, useState } from 'react';
import { MessagesSquare, Play, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/call-artifacts';

function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/** Deterministic per-author accent so the same person keeps one color. */
const AUTHOR_COLORS = [
  'text-emerald-600 dark:text-emerald-300',
  'text-cyan-600 dark:text-cyan-300',
  'text-violet-600 dark:text-violet-300',
  'text-amber-600 dark:text-amber-300',
  'text-rose-600 dark:text-rose-300',
  'text-blue-600 dark:text-blue-300',
  'text-teal-600 dark:text-teal-300',
  'text-fuchsia-600 dark:text-fuchsia-300',
];
function authorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AUTHOR_COLORS[hash % AUTHOR_COLORS.length];
}

/** Linkify EIP-#### / raw URLs inside a chat message. */
function renderText(text: string) {
  return text.split(/(\bEIP-\d+\b|https?:\/\/[^\s]+)/g).map((part, i) => {
    if (/^EIP-\d+$/.test(part)) {
      const n = part.slice(4);
      return (
        <a key={i} href={`/eip/${n}`} className="font-mono font-semibold text-primary hover:underline">
          {part}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary hover:underline"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CallChat({ messages }: { messages: ChatMessage[] }) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const visible = useMemo(
    () =>
      query
        ? messages.filter(
            (m) =>
              m.text.toLowerCase().includes(query) ||
              (m.author ?? '').toLowerCase().includes(query)
          )
        : messages,
    [messages, query]
  );

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
        <MessagesSquare className="h-4 w-4 text-muted-foreground" />
        Meeting chat
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
          {messages.length}
        </span>
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="border-b border-border/50 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chat…"
              className="h-8 w-full rounded-md border border-border bg-muted/60 pl-8 pr-7 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No messages match “{search}”.
            </p>
          ) : (
            <ul className="space-y-2">
              {visible.map((m, i) => (
                <li key={i} className="rounded-lg px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    {m.author ? (
                      <span className={cn('text-xs font-semibold', authorColor(m.author))}>
                        {m.author}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">—</span>
                    )}
                    {m.time && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('call:seek', { detail: toSeconds(m.time!) })
                          )
                        }
                        className="inline-flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground/70 transition-colors hover:text-primary"
                        title="Jump to this moment"
                      >
                        <Play className="h-2.5 w-2.5" />
                        {m.time}
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {renderText(m.text)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
