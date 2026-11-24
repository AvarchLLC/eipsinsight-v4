"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin, Youtube, ArrowUp } from "lucide-react";
import { ThemedLogoGif } from "@/components/themed-logo-gif";

const exploreLinks = [
  { name: "Standards", href: "/standards" },
  { name: "Upgrades", href: "/upgrade" },
  { name: "Weekly Recap", href: "/recap" },
  { name: "Analytics", href: "/analytics" },
];

const platformLinks = [
  { name: "Brand Assets", href: "/assets" },
  { name: "API & Tokens", href: "/api-tokens" },
  { name: "EIP Builder", href: "/eip-builder" },
  { name: "Documentation", href: "/resources" },
];

const communityLinks = [
  { name: "About", href: "/about" },
  { name: "Donate", href: "/donate" },
  { name: "Feedback", href: "/feedback" },
  { name: "Privacy & Terms", href: "/privacy-policy" },
];

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/AvarchLLC/eipsinsight-v4",
    icon: Github,
  },
  {
    name: "X",
    href: "https://x.com/EIPsInsight",
    icon: Twitter,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/eipsinsight/",
    icon: Linkedin,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@etherworldco",
    icon: Youtube,
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Identity & Avarch attribution */}
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={26}
                height={26}
                unoptimized
              />
              <span className="font-serif text-lg font-semibold tracking-tight text-[var(--ink)]">
                EIPsInsight
              </span>
            </Link>
            <p className="mt-2.5 text-xs leading-relaxed text-[var(--ink-muted)]">
              The public ledger and governance intelligence platform for Ethereum standards.
            </p>
            <p className="mt-3 text-xs text-[var(--ink-faint)]">
              Built by{" "}
              <a
                href="https://avarch.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--ink)] underline underline-offset-4 decoration-[var(--border-strong)] hover:text-emerald-500 transition-colors"
              >
                Avarch
              </a>
            </p>

            {/* Social channels */}
            <div className="mt-4 flex items-center gap-3.5 text-[var(--ink-muted)]">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                    className="hover:text-[var(--ink)] transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Three clean link columns */}
          <div className="grid grid-cols-3 gap-8 sm:gap-14 md:gap-16">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                Explore
              </p>
              <ul className="mt-3 space-y-2.5">
                {exploreLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                Platform
              </p>
              <ul className="mt-3 space-y-2.5">
                {platformLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                Community
              </p>
              <ul className="mt-3 space-y-2.5">
                {communityLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Colophon */}
        <div className="mt-8 border-t border-[var(--border)] pt-5 flex items-center justify-between text-xs text-[var(--ink-faint)]">
          <p>© {currentYear} EIPsInsight. Open data under CC0 & MIT.</p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="inline-flex items-center gap-1 hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <span>Top</span>
            <ArrowUp className="h-3 w-3" />
          </button>
        </div>
      </div>
    </footer>
  );
}
