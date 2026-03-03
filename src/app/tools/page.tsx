"use client";

import Link from "next/link";
import {
  PenTool, LayoutGrid, GitBranch, Clock, ArrowRight,
} from "lucide-react";
import { SectionSeparator } from "@/components/header";

const tools = [
  {
    title: "EIP Builder",
    description: "Create and validate EIPs with a guided split-view editor.",
    icon: PenTool,
    href: "/tools/eip-builder",
    points: ["Import existing proposals", "Edit preamble fields", "Live markdown preview"],
  },
  {
    title: "EIP / ERC / RIP Board",
    description: "Kanban view of proposals grouped by governance status.",
    icon: LayoutGrid,
    href: "/tools/board",
    points: ["Filter and search quickly", "Track lifecycle states", "Cross-repo board workflow"],
  },
  {
    title: "Dependency Graph",
    description: "Explore relationships between EIPs through linked PRs.",
    icon: GitBranch,
    href: "/tools/dependencies",
    points: ["Dependency chain visualization", "Linked proposal context", "Impact exploration"],
  },
  {
    title: "Status & Commit Timeline",
    description: "Deep-dive into an EIP lifecycle across status and commits.",
    icon: Clock,
    href: "/tools/timeline",
    points: ["Status transition history", "Deadline/category shifts", "Linked PR chronology"],
  },
];

export default function ToolsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <section id="tools-overview" className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.06),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.14),_transparent_60%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative w-full px-4 py-14 text-center sm:px-6 sm:py-18 lg:px-8 xl:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</p>
          <h1 className="dec-title mt-3 text-balance text-4xl font-semibold tracking-tight leading-[1.08] sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Build, Explore, and Analyze
            </span>
            <br />
            <span className="persona-title bg-clip-text text-transparent">
              Ethereum Standards
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Purpose-built tools for drafting proposals, tracking lifecycle states, and mapping dependencies.
          </p>
        </div>
      </section>
      <SectionSeparator />

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="inline-flex rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>

                <h2 className="mt-3 dec-title text-xl font-semibold tracking-tight text-foreground">{tool.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>

                <div className="mt-3 space-y-1.5">
                  {tool.points.map((point) => (
                    <div key={point} className="text-xs text-muted-foreground">
                      • {point}
                    </div>
                  ))}
                </div>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
