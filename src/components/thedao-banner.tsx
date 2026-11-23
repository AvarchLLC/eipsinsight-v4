"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "thedao-fund-banner-dismissed-v1";
const INITIATIVE_URL =
  "https://initiatives.thedao.fund/initiative/account-abstraction-and-mempool-security-analytics";

export function TheDaoLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 264 264"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="12" y="2" width="240" height="240" rx="44" fill="#FF3C38" />
      <path
        d="M81.4424 192.833V51.166H130.243C141.259 51.166 149.667 51.8425 155.465 53.1953C163.582 55.0636 170.507 58.4458 176.241 63.342C183.714 69.6555 189.287 77.7406 192.959 87.5973C196.696 97.3897 198.564 108.599 198.564 121.226C198.564 131.985 197.308 141.52 194.795 149.83C192.283 158.141 189.061 165.034 185.132 170.51C181.202 175.922 176.885 180.206 172.182 183.362C167.544 186.455 161.907 188.806 155.271 190.417C148.7 192.027 141.131 192.833 132.562 192.833H81.4424ZM100.19 176.115H130.436C139.778 176.115 147.09 175.245 152.372 173.506C157.719 171.766 161.971 169.318 165.128 166.161C169.573 161.716 173.02 155.757 175.468 148.284C177.981 140.747 179.237 131.631 179.237 120.936C179.237 106.119 176.789 94.7483 171.893 86.8243C167.061 78.8358 161.166 73.4887 154.208 70.7829C149.183 68.8502 141.098 67.8838 129.953 67.8838H100.19V176.115Z"
        fill="white"
      />
      <rect x="66.167" y="115.311" width="74.2461" height="13.1023" fill="white" />
    </svg>
  );
}

export function TheDaoBanner({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <aside
      aria-label="TheDAO Security Fund Initiative Announcement"
      className={cn(
        "relative flex w-full items-center justify-between border-b border-[var(--border)]",
        "bg-[var(--surface)]",
        "px-3 py-1.5 sm:px-6 text-[var(--ink)] text-xs transition-colors",
        className
      )}
    >
      <a
        href={INITIATIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 items-center justify-center gap-2 sm:gap-3 pr-6 text-center leading-tight hover:opacity-95 transition-opacity"
      >
        {/* TheDAO Security Fund Brand Tag */}
        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-[var(--paper)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink)] border border-[var(--border)]">
          <TheDaoLogo className="h-3 w-3 shrink-0" />
          <span>TheDAO Security Fund</span>
        </span>

        {/* Initiative Pitch */}
        <span className="text-[var(--ink-tertiary)] hidden md:inline">&bull;</span>
        <span className="font-normal text-[var(--ink-secondary)]">
          <span className="hidden sm:inline">Funding initiative: </span>
          <span className="font-medium text-[var(--ink)]">
            Account Abstraction &amp; Mempool Security Analytics
          </span>
        </span>

        {/* CTA Button */}
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--brand)] underline-offset-4 group-hover:underline transition-colors ml-1 shrink-0">
          <span>Click here to support</span>
          <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </a>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss announcement banner"
        className="shrink-0 p-1 rounded-sm text-[var(--ink-tertiary)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand)]"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
