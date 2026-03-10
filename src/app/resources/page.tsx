"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Github,
  HeartHandshake,
  HelpCircle,
  Lightbulb,
  Newspaper,
  Target,
  Users,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { featuredResources } from "@/data/resources/featured";
import { grants } from "@/data/resources/grants";
import { partners } from "@/data/resources/partners";
import { team } from "@/data/resources/team";

type FeaturedTab = "featured" | "trending" | "latest";

const learningPaths = [
  {
    title: "New To EIPs",
    estimate: "~10 min",
    description: "Understand what Ethereum Improvement Proposals are and how decisions move through governance.",
    href: "/resources/docs",
    links: ["What is an EIP?", "How governance works", "Key proposals explained"],
  },
  {
    title: "Contributors",
    estimate: "~30 min",
    description: "Learn how to draft proposals, collaborate in PRs, and navigate editorial workflow.",
    href: "/tools/eip-builder",
    links: ["How to write an EIP", "PR process", "Editor workflow"],
  },
  {
    title: "Researchers",
    estimate: "~20 min",
    description: "Analyze proposal movement, governance trends, and contributor networks.",
    href: "/analytics/eips",
    links: ["EIP analytics", "Governance patterns", "Contributor networks"],
  },
];

const resourceCategories = [
  {
    title: "FAQ",
    group: "Learn",
    description: "Quick explanations and common governance questions.",
    count: "20+ answers",
    href: "/resources/faq",
    icon: HelpCircle,
  },
  {
    title: "Documentation",
    group: "Docs",
    description: "Specs, process guides, and proposal references.",
    count: "Core guides",
    href: "/resources/docs",
    icon: BookOpen,
  },
  {
    title: "Blogs",
    group: "Media",
    description: "Deep analysis and commentary on proposals.",
    count: "Long-form analysis",
    href: "/resources/blogs",
    icon: FileText,
  },
  {
    title: "Videos",
    group: "Media",
    description: "Walkthroughs and explainers for protocol changes.",
    count: "Explainer library",
    href: "/resources/videos",
    icon: Video,
  },
  {
    title: "News",
    group: "Updates",
    description: "Recent ecosystem and governance updates.",
    count: "Latest updates",
    href: "/resources/news",
    icon: Newspaper,
  },
];

const communityResources = [
  {
    name: "Ethereum Magicians",
    description: "Public forum for EIP discussions and proposal reviews.",
    href: "https://ethereum-magicians.org/",
  },
  {
    name: "EthResearch",
    description: "Research-first discussions on protocol design and roadmap ideas.",
    href: "https://ethresear.ch/",
  },
  {
    name: "GitHub Discussions",
    description: "Track proposal PRs and issue-level governance context.",
    href: "https://github.com/ethereum/EIPs",
  },
];

const whyEipsInsight = [
  {
    title: "Observability",
    description: "Track proposal progress, status changes, and editorial workload with clear views.",
    icon: Target,
  },
  {
    title: "Context",
    description: "Connect standards, PRs, and governance events to understand why changes happen.",
    icon: Lightbulb,
  },
  {
    title: "Coordination",
    description: "Support builders, editors, and researchers with shared operational visibility.",
    icon: Users,
  },
];

const deepLearningBlocks = [
  {
    title: "Monthly Insight",
    description: "Follow status changes by type and category with charts and detailed drilldowns.",
    href: "/insights",
  },
  {
    title: "Advanced Tooling",
    description: "Use editor trackers, PR/issue explorers, and dependency tooling for workflow clarity.",
    href: "/tools",
  },
  {
    title: "Detailed Proposal Database",
    description: "Explore proposal pages with status history, metadata, and linked governance activity.",
    href: "/standards",
  },
  {
    title: "Expert Analysis",
    description: "Read structured commentary on high-impact EIPs and protocol-level implications.",
    href: "/insights/editorial-commentary",
  },
  {
    title: "Community Engagement",
    description: "Join open discussions with contributors, researchers, and standards participants.",
    href: "https://ethereum-magicians.org/",
    external: true,
  },
  {
    title: "Educational Resources",
    description: "Start from fundamentals and progress into standards process and governance analytics.",
    href: "/resources/docs",
  },
];

const recommendedReading = [
  { title: "What Is an EIP?", href: "/resources/docs" },
  { title: "EIP Lifecycle (Draft to Final)", href: "/resources/docs" },
  { title: "How ERC Standards Work", href: "/erc" },
  { title: "Explore High-Impact EIPs", href: "/explore/trending" },
];

const partnerRoleMap: Record<string, string> = {
  EtherWorld: "Media & ecosystem amplification",
  "ECH (Ethereum Cat Herders)": "Coordination & standards operations",
};

const teamAvatarMap: Record<string, string> = {
  "Pooja Ranjan": "/team/pooja_ranjan.jpg",
  "Yash Kamal Chaturvedi": "/team/yash.jpg",
  "Dhanush Naik": "/team/Dhanush.jpg",
  "Ayush Shetty": "/team/ayush.jpg",
};

