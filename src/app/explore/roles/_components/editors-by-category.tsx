'use client';

import Link from 'next/link';
import { CalendarClock, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorEntry {
  actor: string;
  lastActivity: string | null;
  actions: number;
  reviews: number;
  comments: number;
  prsTouched: number;
}

interface CategoryGroup {
  category: string;
  editors: EditorEntry[];
}

interface EditorsByCategoryProps {
  groups: CategoryGroup[];
  loading: boolean;
  selectedActor: string | null;
  onSelectActor: (actor: string | null) => void;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((v) => v[0]?.toUpperCase() + v.slice(1))
    .join(' ');
}

function formatLastActivity(value: string | null) {
  if (!value) return 'No recent activity';
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Active today';
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 30) return `Active ${diffDays}d ago`;
  return `Active on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function EditorsByCategory({
  groups,
  loading,
  selectedActor,
  onSelectActor,
}: EditorsByCategoryProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-40 animate-pulse rounded-xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-8 text-sm text-muted-foreground">
        No editor mapping available for selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Editors</p>
        <h3 className="dec-title mt-1 text-xl font-semibold tracking-tight text-foreground">Editors by category</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Canonical editor assignments grouped by standards category, with live activity snapshots.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <section key={group.category} className="rounded-xl border border-border bg-card/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            <h4 className="mt-1 text-lg font-semibold text-foreground">{titleCase(group.category)}</h4>
            <div className="mt-3 space-y-2">
              {group.editors.map((editor) => {
                const selected = selectedActor?.toLowerCase() === editor.actor.toLowerCase();
                return (
                  <button
                    key={editor.actor}
                    type="button"
                    onClick={() => onSelectActor(selected ? null : editor.actor)}
                    className={cn(
                      'w-full rounded-lg border p-2.5 text-left transition-colors',
                      selected
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-muted/25 hover:border-primary/35 hover:bg-primary/10'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/people/${encodeURIComponent(editor.actor)}`}
                        className="text-sm font-semibold text-foreground hover:text-primary"
                        onClick={(event) => event.stopPropagation()}
                      >
                        @{editor.actor}
                      </Link>
                      <span className="text-xs text-muted-foreground">{editor.actions} actions</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {editor.reviews} reviews
                      </span>
                      <span>{editor.comments} comments</span>
                      <span>{editor.prsTouched} PRs</span>
                    </div>
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatLastActivity(editor.lastActivity)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
