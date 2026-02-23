"use client";

import Link from "next/link";
import {
  PenTool, LayoutGrid, GitBranch, Clock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tools = [
  {
    title: "EIP Builder",
    description: "Create and validate EIPs with a guided split-view editor. Import existing proposals, edit preamble fields, and preview live markdown.",
    icon: PenTool,
    href: "/tools/eip-builder",
    color: "cyan",
  },
  {
    title: "EIP / ERC / RIP Board",
    description: "Kanban-style board view of all proposals grouped by status. Filter, search, and track the lifecycle of Ethereum standards.",
    icon: LayoutGrid,
    href: "/tools/board",
    color: "emerald",
  },
  {
    title: "Dependency Graph",
    description: "Explore relationships between EIPs. See which proposals are linked through shared PRs and dependency chains.",
    icon: GitBranch,
    href: "/tools/dependencies",
    color: "purple",
  },
  {
    title: "Status & Commit Timeline",
    description: "Deep-dive into any EIP's full lifecycle — every status change, category shift, deadline update, and linked PR.",
    icon: Clock,
    href: "/tools/timeline",
    color: "amber",
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/40", glow: "hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/40", glow: "hover:shadow-[0_0_20px_rgba(52,211,153,0.25)]" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/40", glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/40", glow: "hover:shadow-[0_0_20px_rgba(251,191,36,0.25)]" },
};

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl text-center">
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-4">
            Tools
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Build, explore, and analyze Ethereum standards with purpose-built tools.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colors = colorClasses[tool.color];
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900/40 p-8 backdrop-blur-sm transition-all duration-300",
                  "hover:-translate-y-1",
                  colors.border,
                  colors.glow
                )}
              >
                <div className={cn("rounded-full p-3 mb-5 inline-flex", colors.bg)}>
                  <Icon className={cn("h-7 w-7", colors.text)} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{tool.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{tool.description}</p>
                <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", colors.text)}>
                  Open tool <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
