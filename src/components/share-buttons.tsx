'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Share-to-platform buttons.
 *
 * These are *web intents*: each opens the platform's compose window pre-filled
 * with our text and URL. Nothing is posted automatically — the person always
 * sees the draft and presses post themselves. That keeps this credential-free
 * (no API keys, no OAuth, no paid X API tier) and means a share can never go out
 * unreviewed under the EIPsInsight account.
 *
 * Brand marks are inline SVG paths: lucide's Twitter glyph is the pre-rebrand
 * bird, and there is no Farcaster icon at all.
 */

type Platform = 'x' | 'farcaster' | 'linkedin' | 'telegram';

const ICONS: Record<Platform, { label: string; path: string; viewBox?: string }> = {
  x: {
    label: 'Share on X',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  farcaster: {
    label: 'Share on Farcaster',
    // Rounded-square badge with the Farcaster arch cut out of it.
    path: 'M5.507 1.5h12.986A4.007 4.007 0 0 1 22.5 5.507v12.986a4.007 4.007 0 0 1-4.007 4.007H5.507A4.007 4.007 0 0 1 1.5 18.493V5.507A4.007 4.007 0 0 1 5.507 1.5M7.5 6v1.5h.75l.75 8.25H8.25V18h3.75v-2.25h-.75l-.375-4.125c.3-1.35 1.2-2.25 2.625-2.25s2.325.9 2.625 2.25L15.75 15.75H15V18h3.75v-2.25h-.75l.75-8.25h.75V6z',
  },
  linkedin: {
    label: 'Share on LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z',
  },
  telegram: {
    label: 'Share on Telegram',
    path: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0m4.962 7.224c.1-.002.321.023.465.14a.5.5 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024q-.16.036-5.061 3.345-.719.494-1.301.481c-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789q.04-.324.895-.662 5.257-2.291 7.01-3.021c3.34-1.389 4.035-1.63 4.487-1.638z',
  },
};

function ShareIcon({ platform }: { platform: Platform }) {
  const d = ICONS[platform].path;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function buildUrl(
  platform: Platform,
  url: string,
  text: string,
  hashtags: string[]
): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const tags = hashtags.map((h) => h.replace(/^#/, '')).filter(Boolean);

  switch (platform) {
    case 'x':
      // x.com/intent/post is the current endpoint; twitter.com/intent/tweet still
      // redirects. `hashtags` is X's own param — it appends them AFTER the url,
      // which is the ordering our posts use (text, link, then tags).
      return (
        `https://x.com/intent/post?text=${t}&url=${u}` +
        (tags.length ? `&hashtags=${encodeURIComponent(tags.join(','))}` : '')
      );
    case 'farcaster': {
      // No hashtag param here, so they go inline; embeds[] renders the link as a
      // rich cast preview (which picks up the page's OG image).
      const body = tags.length ? `${text}\n\n${tags.map((h) => `#${h}`).join(' ')}` : text;
      return `https://warpcast.com/~/compose?text=${encodeURIComponent(body)}&embeds[]=${u}`;
    }
    case 'linkedin':
      // LinkedIn ignores custom text entirely and renders the page's OG tags.
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case 'telegram':
      return `https://t.me/share/url?url=${u}&text=${t}`;
  }
}

export function ShareButtons({
  /** Defaults to the current page URL at click time (so it works in RSC pages). */
  url,
  /** Pre-filled compose text. The URL is appended by the platform, not this string. */
  text,
  /** Appended as #tags. X gets them via its own param (after the link); others inline. */
  hashtags = [],
  platforms = ['x', 'farcaster', 'linkedin', 'telegram'],
  showCopy = true,
  className,
}: {
  url?: string;
  text: string;
  hashtags?: string[];
  platforms?: Platform[];
  showCopy?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const resolveUrl = () =>
    url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const share = (platform: Platform) => {
    const target = buildUrl(platform, resolveUrl(), text, hashtags);
    window.open(target, '_blank', 'noopener,noreferrer,width=600,height=640');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resolveUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const btn =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {showCopy && (
        <button type="button" onClick={copy} className={btn} title="Copy link" aria-label="Copy link">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
        </button>
      )}
      {platforms.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => share(p)}
          className={btn}
          title={ICONS[p].label}
          aria-label={ICONS[p].label}
        >
          <ShareIcon platform={p} />
        </button>
      ))}
    </div>
  );
}
