'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { team } from '@/data/resources/team';
import { grants } from '@/data/resources/grants';
import { partners } from '@/data/resources/partners';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Code,
  ExternalLink,
  FileText,
  Github,
  Globe,
  Heart,
  LayoutDashboard,
  Linkedin,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  Target,
  Twitter,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react';

const badgeColors: Record<string, string> = {
  significant: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  medium: 'border-blue-500/40 bg-blue-500/20 text-blue-700 dark:text-blue-300',
  small: 'border-border bg-muted/40 text-muted-foreground',
};

const partnerLogos: Record<string, string> = {
  EtherWorld: '/brand/partners/ew.png',
  'ECH (Ethereum Cat Herders)': '/brand/partners/ech.png',
};

const teamAvatarMap: Record<string, string> = {
  'Pooja Ranjan': '/team/pooja_ranjan.jpg',
  'Yash Kamal Chaturvedi': '/team/yash.jpg',
  'Dhanush Naik': '/team/Dhanush.jpg',
  'Ayush Shetty': '/team/ayush.jpg',
};

const teamContext: Record<string, { focus: string; summary: string }> = {
  'Pooja Ranjan': {
    focus: 'Ecosystem strategy',
    summary: 'Shapes the long-range direction of EIPsInsight and keeps the work anchored to Ethereum governance needs.',
  },
  'Yash Kamal Chaturvedi': {
    focus: 'Operations and delivery',
    summary: 'Keeps programs, coordination, and day-to-day execution moving across research, platform work, and partnerships.',
  },
  'Dhanush Naik': {
    focus: 'Platform engineering',
    summary: 'Builds the product surface, analytics experience, and internal systems that turn raw governance data into usable tooling.',
  },
  'Ayush Shetty': {
    focus: 'Product systems',
    summary: 'Designs product flows and interaction models that make complex standards and governance data easier to read and act on.',
  },
};

const productSurfaces = [
  {
    title: 'Search and discovery',
    description: 'Search proposals, people, and governance events with structured filters instead of manual repository digging.',
    icon: Search,
  },
  {
    title: 'Analytics and monitoring',
    description: 'Track lifecycle movement, editorial load, PR activity, and standards composition through dashboards and timelines.',
    icon: BarChart3,
  },
  {
    title: 'Workflow tooling',
    description: 'Use boards, dependency maps, builders, and explorer views to move from reading governance to working with it.',
    icon: Wrench,
  },
  {
    title: 'Context and commentary',
    description: 'Pair raw data with commentary, docs, videos, and news so the platform stays useful for both learning and operations.',
    icon: FileText,
  },
];

