'use client';

import React from 'react';
import { ArrowRight, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import EthStandard from './_components/ethstandard';
import ProtocolBento from './_components/protocol-bento';
import GovernanceOverTime from './_components/governance-over-time';
import OurTools from './_components/our-tools';
import LogoCloud from '@/components/logo-cloud';
import TrendingProposals from './_components/trending-proposals';
import LatestUpdates from './_components/latest-updates';
import SocialCommunityUpdates from './_components/social-community-updates';
import FAQs from './_components/faqs';
import { PersonaNudgeBanner } from '@/components/persona-nudge-banner';

export default function EIPsInsightHero() {
  return (
    <div className="bg-background relative w-full overflow-hidden">
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.06),_transparent_70%)]" />
        <div className="absolute top-0 left-1/2 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-400/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-5xl text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 flex justify-center"
          >
            <div className="inline-flex items-center rounded-full border border-cyan-300/40 bg-white/80 px-3 py-1 text-sm backdrop-blur-sm dark:border-cyan-300/30 dark:bg-black/70">
              <span className="mr-2 rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">
                Live
              </span>
              <span className="text-cyan-700 dark:text-cyan-200">
                Ethereum Standards Intelligence Platform
              </span>
              <ChevronRight className="ml-1 h-4 w-4 text-cyan-700 dark:text-cyan-200" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="dec-title text-balance bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Making Ethereum Proposals Accessible
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-4 text-xl font-medium text-slate-700 dark:text-slate-200"
          >
            Tracking progress. Shaping Ethereum.
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300"
          >
            EIPsInsight provides clear, visual tools for exploring, analyzing,
            and contributing to Ethereum Improvement Proposals. Follow EIPs,
            ERCs, and RIPs across their full lifecycle with clarity and context.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-7 text-slate-900 shadow-lg transition-all duration-300 hover:from-cyan-400 hover:to-blue-500 hover:text-white"
            >
              <Link href="/dashboard">
                <span className="relative z-10 flex items-center">
                  Explore Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-300/80 via-cyan-400/80 to-blue-400/80 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="flex items-center gap-2 rounded-full border-cyan-300/60 bg-white/80 text-cyan-700 backdrop-blur-sm hover:bg-cyan-400/10 hover:text-cyan-800 dark:bg-black/30 dark:text-cyan-100 dark:hover:text-white"
            >
              <Link href="/eips">
                <Layers className="h-4 w-4" />
                Browse Proposals
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="lg"
              className="rounded-full text-cyan-700 hover:bg-cyan-500/10 hover:text-cyan-800 dark:text-cyan-200 dark:hover:text-white"
            >
              <Link href="/learn">
                <BookOpen className="mr-2 h-4 w-4" />
                Learn about EIPs
              </Link>
            </Button>
          </motion.div>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="mt-12"
          >
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border border-cyan-300/30 bg-white/70 px-4 py-3 text-xs text-slate-600 backdrop-blur-sm dark:border-cyan-300/20 dark:bg-black/30 dark:text-slate-400">
              <span className="text-slate-700 dark:text-slate-300">Built for the Ethereum ecosystem</span>
              <span className="rounded-full border border-emerald-300/50 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:border-emerald-300/30 dark:text-emerald-200">EIPs</span>
              <span className="rounded-full border border-cyan-300/50 bg-cyan-500/10 px-3 py-1 text-cyan-700 dark:border-cyan-300/30 dark:text-cyan-200">ERCs</span>
              <span className="rounded-full border border-blue-300/50 bg-blue-500/10 px-3 py-1 text-blue-700 dark:border-blue-300/30 dark:text-blue-200">RIPs</span>
              <span className="rounded-full border border-slate-300/60 bg-slate-500/10 px-3 py-1 text-slate-700 dark:border-slate-300/30 dark:text-slate-200">Governance</span>
            </div>
          </motion.div>

          {/* Persona Nudge Banner - gentle prompt for new users */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.5 }}
            className="mt-8"
          >
            <PersonaNudgeBanner variant="card" className="mx-auto max-w-md" />
          </motion.div>
          
        </div>
      </div>

      {/* Themed Section Separator */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center py-2">
          {/* Center glow effect */}
          
          {/* Decorative line with gradient - Positioned below glow */}
          <div className="absolute inset-x-0 flex items-center translate-y-2">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>

      <ProtocolBento />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>

      {/* <GovernanceBottlenecks /> */}
      <GovernanceOverTime />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <TrendingProposals />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <OurTools />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>


      <LogoCloud />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <EthStandard />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <LatestUpdates />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <SocialCommunityUpdates />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-center">
          {/* Decorative line with gradient */}
          <div className="absolute inset-x-0 flex items-center -translate-y-1">
            <div className="w-full border-t border-cyan-400/20" />
          </div>
        </div>
      </div>
      
      <FAQs />
    </div>
  );
}
