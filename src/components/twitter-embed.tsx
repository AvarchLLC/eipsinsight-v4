"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC = "https://platform.x.com/widgets.js";

declare global {
  interface Window {
    twttr?: { widgets: { load: (el?: HTMLElement | null) => void } };
  }
}

/**
 * Embeds a single X (Twitter) post with its video. Used where the YouTube
 * upload is trimmed and the full recording lives on X. The embed plays inline;
 * it cannot be seeked programmatically, so any transcript shown with it is
 * read-only.
 */
export function TwitterEmbed({ statusUrl }: { statusUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    const load = () => window.twttr?.widgets?.load(ref.current);
    if (window.twttr?.widgets) {
      load();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", load);
      load();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.addEventListener("load", load);
    document.body.appendChild(s);
  }, [statusUrl, theme]);

  return (
    <div ref={ref} className="flex justify-center overflow-hidden rounded-xl border border-border bg-card/40 p-2 sm:p-3">
      <blockquote className="twitter-tweet" data-theme={theme} data-dnt="true" data-conversation="none">
        <a href={statusUrl}>Loading the recording from X…</a>
      </blockquote>
    </div>
  );
}
