'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  Github,
  GitPullRequest,
  Heart,
  Mail,
  MessageCircle,
  Network,
  Search,
  Settings2,
  Sparkles,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react';
import { team } from '@/data/resources/team';
import { TeamCard } from './team-card';
import { useCursorTrail } from '@/hooks/use-cursor-trail';

const GITHUB_REPO_URL = 'https://github.com/AvarchLLC/eipsinsight-v4';

const ROLE_CONTRIBUTIONS: Record<string, string> = {
  Founder: 'Shapes product direction and ecosystem strategy across protocol and governance intelligence.',
  'Operations Lead': 'Coordinates delivery, contributor workflows, and reliable updates across the platform.',
  'Full Stack Engineer': 'Builds core product systems spanning proposal indexing, UI experiences, and APIs.',
  'Full Stack Intern': 'Supports full stack delivery across frontend interfaces, backend services, and product improvements.',
  'Product Engineer': 'Designs user-facing features that make proposal history easier to navigate and understand.',
};

type TeamGlanceMetrics = {
  proposalsTracked: number;
  governancePrsOpen: number;
  upgradesMonitored: number;
  activeContributors180d: number;
};

function TeamNetworkOverlay() {
  const nodes = [
    { x: 12, y: 22 },
    { x: 36, y: 18 },
    { x: 64, y: 22 },
    { x: 88, y: 20 },
    { x: 24, y: 66 },
    { x: 52, y: 70 },
    { x: 78, y: 64 },
  ];

  const links: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [0, 4],
    [1, 4],
    [1, 5],
    [2, 5],
    [2, 6],
    [3, 6],
    [4, 5],
    [5, 6],
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-45"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {links.map(([start, end], index) => (
        <line
          key={`line-${start}-${end}-${index}`}
          x1={nodes[start].x}
          y1={nodes[start].y}
          x2={nodes[end].x}
          y2={nodes[end].y}
          stroke="rgba(56,189,248,0.2)"
          strokeWidth="0.24"
        />
      ))}

      {links.slice(0, 6).map(([start, end], index) => (
        <motion.circle
          key={`dot-${start}-${end}-${index}`}
          cx={nodes[start].x}
          cy={nodes[start].y}
          r="0.55"
          fill="rgba(103,232,249,0.85)"
          animate={{
            cx: [nodes[start].x, nodes[end].x, nodes[start].x],
            cy: [nodes[start].y, nodes[end].y, nodes[start].y],
            opacity: [0.15, 0.95, 0.15],
          }}
          transition={{
            duration: 7 + index,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {nodes.map((node, index) => (
        <circle key={`node-${index}`} cx={node.x} cy={node.y} r="0.9" fill="rgba(34,211,238,0.45)" />
      ))}
    </svg>
  );
}

function SectionDivider() {
  return (
    <div className="mx-auto my-4 h-px w-full max-w-6xl bg-linear-to-r from-transparent via-cyan-400/35 to-transparent" />
  );
}

export default function TeamPage() {
  useCursorTrail(true);

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 70]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.42]);

  const teamSectionRef = useRef<HTMLElement>(null);
  const spotlightRafRef = useRef<number | null>(null);

  const [isTeamSpotlightActive, setIsTeamSpotlightActive] = useState(false);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<TeamGlanceMetrics>({
    proposalsTracked: 0,
    governancePrsOpen: 0,
    upgradesMonitored: 0,
    activeContributors180d: 0,
  });


  const socialLinks = [
    { label: 'GitHub', href: GITHUB_REPO_URL, icon: Github },
    { label: 'Contact', href: 'mailto:dev@avarch.com', icon: Mail },
    { label: 'Discord', href: 'https://discord.com/invite/tUXgfV822C', icon: MessageCircle },
    { label: 'Donate', href: '/donate', icon: Heart },
  ];

  const platformMetrics = [
    {
      label: 'Proposals Tracked',
      value: metrics.proposalsTracked,
      hint: 'EIPs, ERCs, and RIPs indexed',
      icon: Search,
    },
    {
      label: 'Open Governance PRs',
      value: metrics.governancePrsOpen,
      hint: 'Across EIPs / ERCs / RIPs repositories',
      icon: GitPullRequest,
    },
    {
      label: 'Protocol Upgrades Monitored',
      value: metrics.upgradesMonitored,
      hint: 'Upgrade compositions and lifecycle context',
      icon: Workflow,
    },
    {
      label: 'Active Contributors (180d)',
      value: metrics.activeContributors180d,
      hint: 'Distinct participants in governance activity',
      icon: Users,
    },
  ];

  const whatWeBuild = [
    {
      title: 'EIP Explorer',
      description: 'Search and analyze EIPs, ERCs, and RIPs with status, category, and lifecycle context.',
      icon: Search,
    },
    {
      title: 'Upgrade Tracker',
      description: 'Monitor protocol upgrades, composition changes, and the proposal sets behind each fork.',
      icon: Settings2,
    },
    {
      title: 'Governance Insights',
      description: 'Understand proposal movement through PR states, review flow, and decision velocity trends.',
      icon: Network,
    },
    {
      title: 'Developer Tools',
      description: 'Use APIs and analysis workflows to integrate Ethereum standards intelligence into your stack.',
      icon: Wrench,
    },
  ];

  const values = [
    {
      title: 'Open Governance',
      description: 'We support transparent protocol development and make governance activity easier to inspect.',
    },
    {
      title: 'Protocol Clarity',
      description: 'We turn dense proposal history into readable, structured signals for builders and researchers.',
    },
    {
      title: 'Community Collaboration',
      description: "Built for the engineers, editors, and contributors shaping Ethereum's standards process.",
    },
    {
      title: 'Developer Empowerment',
      description: 'Our tools help teams reason about protocol changes quickly and with stronger context.',
    },
  ];

  useEffect(() => {
    let frameId: number | null = null;

    const onMouseMove = (event: MouseEvent) => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        setCursorOffset({ x, y });
        frameId = null;
      });
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/team-glance', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json()) as TeamGlanceMetrics;
        if (!ignore) setMetrics(payload);
      } catch {
        if (!ignore) {
          setMetrics({
            proposalsTracked: 0,
            governancePrsOpen: 0,
            upgradesMonitored: 0,
            activeContributors180d: 0,
          });
        }
      }
    };

    loadMetrics();
    return () => {
      ignore = true;
    };
  }, []);

  const handleTeamMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const section = teamSectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (spotlightRafRef.current) {
      cancelAnimationFrame(spotlightRafRef.current);
    }

    spotlightRafRef.current = requestAnimationFrame(() => {
      section.style.setProperty('--team-spot-x', `${x}px`);
      section.style.setProperty('--team-spot-y', `${y}px`);
    });
  };

  return (
    <div className="relative w-full overflow-hidden bg-black text-slate-100">
      <div className="fixed inset-0 -z-30 bg-linear-to-br from-slate-950 via-slate-950 to-slate-900" />

      <div className="pointer-events-none fixed inset-0 -z-20 opacity-35">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.07)_1px,transparent_1px)] bg-size-[56px_56px]" />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {[
          { left: '10%', top: '18%', size: 9, depth: 16, delay: 0.2 },
          { left: '28%', top: '68%', size: 8, depth: 22, delay: 0.8 },
          { left: '54%', top: '23%', size: 12, depth: 18, delay: 0.5 },
          { left: '73%', top: '62%', size: 10, depth: 25, delay: 1.1 },
          { left: '88%', top: '30%', size: 7, depth: 16, delay: 0.35 },
        ].map((node, index) => (
          <motion.div
            key={index}
            className="absolute rounded-full bg-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.75)]"
            style={{
              left: node.left,
              top: node.top,
              width: `${node.size}px`,
              height: `${node.size}px`,
              x: cursorOffset.x * node.depth,
              y: cursorOffset.y * node.depth,
            }}
            animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.15, 1] }}
            transition={{ duration: 4.6 + node.delay * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        <motion.div
          className="absolute -left-28 top-10 h-80 w-80 rounded-full bg-cyan-500/18 blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 28, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-violet-500/18 blur-3xl"
          animate={{ x: [0, -90, 0], y: [0, -36, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <motion.div
        className="fixed left-0 top-0 z-50 h-1 origin-left bg-linear-to-r from-cyan-400 via-blue-500 to-violet-500"
        style={{ scaleX: scrollYProgress }}
      />

      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative flex min-h-[86vh] items-center justify-center overflow-hidden px-4 pt-20"
      >
        <div className="relative z-20 mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08 }}
          >
            <motion.div
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-4 py-2 backdrop-blur-xl"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Team</span>
            </motion.div>

            <motion.h1
              className="mx-auto mb-7 max-w-4xl text-5xl font-black leading-[1.08] text-transparent sm:text-6xl md:text-7xl"
              style={{
                backgroundImage:
                  'linear-gradient(118deg, rgb(103 232 249), rgb(96 165 250), rgb(196 181 253), rgb(103 232 249))',
                backgroundSize: '220% 220%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                textShadow: '0 0 32px rgba(34, 211, 238, 0.18)',
              }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              The Builders Behind EIPs Insight
            </motion.h1>

            <motion.p
              className="mx-auto mb-9 max-w-3xl text-lg leading-relaxed text-slate-300 sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.16 }}
            >
              EIPs Insight helps developers explore, understand, and track Ethereum Improvement Proposals. We're a
              focused team of engineers and researchers building tools that make protocol evolution easier to follow.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.22 }}
            >
              <motion.a
                href="#team"
                whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(34,211,238,0.35)' }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 px-8 py-3 font-semibold text-white transition-all duration-300"
              >
                <Users className="h-4 w-4 text-cyan-400" />
                Meet the Team
              </motion.a>

              <motion.a
                href="/about"
                whileHover={{ scale: 1.04, borderColor: 'rgba(103,232,249,0.7)' }}
                whileTap={{ scale: 0.95 }}
                className="rounded-lg border border-cyan-300/40 px-8 py-3 font-semibold text-cyan-200 transition-all duration-300 hover:bg-cyan-500/8"
              >
                About Us
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-9 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-cyan-300/35 p-2">
            <motion.div className="h-2 w-1 rounded-full bg-cyan-300" />
          </div>
        </motion.div>
      </motion.div>

      <section
        id="team"
        ref={teamSectionRef}
        onMouseMove={handleTeamMouseMove}
        onMouseEnter={() => setIsTeamSpotlightActive(true)}
        onMouseLeave={() => setIsTeamSpotlightActive(false)}
        className="relative z-10 px-4 py-20 sm:px-6 lg:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity: isTeamSpotlightActive ? 1 : 0,
            background:
              'radial-gradient(360px circle at var(--team-spot-x,50%) var(--team-spot-y,50%), rgba(34,211,238,0.12), transparent 60%)',
          }}
        />

        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45 }}
            className="mb-14 text-center"
          >
            <h2 className="mb-5 text-4xl font-black text-transparent sm:text-5xl bg-linear-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text">
              Meet the Core Team
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-300/90">
              A small but passionate group of developers and researchers building tools that make Ethereum governance
              and protocol development easier to navigate.
            </p>
          </motion.div>

          <div className="relative isolate mb-6">
            <TeamNetworkOverlay />
            <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {team.map((member, index) => (
                <TeamCard
                  key={member.name}
                  {...member}
                  index={index}
                  contribution={
                    member.bio ??
                    ROLE_CONTRIBUTIONS[member.role] ??
                    'Contributes to proposal intelligence workflows that help developers reason about Ethereum changes.'
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative z-10 px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.42 }}
          >
            <h2 className="mb-3 text-3xl font-black text-transparent sm:text-4xl bg-linear-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text">
              Platform at a Glance
            </h2>
            <p className="max-w-3xl text-slate-300/85">
              Live signals from the platform&apos;s indexing and governance data pipeline.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, staggerChildren: 0.09 }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {platformMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="group relative rounded-2xl border border-cyan-300/20 bg-linear-to-br from-slate-900/85 to-slate-950/90 p-6 backdrop-blur-xl"
                >
                  <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-cyan-500/6 to-violet-500/6 opacity-0 transition-opacity duration-250 group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex rounded-lg border border-cyan-300/30 bg-cyan-500/12 p-2.5 text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mb-2 text-sm text-slate-300/80">{metric.label}</p>
                    <div className="mb-2 text-3xl font-bold text-transparent bg-linear-to-r from-cyan-200 to-blue-300 bg-clip-text">
                      {metric.value.toLocaleString()}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">{metric.hint}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative z-10 px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.42 }}
          >
            <h2 className="mb-3 text-3xl font-black text-transparent sm:text-4xl bg-linear-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text">
              What We&apos;re Building
            </h2>
            <p className="max-w-3xl text-slate-300/85">
              EIPs Insight is a developer-focused intelligence layer for Ethereum standards and governance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {whatWeBuild.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-xl border border-cyan-300/20 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-6"
                >
                  <div className="absolute inset-0 rounded-xl bg-linear-to-br from-cyan-500/7 to-violet-500/7 opacity-0 transition-opacity duration-250 group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-4 inline-flex rounded-lg border border-cyan-300/35 bg-cyan-500/12 p-2.5 text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-100">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-300/82">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative z-10 px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.42 }}
          >
            <h2 className="mb-3 text-3xl font-black text-transparent sm:text-4xl bg-linear-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text">
              Values in Practice
            </h2>
            <p className="max-w-3xl text-slate-300/85">
              The principles guiding how we build, ship, and collaborate with the Ethereum ecosystem.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.38, delay: index * 0.08 }}
                className="group relative rounded-xl border border-cyan-300/20 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-6"
              >
                <div className="absolute inset-0 rounded-xl bg-linear-to-br from-cyan-500/7 to-violet-500/7 opacity-0 transition-opacity duration-250 group-hover:opacity-100" />
                <div className="relative z-10">
                  <h3 className="mb-2 text-base font-semibold text-cyan-200">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300/82">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SectionDivider />

      <section className="relative z-10 px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="group relative overflow-hidden rounded-2xl border border-cyan-300/30 bg-linear-to-br from-slate-900/85 via-slate-900/75 to-slate-950/90 p-10 text-center backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-linear-to-br from-cyan-500/11 to-violet-500/11 opacity-0 transition-opacity duration-350 group-hover:opacity-100" />

            <div className="relative z-10">
              <h3 className="mb-4 text-3xl font-black text-transparent bg-linear-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text">
                Join the Builders
              </h3>

              <p className="mx-auto mb-8 max-w-2xl text-slate-300/86">
                We welcome contributors, developers, and researchers who want to make Ethereum protocol development
                more visible and accessible.
              </p>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <motion.a
                      key={link.label}
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noreferrer' : undefined}
                      whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-100 transition-all duration-200 hover:bg-cyan-500/20"
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </motion.a>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-cyan-300/10 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-between gap-6 text-sm text-slate-400 sm:flex-row"
          >
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-cyan-300">
              ← Back to Home
            </Link>

            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/about" className="transition-colors hover:text-cyan-300">
                About
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-cyan-300">
                Pricing
              </Link>
              <Link href="/api-tokens" className="transition-colors hover:text-cyan-300">
                API
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-cyan-300">
                Privacy
              </Link>
            </div>

            <p className="text-slate-500">© 2026 EIPs Insight. All rights reserved.</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}

