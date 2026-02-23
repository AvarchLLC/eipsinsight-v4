"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  FileText,
  Video,
  Newspaper,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Github,
  ExternalLink,
  Users,
  Target,
  Lightbulb,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { team } from "@/data/resources/team";
import { grants } from "@/data/resources/grants";
import { partners } from "@/data/resources/partners";
import { featuredResources } from "@/data/resources/featured";

// ──────── Resource Categories ────────
const resourceCategories = [
  {
    title: "FAQ",
    description: "Common questions about EIPs and governance.",
    icon: HelpCircle,
    href: "/resources/faq",
    color: "cyan",
  },
  {
    title: "Blogs",
    description: "Deep dives and explainers.",
    icon: FileText,
    href: "/resources/blogs",
    color: "emerald",
  },
  {
    title: "Videos",
    description: "Talks, walkthroughs, and explainers.",
    icon: Video,
    href: "/resources/videos",
    color: "purple",
  },
  {
    title: "News",
    description: "Latest updates in the EIP ecosystem.",
    icon: Newspaper,
    href: "/resources/news",
    color: "amber",
  },
  {
    title: "Documentation",
    description: "Official specs and guides.",
    icon: BookOpen,
    href: "/resources/docs",
    color: "blue",
  },
];

const colorClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  cyan: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]",
  },
  amber: {
    bg: "bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]",
  },
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/40",
    glow: "hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
};

const badgeColors: Record<string, string> = {
  significant: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
  small: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40",
};

export default function ResourcesPage() {
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const nextFeatured = () => {
    setFeaturedIndex((prev) => (prev + 1) % featuredResources.length);
  };

  const prevFeatured = () => {
    setFeaturedIndex((prev) =>
      prev === 0 ? featuredResources.length - 1 : prev - 1
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ──── Hero ──── */}
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-4">
            Resources
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-3xl">
            Learn, explore, and stay updated with Ethereum improvements. Explore FAQs, blogs, videos, news, and documentation to deepen your understanding of EIPs, ERCs, and RIPs.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 space-y-20">
        {/* ──── Section 1: Resource Categories ──── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {resourceCategories.map((category) => {
              const Icon = category.icon;
              const colors = colorClasses[category.color];
              return (
                <Link
                  key={category.title}
                  href={category.href}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm transition-all duration-300",
                    "hover:-translate-y-1",
                    colors.border,
                    colors.glow
                  )}
                >
                  <div className={cn("rounded-full p-3 mb-4 inline-flex", colors.bg)}>
                    <Icon className={cn("h-6 w-6", colors.text)} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {category.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {category.description}
                  </p>
                  <span className={cn("text-xs font-medium", colors.text)}>
                    Browse →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ──── Section 2: Featured Content ──── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Featured Content</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevFeatured}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700/50 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextFeatured}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700/50 transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredResources.map((resource, index) => {
              const isVisible = index === featuredIndex || index === (featuredIndex + 1) % featuredResources.length || index === (featuredIndex + 2) % featuredResources.length || index === (featuredIndex + 3) % featuredResources.length;
              
              if (!isVisible) return null;

              const typeColors: Record<string, string> = {
                blog: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
                video: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40",
                news: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40",
                doc: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40",
              };

              return (
                <Link
                  key={resource.id}
                  href={resource.link}
                  className="group rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-lg"
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border mb-3",
                      typeColors[resource.type]
                    )}
                  >
                    {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 group-hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {resource.description}
                  </p>
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                    {resource.type === "video" ? "Watch" : "Read"} →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ──── Section 3: About EIPsInsight ──── */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-8 md:p-12 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            About EIPsInsight
          </h2>
          <p className="text-slate-700 dark:text-slate-300 text-center max-w-3xl mx-auto mb-8 leading-relaxed">
            We specialize in tools designed to provide clear, visual insights into the activity of Ethereum Improvement Proposals (EIPs), Ethereum Request for Comments (ERCs), and Rollup Improvement Proposals (RIPs). Our platform tracks progress, governance signals, and workload distribution among EIP Editors.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="rounded-full bg-cyan-500/20 p-4 inline-flex mb-3">
                <Target className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Observability
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                See what&apos;s happening across standards.
              </p>
            </div>
            <div className="text-center">
              <div className="rounded-full bg-emerald-500/20 p-4 inline-flex mb-3">
                <Lightbulb className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Context
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Understand why things change.
              </p>
            </div>
            <div className="text-center">
              <div className="rounded-full bg-purple-500/20 p-4 inline-flex mb-3">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Coordination
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Help editors and contributors collaborate.
              </p>
            </div>
          </div>
        </section>

        {/* ──── Section 4: Our Team ──── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Our Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member) => (
              <div
                key={member.name}
                className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm text-center"
              >
                <div className="rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-500/20 to-purple-500/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-900 dark:text-white border border-slate-600">
                  {member.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{member.role}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                  {member.github && (
                    <a
                      href={`https://github.com/${member.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ──── Section 5: Support EIPsInsight ──── */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Support EIPsInsight
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              We welcome contributions, partnerships, and funding opportunities.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {grant.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                        badgeColors[grant.badge]
                      )}
                    >
                      {grant.badge.charAt(0).toUpperCase() + grant.badge.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {grant.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{grant.description}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://github.com/AvarchLLC/EIPsInsight"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <Github className="h-4 w-4" />
              Contribute on GitHub
            </a>
            <button className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-900 dark:text-white bg-cyan-500/20 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-400 transition-colors">
              <Heart className="h-4 w-4" />
              Partner with Us
            </button>
          </div>
        </section>

        {/* ──── Section 6: Our Partners ──── */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Our Partners
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {partners.map((partner) => (
              <a
                key={partner.name}
                href={partner.website}
                target="_blank"
                rel="noreferrer"
                className="group rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm hover:border-slate-600 transition-all hover:shadow-lg"
              >
                <p className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors flex items-center gap-2">
                  {partner.name}
                  <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </a>
            ))}
            <button className="rounded-xl border border-dashed border-slate-600 bg-slate-900/20 p-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-500 transition-colors">
              <p className="text-sm font-medium">+ Become a partner</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
