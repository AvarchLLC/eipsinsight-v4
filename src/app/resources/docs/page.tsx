"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, ArrowLeft, FileText, BookOpen, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocLink {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  links: DocLink[];
}

const docSections: DocSection[] = [
  {
    id: "eip-process",
    title: "EIP Process",
    icon: FileText,
    color: "cyan",
    links: [
      {
        title: "EIP-1: EIP Purpose and Guidelines",
        description: "The official process document defining how EIPs work.",
        href: "https://eips.ethereum.org/EIPS/eip-1",
        external: true,
      },
      {
        title: "How to Write an EIP",
        description: "Step-by-step guide to proposing improvements.",
        href: "https://ethereum.org/en/eips/",
        external: true,
      },
      {
        title: "EIP Editor Handbook",
        description: "Guidelines for EIP editors and reviewers.",
        href: "https://github.com/ethereum/EIPs/blob/master/EIPS/eip-5069.md",
        external: true,
      },
    ],
  },
  {
    id: "standards",
    title: "Standards",
    icon: BookOpen,
    color: "emerald",
    links: [
      {
        title: "Ethereum EIPs Repository",
        description: "Official repository for Ethereum Improvement Proposals.",
        href: "https://github.com/ethereum/EIPs",
        external: true,
      },
      {
        title: "ERCs Repository",
        description: "Ethereum Request for Comments standards.",
        href: "https://github.com/ethereum/ERCs",
        external: true,
      },
      {
        title: "RIPs Repository",
        description: "Rollup Improvement Proposals.",
        href: "https://github.com/ethereum/RIPs",
        external: true,
      },
      {
        title: "All ERC Standards",
        description: "Browse all Ethereum Request for Comments.",
        href: "https://eips.ethereum.org/erc",
        external: true,
      },
    ],
  },
  {
    id: "upgrades",
    title: "Network Upgrades",
    icon: Rocket,
    color: "purple",
    links: [
      {
        title: "Dencun Upgrade FAQ",
        description: "Everything about the Deneb-Cancun upgrade.",
        href: "https://blog.ethereum.org/2024/02/27/dencun-mainnet-announcement",
        external: true,
      },
      {
        title: "Ethereum Roadmap",
        description: "Official Ethereum development roadmap.",
        href: "https://ethereum.org/en/roadmap/",
        external: true,
      },
      {
        title: "Network Upgrade Tracker",
        description: "Track upcoming Ethereum upgrades.",
        href: "/upgrade",
        external: false,
      },
    ],
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  cyan: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/40",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/40",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/40",
  },
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-2">
            Documentation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Official specs, guides, and process documentation for Ethereum standards.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-12">
          {docSections.map((section) => {
            const Icon = section.icon;
            const colors = colorClasses[section.color];

            return (
              <section key={section.id} id={section.id}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={cn("rounded-full p-2", colors.bg)}>
                    <Icon className={cn("h-5 w-5", colors.text)} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="group block rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm transition-all hover:border-slate-600 hover:shadow-lg hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors flex items-center gap-2">
                            {link.title}
                            {link.external && (
                              <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-8 backdrop-blur-sm text-center">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Missing something?
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Let us know if there&apos;s documentation you&apos;d like to see added.
          </p>
          <a
            href="https://github.com/AvarchLLC/EIPsInsight/issues/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-cyan-500/20 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors"
          >
            Suggest documentation
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
