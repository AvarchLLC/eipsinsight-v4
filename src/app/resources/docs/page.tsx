"use client";

import React from "react";
import Link from "next/link";
import {
  ExternalLink,
  ArrowLeft,
  FileText,
  BookOpen,
  Rocket,
  Library,
  Compass,
  Workflow,
} from "lucide-react";

interface DocLink {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

interface DocSection {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  links: DocLink[];
}

const docSections: DocSection[] = [
  {
    id: "eip-process",
    title: "EIP Process",
    eyebrow: "Get Started",
    description: "Core process documents for understanding how proposals are written, reviewed, and advanced.",
    icon: Workflow,
    links: [
      {
        title: "EIP-1: EIP Purpose and Guidelines",
        description: "The canonical process specification for how Ethereum Improvement Proposals work.",
        href: "https://eips.ethereum.org/EIPS/eip-1",
        external: true,
      },
      {
        title: "How to Write an EIP",
        description: "A practical guide to drafting, structuring, and submitting a proposal.",
        href: "https://ethereum.org/en/eips/",
        external: true,
      },
      {
        title: "EIP Editor Handbook",
        description: "Operational guidance for editorial review, process expectations, and maintenance.",
        href: "https://github.com/ethereum/EIPs/blob/master/EIPS/eip-5069.md",
        external: true,
      },
    ],
  },
  {
    id: "standards",
    title: "Standards Repositories",
    eyebrow: "Reference",
    description: "Official repositories and standards indexes for EIPs, ERCs, and RIPs.",
    icon: BookOpen,
    links: [
      {
        title: "Ethereum EIPs Repository",
        description: "Primary source repository for Ethereum Improvement Proposals.",
        href: "https://github.com/ethereum/EIPs",
        external: true,
      },
      {
        title: "ERCs Repository",
        description: "Ethereum Request for Comments standards and token/interface references.",
        href: "https://github.com/ethereum/ERCs",
        external: true,
      },
      {
        title: "RIPs Repository",
        description: "Rollup Improvement Proposals for L2 and rollup-specific standards work.",
        href: "https://github.com/ethereum/RIPs",
        external: true,
      },
      {
        title: "All ERC Standards",
        description: "Browse ERCs directly from the official EIPs site.",
        href: "https://eips.ethereum.org/erc",
        external: true,
      },
    ],
  },
  {
    id: "upgrades",
    title: "Network Upgrades",
    eyebrow: "Go Deeper",
    description: "Protocol upgrade references, roadmap context, and upgrade-specific reading.",
    icon: Rocket,
    links: [
      {
        title: "Dencun Upgrade FAQ",
        description: "An official guide to the Deneb-Cancun upgrade and its implications.",
        href: "https://blog.ethereum.org/2024/02/27/dencun-mainnet-announcement",
        external: true,
      },
      {
        title: "Ethereum Roadmap",
        description: "Official roadmap reference for the network’s long-term direction.",
        href: "https://ethereum.org/en/roadmap/",
        external: true,
      },
      {
        title: "Network Upgrade Tracker",
        description: "Browse upgrade timelines and curated upgrade context inside EIPsInsight.",
        href: "/upgrade",
        external: false,
      },
    ],
  },
];

const quickActions = [
  {
    title: "Learn the EIP lifecycle",
    description: "Start with the process and understand how proposals move from Draft to Final.",
    href: "#eip-process",
    icon: Workflow,
  },
  {
    title: "Open standards repositories",
    description: "Jump directly into the official EIPs, ERCs, and RIPs sources.",
    href: "#standards",
    icon: Library,
  },
  {
    title: "Study upgrade references",
    description: "Read roadmap and hard fork references alongside the EIPsInsight upgrade tracker.",
    href: "#upgrades",
    icon: Compass,
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8">
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>

          <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Resources
          </div>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Documentation
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Official specs, writing guides, repository references, and upgrade documentation for Ethereum standards.
          </p>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Docs Hub</p>
              <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Start with the right reference
              </h2>
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                This page is for official sources and process-level reading. Use it when you need canonical specs, not commentary.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/resources/faq"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                FAQ
              </Link>
              <Link
                href="/resources/blogs"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                Commentary
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-xl border border-border bg-muted/30 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="space-y-10">
          {docSections.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.id} id={section.id} className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.eyebrow}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                          {section.title}
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3 text-[11px] font-medium text-muted-foreground">
                    {section.links.length} reference{section.links.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-6 grid gap-4">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noreferrer" : undefined}
                      className="group rounded-xl border border-border bg-muted/20 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/80"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-primary" />
                            <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                              {link.title}
                            </h3>
                            {link.external && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
                          </div>
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{link.description}</p>
                        </div>
                        <span className="hidden rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
                          {link.external ? "External" : "Internal"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-12 rounded-xl border border-border bg-card/60 p-6 text-center backdrop-blur-sm">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Missing a reference?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If there&apos;s a standards document, handbook, or canonical guide we should surface here, send it through the issue tracker.
          </p>
          <a
            href="https://github.com/AvarchLLC/eipsinsight-v4/issues/new"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-5 text-sm font-medium text-primary transition-all hover:bg-primary/15"
          >
            Suggest documentation
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
