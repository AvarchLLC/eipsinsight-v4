'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Compact markdown renderer for scraped devnet announcements.
 *
 * These come from ethpandaops HackMD `:::info` blocks and routinely contain GFM
 * tables (system-contract addresses, client-support grids) plus `:emoji:`
 * shortcodes — neither of which renders as plain text, which is why the raw
 * `| Contract | Req |` pipes were showing on the page.
 *
 * Deliberately GFM-only, with NO rehype-raw: the source is external/untrusted, so
 * raw HTML must not be executed. remark-gfm is enough for tables/lists/links.
 */

// HackMD/GitHub emoji shortcodes seen in devnet notes. remark-gfm does not expand
// these, so we substitute the common ones before rendering.
const EMOJI_SHORTCODES: Record<string, string> = {
  exclamation: '❗',
  bangbang: '‼️',
  warning: '⚠️',
  white_check_mark: '✅',
  heavy_check_mark: '✔️',
  x: '❌',
  new: '🆕',
  fire: '🔥',
  rocket: '🚀',
  arrow_right: '➡️',
  information_source: 'ℹ️',
  construction: '🚧',
  tada: '🎉',
  lock: '🔒',
  hourglass: '⏳',
  pushpin: '📌',
};

function expandShortcodes(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/gi, (whole, name: string) => {
    const key = name.toLowerCase();
    return EMOJI_SHORTCODES[key] ?? whole; // leave unknown codes untouched
  });
}

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary underline transition-colors hover:text-primary/80"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-5 list-disc space-y-0.5 text-sm text-muted-foreground last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-5 list-decimal space-y-0.5 text-sm text-muted-foreground last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-foreground">
      {children}
    </code>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  // Tables scroll horizontally so long contract addresses never break the layout.
  table: ({ children }) => (
    <div className="my-2 w-full overflow-x-auto rounded-lg border border-border bg-background/60">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => (
    <th className="whitespace-nowrap border-b border-border px-3 py-1.5 text-left font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="whitespace-nowrap border-b border-border/50 px-3 py-1.5 font-mono text-foreground">
      {children}
    </td>
  ),
};

export function AnnouncementMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {expandShortcodes(text)}
    </ReactMarkdown>
  );
}
