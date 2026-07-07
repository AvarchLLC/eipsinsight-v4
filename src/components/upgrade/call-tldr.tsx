'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Defensive renderer for ACDbot tldr.json payloads. The shape varies across
 * call series and bot versions, so we render whatever sections exist:
 * strings become paragraphs, arrays become lists, objects become sub-lists.
 */

const SKIP_KEYS = new Set(['meeting', 'date', 'version']);

function titleize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function itemToText(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    for (const key of ['text', 'title', 'topic', 'summary', 'description', 'item']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
    return Object.values(record)
      .filter((value): value is string => typeof value === 'string')
      .join(' — ');
  }
  return String(item);
}

function TldrSection({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;

  if (typeof value === 'string') {
    if (!value.trim()) return null;
    return (
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h5>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{value}</p>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const items = value.map(itemToText).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h5>
        <ul className="mt-1 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
              <span className="mt-0.5 shrink-0 text-primary">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return null;
    return (
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </h5>
        <ul className="mt-1 space-y-1.5">
          {entries.map(([key, entryValue]) => (
            <li key={key} className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground/80">{titleize(key)}:</span>{' '}
              {Array.isArray(entryValue) ? (
                <ul className="mt-0.5 space-y-0.5 pl-4">
                  {entryValue.map((item, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-0.5 shrink-0 text-primary/70">·</span>
                      <span>{itemToText(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                itemToText(entryValue)
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

export function CallTldr({ tldr }: { tldr: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (!tldr || typeof tldr !== 'object') return null;
  const sections = Object.entries(tldr as Record<string, unknown>).filter(
    ([key, value]) => !SKIP_KEYS.has(key.toLowerCase()) && value != null
  );
  if (sections.length === 0) return null;

  return (
    <div className="mt-2">
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 pb-2 pt-1">
            {sections.map(([key, value]) => (
              <TldrSection key={key} label={titleize(key)} value={value} />
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={() => setExpanded((current) => !current)}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-300', expanded && 'rotate-180')}
        />
        {expanded ? 'Hide summary' : 'Show summary'}
      </button>
    </div>
  );
}
