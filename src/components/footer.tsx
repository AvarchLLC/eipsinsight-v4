"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, Mail, BookOpen } from "lucide-react";

export default function Footer() {
  const footerLinks = {
    product: [
      { name: "EIP Explorer", href: "/eips" },
      { name: "Analytics", href: "/analytics" },
      { name: "Governance", href: "/governance" },
    ],
    legal: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
    ],
  };

  return (
    <footer className="relative border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950">
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-300 dark:via-slate-700/50 to-transparent" />

      <div className="relative w-full max-w-full px-4 py-12 sm:px-6 lg:px-8 xl:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Branding */}
          <div className="lg:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <Image
                src="/brand/logo/EIPsInsights.gif"
                alt="EIPsInsight"
                width={36}
                height={36}
                className="transition-transform duration-200 group-hover:scale-105"
              />
              <span className="dec-title text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-xl">
                EIPsInsight
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-500">
              Clear, visual insights into Ethereum Improvement Proposals.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <a
                href="https://github.com/ethereum/EIPs"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com/EIPsInsight"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="mailto:hello@eipsinsight.com"
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="lg:col-span-7">
            <div className="grid gap-8 sm:grid-cols-2">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {category}
                  </h4>
                  <ul className="space-y-2">
                    {links.map((link) => (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className="text-sm text-slate-600 dark:text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-300"
                        >
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <hr className="mt-10 border-slate-200 dark:border-slate-800/60" />
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-6">
          <p className="text-center text-xs text-slate-600 dark:text-slate-600">
            © 2026 EIPsInsight. Built for the{" "}
            <span className="text-emerald-600 dark:text-emerald-400/80">Ethereum</span> community.
          </p>
          <a
            href="https://github.com/ethereum/EIPs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-600 transition-colors hover:text-slate-700 dark:hover:text-slate-500"
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span>Data from ethereum/EIPs repository</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
