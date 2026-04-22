"use client";
import { StickyBanner } from "@/components/ui/sticky-banner";

export function GivethBanner() {
  return (
    <StickyBanner className="border-b border-border/40 bg-gradient-to-r from-primary/4 via-primary/2 to-transparent backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[13px] font-medium text-foreground sm:text-sm">
          Public goods infrastructure for Ethereum governance. Support us on{" "}
          <a
            href="https://giveth.io/project/eipsinsight"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline transition-colors duration-200 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Giveth QF
          </a>
          <span className="text-primary font-semibold"> 💜</span>
        </p>
      </div>
    </StickyBanner>
  );
}
