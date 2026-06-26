"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Twitter, Loader2, AlertCircle, X } from "lucide-react";

declare global {
  interface Window {
    twttr?: { widgets: { load: (el?: HTMLElement | null) => void } };
  }
}

function loadTwitterScript() {
  if (document.getElementById("twitter-widgets-script")) return;
  const s = document.createElement("script");
  s.id = "twitter-widgets-script";
  s.src = "https://platform.twitter.com/widgets.js";
  s.async = true;
  s.charset = "utf-8";
  document.head.appendChild(s);
}

export const TweetCard = (props: any) => {
  const { url } = props.node.attrs as { url: string };
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;

    fetch(`/api/oembed?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data: { html?: string; error?: string }) => {
        if (cancelled) return;
        if (data.html) {
          setHtml(data.html);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  // Once the oEmbed HTML is in the DOM, ask Twitter's widget script to render it
  useEffect(() => {
    if (!html) return;
    if (window.twttr?.widgets) {
      window.twttr.widgets.load(containerRef.current);
    } else {
      loadTwitterScript();
      // widgets.js calls twttr.events after load; poll briefly
      const t = setInterval(() => {
        if (window.twttr?.widgets) {
          window.twttr.widgets.load(containerRef.current);
          clearInterval(t);
        }
      }, 200);
      return () => clearInterval(t);
    }
  }, [html]);

  return (
    <NodeViewWrapper className="tweet-embed my-6 not-prose">
      <div contentEditable={false} className="relative">
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-[#1d9bf0]" />
            <span className="text-sm text-muted-foreground">Loading tweet…</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-5 py-4">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Could not load tweet</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-muted-foreground hover:text-primary"
              >
                {url}
              </a>
            </div>
          </div>
        )}

        {html && (
          <div
            ref={containerRef}
            /* Twitter's widget renders a centered iframe; constrain it */
            className="[&>blockquote]:mx-auto [&>blockquote]:max-w-[550px]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};