const grantBadgeTone: Record<string, string> = {
  significant: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
  medium: "border-blue-500/40 bg-blue-500/20 text-blue-300",
  small: "border-slate-500/40 bg-slate-500/20 text-slate-300",
};

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<FeaturedTab>("featured");

  const featuredByTab = useMemo(() => {
    const featured = featuredResources;
    const trending = [featuredResources[2], featuredResources[1], featuredResources[0], featuredResources[3]].filter(Boolean);
    const latest = [...featuredResources].reverse();
    return { featured, trending, latest };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <header>
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
              Ethereum Standards Knowledge Hub
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Learn EIPs/ERCs/RIPs from fundamentals to advanced governance analysis. Discover structured reading paths, deep resources, and ecosystem links in one place.
            </p>
          </header>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/resources/docs"
              className="inline-flex h-9 items-center rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition hover:bg-primary/15"
            >
              Understand EIP Process
            </Link>
            <Link
              href="/explore/trending"
              className="inline-flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Explore Trending Proposals
            </Link>
            <Link
              href="/tools/eip-builder"
              className="inline-flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Learn How To Write an EIP
            </Link>
            <Link
              href="/resources/videos"
              className="inline-flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Watch Explainers
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learning Paths</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Start Where You Are</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Guided paths for newcomers, contributors, and researchers.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {learningPaths.map((path) => (
              <div key={path.title} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{path.title}</h3>
                  <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {path.estimate}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
                <ul className="mt-3 space-y-1">
                  {path.links.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
                <Link
                  href={path.href}
                  className="mt-4 inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  Open path
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Reading</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Start Here First</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendedReading.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-lg border border-border bg-muted/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">Open guide →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resource Categories</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Learn, Docs, Media, Updates</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Pick a format quickly, then go deeper by topic and workflow.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {resourceCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="mb-3 inline-flex rounded-md border border-border bg-muted/60 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{category.group}</p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">{category.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                  <p className="mt-3 text-xs text-primary">{category.count} →</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Featured Content</p>
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">What To Read Next</h2>
            </div>
            <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5">
              {(["featured", "trending", "latest"] as FeaturedTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredByTab[activeTab].slice(0, 4).map((resource) => (
              <Link
                key={`${activeTab}-${resource.id}`}
                href={resource.link}
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {resource.type}
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">{resource.title}</h3>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{resource.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                  Open resource
                  <ExternalLink className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deep Learning</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Go Beyond Basics</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deepLearningBlocks.map((block) => (
              <Link
                key={block.title}
                href={block.href}
                target={block.external ? "_blank" : undefined}
                rel={block.external ? "noreferrer" : undefined}
                className="rounded-lg border border-border bg-muted/30 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
              >
                <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Join The Discussion</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {communityResources.map((resource) => (
              <a
                key={resource.name}
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
              >
                <h3 className="text-base font-semibold text-foreground">{resource.name}</h3>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {resource.name.includes("Magicians")
                    ? "Discussion forum"
                    : resource.name.includes("EthResearch")
                    ? "Research forum"
                    : "Code & governance activity"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                  Visit
                  <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why EIPsInsight Exists</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            EIPsInsight helps developers and researchers understand Ethereum standards through analytics, governance tracking, and contributor insights.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {whyEipsInsight.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="inline-flex rounded-md border border-border bg-muted/60 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">People Behind The Platform</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <div key={member.name} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/60 text-sm font-semibold text-foreground">
                    {teamAvatarMap[member.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={teamAvatarMap[member.name]} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      member.name.split(" ").map((n) => n[0]).join("")
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Active
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {member.github ? (
                    <a
                      href={`https://github.com/${member.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funding & Collaboration</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Support The Platform</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              EIPsInsight is an open analytics platform supported by grants, contributors, and ecosystem partners.
            </p>
          </div>
          <div className="space-y-3">
            {grants.map((grant) => (
              <div key={grant.id} className="rounded-xl border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{grant.title}</h3>
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", grantBadgeTone[grant.badge])}>
                    {grant.badge}
                  </span>
                  {grant.date ? (
                    <span className="inline-flex rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {grant.date}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{grant.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {grant.tags.map((tag) => (
                    <span key={tag} className="inline-flex rounded-md border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://github.com/AvarchLLC/eipsinsight-v4"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              Contribute on GitHub
            </a>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition hover:bg-primary/15">
              <HeartHandshake className="h-4 w-4" />
              Partner with Us
            </button>
            <a
              href="mailto:hello@eipsinsight.com?subject=Grant%20Proposal%20for%20EIPsInsight"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Suggest a Grant
            </a>
            <a
              href="mailto:hello@eipsinsight.com?subject=Sponsorship%20Inquiry%20for%20EIPsInsight"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              Sponsor Development
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partners</p>
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Ecosystem Partners</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Organizations supporting analytics, research, and coordination around Ethereum standards.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {partners.map((partner) => (
              <a
                key={partner.name}
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5"
              >
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {partner.name}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {partnerRoleMap[partner.name] || "Ecosystem support partner"}
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Need A Quick Start?</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/resources/docs" className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              Start with Docs
            </Link>
            <Link href="/insights" className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              Explore Insights
            </Link>
            <Link href="/tools" className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              Open Tooling
            </Link>
            <Link href="/feedback" className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground">
              Share Feedback
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