const valuePoints = [
  {
    title: 'Transparency',
    description: 'Data should be inspectable, explainable, and tied back to real public sources.',
    icon: Shield,
  },
  {
    title: 'Operational clarity',
    description: 'Governance tooling should help people decide and act, not just display charts.',
    icon: Workflow,
  },
  {
    title: 'Accessibility',
    description: 'The platform has to work for newcomers, editors, builders, and researchers without flattening complexity.',
    icon: Globe,
  },
  {
    title: 'Iteration',
    description: 'We ship, evaluate, and refine quickly so the product stays aligned with how Ethereum governance actually behaves.',
    icon: Sparkles,
  },
];

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/AvarchLLC/eipsinsight-v4', icon: Github },
  { label: 'Discord', href: 'https://discord.com/invite/tUXgfV822C', icon: MessageCircle },
  { label: 'Donate', href: '/donate', icon: Heart, internal: true },
  { label: 'Contact', href: 'mailto:dev@avarch.com', icon: Users },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            About
          </div>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            EIPsInsight turns Ethereum standards activity into something people can actually navigate.
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            We build an operational view of EIPs, ERCs, RIPs, proposal workflows, and governance movement so builders, editors, researchers, and newcomers can understand what is changing and why.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Mission</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">Make Ethereum standards and governance legible, explorable, and operationally useful.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What We Track</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">EIPs, ERCs, RIPs, PR activity, editor workflows, contributor graphs, and status transitions.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why It Exists</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">Because governance data is public, but still too fragmented for most people to work with efficiently.</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Built By</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">Avarch with support from the Ethereum ecosystem and partners close to standards operations.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why We Built This</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Standards and governance should not require institutional memory to follow.
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Ethereum governance happens across repositories, pull requests, review queues, forum threads, upgrades, and informal coordination. The data is public, but the workflow is still hard to inspect as a system.
              </p>
              <p>
                EIPsInsight exists to reduce that gap. We aggregate the moving parts, normalize them into product surfaces, and help people answer practical questions: what changed, what is stuck, who is active, what upgrade work depends on what, and where to go next.
              </p>
              <p>
                The goal is not just more charts. The goal is operational clarity for anyone trying to understand or participate in Ethereum standards.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How People Use It</p>
            <div className="mt-4 space-y-4">
              {productSurfaces.map((surface) => {
                const Icon = surface.icon;
                return (
                  <div key={surface.title} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{surface.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{surface.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              A compact team working across strategy, operations, engineering, and product systems.
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              We are not a giant organization. The product is shaped by a small group with distinct responsibilities, which is exactly why role clarity matters here.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {team.map((member) => {
              const profile = teamContext[member.name];
              const avatar = member.avatar ?? teamAvatarMap[member.name];
              const initials = member.name.split(' ').map((name) => name[0]).join('');

              return (
                <article key={member.name} className="rounded-xl border border-border bg-muted/20 p-5 transition-all hover:border-primary/40 hover:bg-card/80">
                  <div className="flex items-start gap-4">
                    {avatar ? (
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                        <Image src={avatar} alt={member.name} width={64} height={64} className="h-16 w-16 object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-base font-semibold text-primary">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                        <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted/40 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {member.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {profile?.focus ?? 'Team focus'}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {profile?.summary ?? member.bio ?? 'Contributes to the product, infrastructure, and delivery behind EIPsInsight.'}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {member.github && (
                          <a
                            href={`https://github.com/${member.github}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Github className="h-3.5 w-3.5" />
                            GitHub
                          </a>
                        )}
                        {member.twitter && (
                          <a
                            href={`https://x.com/${member.twitter}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Twitter className="h-3.5 w-3.5" />
                            X
                          </a>
                        )}
                        <a
                          href={member.linkedin ?? 'https://www.linkedin.com/company/avarch'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        >
                          <Linkedin className="h-3.5 w-3.5" />
                          LinkedIn
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Values</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              The product is opinionated about clarity.
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {valuePoints.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">What The Platform Offers</p>
            <div className="mt-5 space-y-4">
              {[
                { title: 'Search and proposal context', icon: Search, body: 'Find proposals, statuses, authors, and governance links without jumping across disconnected sources.' },
                { title: 'Dashboards and analytics', icon: LayoutDashboard, body: 'Read standards, PRs, editor activity, and lifecycle health through structured analytics views.' },
                { title: 'Governance event tracking', icon: Bell, body: 'Follow status changes, backlogs, transitions, and proposal movement over time.' },
                { title: 'Tooling for active work', icon: Code, body: 'Use builders, boards, trackers, and dependency graphs when you need to move from reading to doing.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Support</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Backed by grants, community support, and ecosystem collaboration.
            </h2>
            <div className="mt-5 grid gap-4">
              {grants.map((grant) => (
                <article key={grant.id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="max-w-2xl">
                      <h3 className="text-base font-semibold text-foreground">{grant.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{grant.description}</p>
                    </div>
                    <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-wider ${badgeColors[grant.badge]}`}>
                      {grant.badge}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {grant.tags.map((tag) => (
                      <span key={tag} className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3 text-[11px] font-medium text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                    {grant.date && (
                      <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-3 text-[11px] font-medium text-muted-foreground">
                        {grant.date}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Partners</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Working alongside ecosystem operators and media.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              These relationships help distribution, coordination, and visibility around the work happening in Ethereum standards.
            </p>

            <div className="mt-5 space-y-4">
              {partners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-card/80"
                >
                  {partnerLogos[partner.name] ? (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-border bg-card">
                      <Image src={partnerLogos[partner.name]} alt={partner.name} width={72} height={32} className="h-8 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-foreground">
                      {partner.name.slice(0, 2)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">{partner.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {partner.name === 'EtherWorld'
                        ? 'Media and ecosystem amplification for standards and governance coverage.'
                        : 'Coordination and operational support around Ethereum standards processes.'}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Get Involved</p>
          <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Support the platform, contribute feedback, or build on top of the work.
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            EIPsInsight is a community resource. If you want to help, the best paths are straightforward: use it, critique it, contribute to it, or support the infrastructure behind it.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              const classes = 'inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary';

              if (item.internal) {
                return (
                  <Link key={item.label} href={item.href} className={classes}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              }

              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                  className={classes}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Policy</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Legal and privacy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We keep the legal and privacy layer explicit. Use these documents when you need the operational details behind account, data, and platform usage.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/privacy" className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 text-sm font-medium text-primary transition-all hover:bg-primary/15">
                Privacy Policy
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/terms" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
                Terms of Service
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
            <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Reach the team
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For collaboration, platform questions, or product feedback, contact us directly.
            </p>
            <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
              <a href="mailto:dev@avarch.com" className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80">
                dev@avarch.com
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
