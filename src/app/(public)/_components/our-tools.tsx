"use client";

import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  BarChart3,
  Trophy,
  LayoutDashboard,
  Search,
  FileText,
  Wrench,
  MessageSquare,
  BookOpen,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/header";

// Featured tools - larger, more prominent
const featuredTools = [
  {
    name: "Analytics",
    description: "Deep dive into EIP trends, contributor activity, and governance patterns with comprehensive charts and insights",
    icon: BarChart3,
    href: "/analytics",
    color: "cyan",
    size: "large",
  },
  {
    name: "Editors Leaderboard",
    description: "Discover the top contributors and maintainers shaping Ethereum's future through their editorial work",
    icon: Trophy,
    href: "/editors",
    color: "emerald",
    size: "large",
  },
];

// Primary tools - standard cards
const primaryTools = [
  {
    name: "Boards",
    description: "Visual kanban-style boards tracking proposal status and activity",
    icon: LayoutDashboard,
    href: "/boards",
    color: "blue",
  },
  {
    name: "Search by Author",
    description: "Find all proposals from specific contributors",
    icon: Search,
    href: "/search",
    color: "violet",
  },
  {
    name: "All EIPs",
    description: "Complete repository of Ethereum standards",
    icon: FileText,
    href: "/eips",
    color: "cyan",
  },
  {
    name: "Proposal Builder",
    description: "Tools to create and validate new proposals",
    icon: Wrench,
    href: "/builder",
    color: "emerald",
  },
];

// Quick links - compact cards
const quickLinks = [
  {
    name: "Feedback",
    description: "Share suggestions",
    icon: MessageSquare,
    href: "/feedback",
    color: "amber",
  },
  {
    name: "Resources",
    description: "Learn more",
    icon: BookOpen,
    href: "/resources",
    color: "blue",
  },
  {
    name: "Did You Know",
    description: "Fun facts",
    icon: Lightbulb,
    href: "/did-you-know",
    color: "violet",
  },
];

const getColorClasses = (color: string, featured: boolean = false) => {
  const colors: Record<string, { 
    border: string; 
    bg: string; 
    gradient: string;
    icon: string; 
    iconBg: string;
    hover: string;
    shadow: string;
  }> = {
    emerald: {
      border: "border-emerald-400/30",
      bg: "bg-emerald-500/10",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      icon: "text-emerald-300",
      iconBg: "bg-emerald-500/20",
      hover: "hover:border-emerald-400/60 hover:shadow-emerald-500/20",
      shadow: "shadow-lg hover:shadow-2xl",
    },
    cyan: {
      border: "border-cyan-400/30",
      bg: "bg-cyan-500/10",
      gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
      icon: "text-cyan-300",
      iconBg: "bg-cyan-500/20",
      hover: "hover:border-cyan-400/60 hover:shadow-cyan-500/20",
      shadow: "shadow-lg hover:shadow-2xl",
    },
    blue: {
      border: "border-blue-400/30",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      icon: "text-blue-300",
      iconBg: "bg-blue-500/20",
      hover: "hover:border-blue-400/60 hover:shadow-blue-500/20",
      shadow: "shadow-lg hover:shadow-2xl",
    },
    violet: {
      border: "border-violet-400/30",
      bg: "bg-violet-500/10",
      gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
      icon: "text-violet-300",
      iconBg: "bg-violet-500/20",
      hover: "hover:border-violet-400/60 hover:shadow-violet-500/20",
      shadow: "shadow-lg hover:shadow-2xl",
    },
    amber: {
      border: "border-amber-400/30",
      bg: "bg-amber-500/10",
      gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      icon: "text-amber-300",
      iconBg: "bg-amber-500/20",
      hover: "hover:border-amber-400/60 hover:shadow-amber-500/20",
      shadow: "shadow-lg hover:shadow-2xl",
    },
  };
  return colors[color] || colors.cyan;
};

export default function OurTools() {
  return (
    <>
      <PageHeader
        indicator={{ icon: "sparkles", label: "Tools", pulse: false }}
        title="Tools & Resources"
        description="Everything you need to explore, analyze, and contribute to Ethereum standards"
        sectionId="our-tools"
        className="bg-slate-950/30"
      />
      <section className="relative w-full bg-slate-950/30 py-6 sm:py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Featured Tools - Hero Cards */}
          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {featuredTools.map((tool, index) => {
              const colors = getColorClasses(tool.color, true);
              const Icon = tool.icon;

              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    href={tool.href}
                    className={`group relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border ${colors.border} bg-linear-to-br ${colors.gradient} p-5 sm:p-6 backdrop-blur transition-all duration-500 ${colors.hover} ${colors.shadow} hover:scale-[1.02] bg-dot-white/[0.02]`}
                  >
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-linear-to-br ${colors.gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30`} />
                    
                    <div className="relative z-10 flex h-full flex-col">
                      {/* Header */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className={`rounded-xl ${colors.iconBg} p-3 border ${colors.border} shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                          <Icon className={`h-6 w-6 ${colors.icon} drop-shadow-md`} />
                        </div>
                        <ArrowRight className={`h-5 w-5 text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-${tool.color}-400`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="mb-2 text-xl font-bold text-white transition-all duration-300 group-hover:tracking-tight">
                          {tool.name}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
                          {tool.description}
                        </p>
                      </div>

                      {/* Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full ${colors.iconBg} px-3 py-1 text-[10px] font-semibold ${colors.icon} uppercase tracking-wider border ${colors.border}`}>
                          Featured
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Primary Tools - 4-Column Grid */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {primaryTools.map((tool, index) => {
              const colors = getColorClasses(tool.color);
              const Icon = tool.icon;

              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Link
                    href={tool.href}
                    className={`group relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-xl border ${colors.border} bg-linear-to-br ${colors.gradient} p-4 backdrop-blur transition-all duration-300 ${colors.hover} ${colors.shadow} hover:scale-[1.03] bg-dot-white/[0.02]`}
                  >
                    {/* Subtle glow */}
                    <div className={`absolute inset-0 bg-linear-to-br ${colors.gradient} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-20`} />
                    
                    <div className="relative z-10 flex h-full flex-col">
                      {/* Icon */}
                      <div className="mb-3">
                        <div className={`inline-flex rounded-lg ${colors.iconBg} p-2.5 border ${colors.border} shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg`}>
                          <Icon className={`h-5 w-5 ${colors.icon}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="mb-1.5 text-base font-bold text-slate-100 transition-colors group-hover:text-white">
                          {tool.name}
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-400 transition-colors group-hover:text-slate-300">
                          {tool.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="mt-2 flex justify-end">
                        <ArrowRight className={`h-4 w-4 ${colors.icon} opacity-0 -translate-x-2 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100`} />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Links - Compact 3-Column Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickLinks.map((tool, index) => {
              const colors = getColorClasses(tool.color);
              const Icon = tool.icon;

              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    href={tool.href}
                    className={`group relative flex h-full min-h-[90px] items-center gap-3 overflow-hidden rounded-lg border ${colors.border} bg-linear-to-r ${colors.gradient} px-4 py-3 backdrop-blur transition-all duration-300 ${colors.hover} hover:shadow-lg hover:scale-[1.02]`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 rounded-lg ${colors.iconBg} p-2.5 border ${colors.border} transition-all duration-300 group-hover:scale-110`}>
                      <Icon className={`h-5 w-5 ${colors.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 transition-colors group-hover:text-white mb-0.5">
                        {tool.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 transition-colors group-hover:text-slate-400">
                        {tool.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className={`h-4 w-4 shrink-0 ${colors.icon} opacity-50 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100`} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
