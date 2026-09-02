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
  ExternalLink,
  FileText,
  Github,
  Heart,
  Linkedin,
  MessageCircle,
  Search,
  Twitter,
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

const teamContext: Record<string, { focus: string }> = {
  'Pooja Ranjan': { focus: 'Ecosystem strategy' },
  'Yash Kamal Chaturvedi': { focus: 'Operations & delivery' },
  'Dhanush Naik': { focus: 'Platform engineering' },
  'Ayush Shetty': { focus: 'Product systems' },
  'Subhrajeet Bhattacharjee': { focus: 'Full-stack implementation' },
};

// One feature list — what the platform actually does.
const whatWeDo = [
  { title: 'Search & discovery', icon: Search, description: 'Find proposals, people, and governance events with structured filters instead of digging through repositories.' },
  { title: 'Analytics & monitoring', icon: BarChart3, description: 'Track lifecycle movement, editorial load, PR activity, and standards composition through dashboards and timelines.' },
  { title: 'Workflow tooling', icon: Wrench, description: 'Boards, dependency maps, builders, and explorers to move from reading governance to working with it.' },
  { title: 'Context & commentary', icon: FileText, description: 'Raw data paired with commentary, docs, videos, and news, so the platform works for learning and operations alike.' },
];

const contactLinks = [
  { label: 'GitHub', href: 'https://github.com/AvarchLLC/eipsinsight-v4', icon: Github },
  { label: 'Discord', href: 'https://discord.com/invite/tUXgfV822C', icon: MessageCircle },
  { label: 'Donate', href: '/donate', icon: Heart, internal: true },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section>
          <div className="mb-3 inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            About us
          </div>
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            We make Ethereum standards and governance easy to follow.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            EIPsInsight is an operational view of EIPs, ERCs, RIPs, proposal workflows, and network upgrades, built so
            editors, builders, researchers, and newcomers can see what is changing, what is stuck, and why. It is built
            by <span className="text-foreground">Avarch</span>, with support from across the Ethereum ecosystem.
          </p>
        </section>

        {/* Story */}
        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why we built it</p>
          <h2 className="mt-1 dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Governance data is public, but the workflow is hard to see as a system.
          </h2>
          <div className="mt-4 grid gap-4 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
            <p>
              Ethereum governance happens across repositories, pull requests, review queues, forum threads, upgrades, and
              informal coordination. All of it is public, yet answering a simple question, what changed, what is blocked,
              who is active, what depends on what, still takes real institutional memory.
            </p>
            <p>
              We aggregate those moving parts, normalize them into clear product surfaces, and connect the data to
              commentary and context. The goal is not more charts. It is operational clarity for anyone trying to
              understand or participate in Ethereum standards.
            </p>
          </div>
        </section>

        {/* What we do */}
        <section>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">What the platform does</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {whatWeDo.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border bg-card/60 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Team */}
        <section>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">The team</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A compact group working across strategy, operations, engineering, and product.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {team.map((member) => {
              const focus = teamContext[member.name]?.focus;
              const avatar = member.avatar ?? teamAvatarMap[member.name];
              const initials = member.name.split(' ').map((name) => name[0]).join('');

              return (
                <article key={member.name} className="flex items-start gap-4 rounded-xl border border-border bg-card/60 p-5 transition-colors hover:border-primary/40">
                  {avatar ? (
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                      <Image src={avatar} alt={member.name} width={56} height={56} className="h-14 w-14 object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary/10 text-base font-semibold text-primary">
                      {initials}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm font-medium text-primary">{member.role}</p>
                    {focus && <p className="mt-0.5 text-xs text-muted-foreground">{focus}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {member.github && (
                        <a href={`https://github.com/${member.github}`} target="_blank" rel="noreferrer" aria-label={`${member.name} on GitHub`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                          <Github className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {member.twitter && (
                        <a href={`https://x.com/${member.twitter}`} target="_blank" rel="noreferrer" aria-label={`${member.name} on X`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                          <Twitter className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <a href={member.linkedin ?? 'https://www.linkedin.com/company/avarch'} target="_blank" rel="noreferrer" aria-label={`${member.name} on LinkedIn`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary">
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Support & Partners */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-6">
            <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground">Support</h2>
            <p className="mt-1 text-sm text-muted-foreground">Backed by grants and community support across the ecosystem.</p>
            <div className="mt-4 space-y-3">
              {grants.map((grant) => (
                <article key={grant.id} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{grant.title}</h3>
                    <span className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-wider ${badgeColors[grant.badge]}`}>
                      {grant.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{grant.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-6">
            <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground">Partners</h2>
            <p className="mt-1 text-sm text-muted-foreground">Working alongside ecosystem operators and media.</p>
            <div className="mt-4 space-y-3">
              {partners.map((partner) => (
                <a key={partner.name} href={partner.website} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-lg border border-border bg-muted/20 p-4 transition-all hover:border-primary/40 hover:bg-card/80">
                  {partnerLogos[partner.name] ? (
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                      <Image src={partnerLogos[partner.name]} alt={partner.name} width={72} height={32} className="h-7 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-sm font-semibold text-foreground">
                      {partner.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{partner.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {partner.name === 'EtherWorld'
                        ? 'Media and ecosystem amplification for standards coverage.'
                        : 'Coordination and operational support around standards.'}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Get involved / contact */}
        <section className="rounded-xl border border-border bg-card/60 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Get in touch</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                EIPsInsight is a community resource. Use it, critique it, contribute to it, or support the infrastructure
                behind it. For collaboration or feedback, email{' '}
                <a href="mailto:dev@avarch.org" className="font-medium text-primary hover:underline">dev@avarch.org</a>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {contactLinks.map((item) => {
                  const Icon = item.icon;
                  const classes = 'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary';
                  return item.internal ? (
                    <Link key={item.label} href={item.href} className={classes}><Icon className="h-4 w-4" />{item.label}</Link>
                  ) : (
                    <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={classes}><Icon className="h-4 w-4" />{item.label}</a>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/privacy" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
                  Privacy Policy <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/terms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
                  Terms of Service <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
