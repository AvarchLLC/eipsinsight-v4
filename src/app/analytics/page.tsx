"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Users, FileText, GitPullRequest, UserCheck } from "lucide-react";

const analyticsSections = [
  {
    title: "EIPs",
    description: "Track proposal lifecycle, status transitions, and category breakdowns",
    href: "/analytics/eips",
    icon: FileText,
  },
  {
    title: "PRs",
    description: "Monitor pull request activity, governance states, and merge velocity",
    href: "/analytics/prs",
    icon: GitPullRequest,
  },
  {
    title: "Editors",
    description: "Analyze editor workload, review patterns, and category coverage",
    href: "/analytics/editors",
    icon: UserCheck,
  },
  {
    title: "Reviewers",
    description: "Track reviewer contributions, cycles per PR, and repo distribution",
    href: "/analytics/reviewers",
    icon: Users,
  },
  {
    title: "Authors",
    description: "Monitor author activity, success rates, and proposal creation trends",
    href: "/analytics/authors",
    icon: FileText,
  },
  {
    title: "Contributors",
    description: "Explore contributor activity, engagement patterns, and live feeds",
    href: "/analytics/contributors",
    icon: Users,
  },
];

export default function AnalyticsOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Analytics Dashboard
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Comprehensive insights into Ethereum standards governance and activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analyticsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg border border-border bg-muted/60 p-3 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
