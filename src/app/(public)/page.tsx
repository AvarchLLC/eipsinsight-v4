'use client';

import React from 'react';
import { ArrowRight, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import EthStandard from './_components/ethstandard';
import ProtocolBento from './_components/protocol-bento';
import ProposalStructure from './_components/proposal-structure';
import GovernanceBottlenecks from './_components/governance-bottlenecks';
import GovernanceOverTime from './_components/governance-over-time';
import OurTools from './_components/our-tools';
import LogoCloud from '@/components/logo-cloud';
import TrendingProposals from './_components/trending-proposals';
import LatestUpdates from './_components/latest-updates';
import FAQs from './_components/faqs';
import { PersonaNudgeBanner } from '@/components/persona-nudge-banner';

export default function EIPsInsightHero() {
  return (
    <div className="bg-background relative w-full overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.18),_transparent_60%)]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
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
            <div className="inline-flex items-center rounded-full border border-cyan-300/30 bg-black/70 px-3 py-1 text-sm backdrop-blur-sm">
              <span className="mr-2 rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">
                Live
              </span>
              <span className="text-cyan-200">
                Ethereum Standards Intelligence Platform
              </span>
              <ChevronRight className="ml-1 h-4 w-4 text-cyan-200" />
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="dec-title text-balance bg-gradient-to-br from-emerald-300 via-slate-100 to-cyan-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Making Ethereum Proposals Accessible
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-4 text-xl font-medium text-slate-200"
          >
            Tracking progress. Shaping Ethereum.
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300"
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
              className="flex items-center gap-2 rounded-full border-cyan-300/60 bg-black/30 text-cyan-100 backdrop-blur-sm hover:bg-cyan-400/10 hover:text-white"
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
              className="rounded-full text-cyan-200 hover:bg-cyan-500/10 hover:text-white"
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
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-xl border border-cyan-300/20 bg-black/30 px-4 py-3 text-xs text-slate-400 backdrop-blur-sm">
              <span className="text-slate-300">Built for the Ethereum ecosystem</span>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-emerald-200">EIPs</span>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-cyan-200">ERCs</span>
              <span className="rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-blue-200">RIPs</span>
              <span className="rounded-full border border-slate-300/30 bg-slate-400/10 px-3 py-1 text-slate-200">Governance</span>
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
      
      <FAQs />
    </div>
  );
}
