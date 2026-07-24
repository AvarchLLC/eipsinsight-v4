'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────── helpers ─────────────────────────── */

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return { copied, copy };
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      onClick={copy}
      title="Copy"
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-muted/60 text-muted-foreground transition hover:border-primary/40 hover:text-foreground',
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function SectionHead({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/* ─────────────────────────── logos ─────────────────────────── */

const LOGOS = [
  {
    name: 'Wordmark - Light',
    file: '[LEFT] Logo + EIPsInsight [Black].png',
    bg: 'bg-white',
    hint: 'Use on light backgrounds',
    animated: false,
  },
  {
    name: 'Wordmark - Dark',
    file: '[LEFT] Logo + EIPsInsight [White].png',
    bg: 'bg-zinc-950',
    hint: 'Use on dark backgrounds',
    animated: false,
  },
  {
    name: 'Icon - Light',
    file: 'Circle logo [Black].png',
    bg: 'bg-white',
    hint: 'Square / avatar contexts',
    animated: false,
  },
  {
    name: 'Icon - Dark',
    file: 'Circle logo [White].png',
    bg: 'bg-zinc-950',
    hint: 'Square / avatar contexts',
    animated: false,
  },
  {
    name: 'Animated (Light)',
    file: 'EIPsInsightsDark.gif',
    bg: 'bg-white',
    hint: 'Loading states, splash screens',
    animated: true,
  },
  {
    name: 'Animated (Dark)',
    file: 'EIPsInsights.gif',
    bg: 'bg-zinc-950',
    hint: 'Loading states, splash screens',
    animated: true,
  },
  {
    name: 'Favicon',
    file: 'eipFavicon.png',
    bg: 'bg-card',
    hint: 'Browser tab, app icon',
    animated: false,
  },
];

function LogoCard({ name, file, bg, hint, animated }: typeof LOGOS[0]) {
  const encoded = encodeURIComponent(file);
  const src = `/brand/logo/${encoded}`;
  const isWide = name.startsWith('Wordmark');

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 hover:border-primary/40 transition-colors">
      <div className={cn('flex items-center justify-center p-8', bg, isWide ? 'h-36' : 'h-36')}>
        <div className={cn('relative', isWide ? 'h-10 w-52' : 'h-16 w-16')}>
          <Image
            src={src}
            alt={name}
            fill
            unoptimized={animated}
            className="object-contain"
            sizes={isWide ? '208px' : '64px'}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{name}</p>
          <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
        </div>
        <a
          href={src}
          download={file}
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Download className="h-3 w-3" />
          PNG
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────── colors ─────────────────────────── */

const SEMANTIC_COLORS = [
  { name: 'Background', cssVar: '--background', tailwind: 'bg-background', desc: 'Page background' },
  { name: 'Foreground', cssVar: '--foreground', tailwind: 'text-foreground', desc: 'Primary text' },
  { name: 'Card', cssVar: '--card', tailwind: 'bg-card', desc: 'Elevated card surface' },
  { name: 'Muted', cssVar: '--muted', tailwind: 'bg-muted', desc: 'Chips, subtle containers' },
  { name: 'Muted Foreground', cssVar: '--muted-foreground', tailwind: 'text-muted-foreground', desc: 'Secondary labels' },
  { name: 'Border', cssVar: '--border', tailwind: 'border-border', desc: 'Dividers, control borders' },
  { name: 'Primary', cssVar: '--primary', tailwind: 'bg-primary', desc: 'Persona-driven brand accent' },
  { name: 'Primary Foreground', cssVar: '--primary-foreground', tailwind: 'text-primary-foreground', desc: 'Text on primary bg' },
  { name: 'Destructive', cssVar: '--destructive', tailwind: 'bg-destructive', desc: 'Errors, delete actions' },
  { name: 'Input', cssVar: '--input', tailwind: 'border-input', desc: 'Form input borders' },
];

const STATUS_COLORS: { name: string; light: string; dark: string; bg: string; desc: string }[] = [
  { name: 'Draft', light: '#64748b', dark: '#94a3b8', bg: 'bg-slate-500/20', desc: 'Under development' },
  { name: 'Review', light: '#d97706', dark: '#f59e0b', bg: 'bg-amber-500/20', desc: 'Open for community review' },
  { name: 'Last Call', light: '#ea580c', dark: '#f97316', bg: 'bg-orange-500/20', desc: 'Final review window' },
  { name: 'Final', light: '#059669', dark: '#10b981', bg: 'bg-emerald-500/20', desc: 'Accepted standard' },
  { name: 'Living', light: '#0891b2', dark: '#22d3ee', bg: 'bg-cyan-500/20', desc: 'Continuously updated' },
  { name: 'Stagnant', light: '#6b7280', dark: '#9ca3af', bg: 'bg-gray-500/20', desc: 'No activity for 6 months' },
  { name: 'Withdrawn', light: '#dc2626', dark: '#ef4444', bg: 'bg-red-500/20', desc: 'Withdrawn by author' },
];

const PERSONA_COLORS = [
  { name: 'Developer', primary: '#10b981', primaryDark: '#34d399', bg: 'bg-emerald-500/10', ring: '#10b981', desc: 'EIP developers and protocol engineers' },
  { name: 'Editor', primary: '#3b82f6', primaryDark: '#60a5fa', bg: 'bg-blue-500/10', ring: '#3b82f6', desc: 'EIP editors and reviewers' },
  { name: 'Researcher', primary: '#a78bfa', primaryDark: '#a78bfa', bg: 'bg-purple-500/10', ring: '#a78bfa', desc: 'Protocol researchers' },
  { name: 'Builder', primary: '#fb923c', primaryDark: '#fdba74', bg: 'bg-orange-500/10', ring: '#fb923c', desc: 'dApp and tooling builders' },
  { name: 'Enterprise', primary: '#8b5cf6', primaryDark: '#a78bfa', bg: 'bg-violet-500/10', ring: '#8b5cf6', desc: 'Enterprise & institutional users' },
  { name: 'Newcomer', primary: '#a78bfa', primaryDark: '#c4b5fd', bg: 'bg-purple-500/10', ring: '#a78bfa', desc: 'First-time EIP explorers' },
];

function SemanticSwatch({ name, cssVar, tailwind, desc }: typeof SEMANTIC_COLORS[0]) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3">
      <div
        className="h-10 w-10 shrink-0 rounded-md border border-border"
        style={{ background: `var(${cssVar})` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">{name}</span>
          <CopyBtn text={`var(${cssVar})`} />
        </div>
        <code className="text-[10px] text-muted-foreground">{cssVar}</code>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tailwind}</code>
        <CopyBtn text={tailwind} />
      </div>
    </div>
  );
}

function StatusBadge({ name, light, dark, bg, desc }: typeof STATUS_COLORS[0]) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3">
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', bg)}>
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: `light-dark(${light}, ${dark})` }}
        />
        {name}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 rounded-full border border-border" style={{ background: light }} title="Light" />
        <div className="h-4 w-4 rounded-full border border-border bg-zinc-900" style={{ background: dark }} title="Dark" />
        <CopyBtn text={light} />
      </div>
    </div>
  );
}

function PersonaCard({ name, primary, primaryDark, bg, desc }: typeof PERSONA_COLORS[0]) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn('flex h-10 w-10 items-center justify-center rounded-lg', bg)}
          style={{ boxShadow: `0 0 0 1px ${primary}40` }}
        >
          <div className="h-3 w-3 rounded-full" style={{ background: `light-dark(${primary}, ${primaryDark})` }} />
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] text-muted-foreground">Light</span>
          <div className="h-4 w-4 rounded border border-border" style={{ background: primary }} />
          <span className="text-[10px] text-muted-foreground">Dark</span>
          <div className="h-4 w-4 rounded border border-border" style={{ background: primaryDark }} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 rounded bg-muted/60 px-2 py-1">
          <code className="truncate text-[10px] text-muted-foreground">{primary}</code>
          <CopyBtn text={primary} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── typography ─────────────────────────── */

const TYPE_SCALE = [
  { label: 'H1 - Page title', className: 'dec-title text-3xl font-semibold', size: '30px', sample: 'Ethereum Improvement Proposals' },
  { label: 'H2 - Section', className: 'dec-title text-2xl font-semibold', size: '24px', sample: 'Protocol Upgrades' },
  { label: 'H3 - Card', className: 'text-xl font-semibold', size: '20px', sample: 'EIP-4844 Blob Transactions' },
  { label: 'Body Large', className: 'text-base', size: '16px', sample: 'Track EIP status, contributor activity, and editorial governance.' },
  { label: 'Body', className: 'text-sm', size: '14px', sample: 'All proposals follow the EIP process from draft to final.' },
  { label: 'Small / Label', className: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground', size: '12px', sample: 'Last updated · 3 days ago' },
  { label: 'Micro', className: 'text-[10px]', size: '10px', sample: 'EIP-1 · Standards Track · Core' },
];

/* ─────────────────────────── gradients ─────────────────────────── */

const GRADIENTS = [
  {
    name: 'persona-gradient',
    desc: 'Primary CTA buttons. Uses persona accent colors.',
    class: 'persona-gradient',
    usage: 'className="persona-gradient rounded-md px-4 py-2 text-sm font-semibold text-black"',
  },
  {
    name: 'persona-gradient-soft',
    desc: 'Subtle surface tints - left panels, hero backgrounds.',
    class: 'persona-gradient-soft',
    usage: 'className="persona-gradient-soft rounded-xl p-6"',
  },
  {
    name: 'persona-glow',
    desc: 'Accent glow on interactive cards.',
    class: 'persona-glow',
    usage: 'className="persona-glow rounded-xl border border-border"',
  },
  {
    name: 'Brand Gradient (static)',
    desc: 'Fixed emerald→cyan. Use when persona is irrelevant.',
    class: 'from-emerald-500 to-cyan-500',
    usage: 'className="bg-gradient-to-r from-emerald-500 to-cyan-500"',
    static: true,
  },
];

/* ─────────────────────────── page ─────────────────────────── */

export default function AssetsPage() {
  return (
    <div className="page-shell space-y-20 pb-20">

      {/* Header */}
      <header className="mb-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Brand</p>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          Brand Assets
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Official logos, color system, typography, and component tokens. All assets are free to use with attribution to{' '}
          <span className="font-medium text-foreground">EIPsInsight</span>.
        </p>
      </header>

      {/* ── Logos ── */}
      <section>
        <SectionHead
          label="01 - Identity"
          title="Logo & Wordmark"
          description="Use the black variant on light backgrounds and the white variant on dark backgrounds. Never alter the logo proportions or colors."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {LOGOS.map((logo) => (
            <LogoCard key={logo.name} {...logo} />
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Usage rules: </span>
          Maintain clear space equal to the icon height on all sides. Do not rotate, stretch, recolor, or add effects to the logo.
        </div>
      </section>

      {/* ── Semantic Colors ── */}
      <section>
        <SectionHead
          label="02 - Colors"
          title="Semantic Palette"
          description="Use CSS variables only - never hardcode hex values in components. These tokens adapt automatically to light and dark mode."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {SEMANTIC_COLORS.map((c) => (
            <SemanticSwatch key={c.cssVar} {...c} />
          ))}
        </div>
      </section>

      {/* ── Status Colors ── */}
      <section>
        <SectionHead
          label="03 - Status"
          title="EIP Status Colors"
          description="Applied to proposal lifecycle badges. The left swatch is light-mode hex, the right is dark-mode hex."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {STATUS_COLORS.map((s) => (
            <StatusBadge key={s.name} {...s} />
          ))}
        </div>
      </section>

      {/* ── Persona Colors ── */}
      <section>
        <SectionHead
          label="04 - Personas"
          title="Persona Color System"
          description="Six personas drive the app's accent system at runtime. The --persona-primary CSS variable switches automatically. Never hardcode persona colors in shared components - use text-primary and bg-primary/10 instead."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONA_COLORS.map((p) => (
            <PersonaCard key={p.name} {...p} />
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">How it works: </span>
          <code className="rounded bg-muted px-1">PersonaProvider</code> sets{' '}
          <code className="rounded bg-muted px-1">data-persona</code> on{' '}
          <code className="rounded bg-muted px-1">&lt;html&gt;</code> and{' '}
          <code className="rounded bg-muted px-1">globals.css</code> maps each value to{' '}
          <code className="rounded bg-muted px-1">--persona-primary</code>,{' '}
          <code className="rounded bg-muted px-1">--persona-accent</code>, and{' '}
          <code className="rounded bg-muted px-1">--persona-ring</code>. These feed into{' '}
          <code className="rounded bg-muted px-1">--primary</code> and{' '}
          <code className="rounded bg-muted px-1">--ring</code>.
        </div>
      </section>

      {/* ── Typography ── */}
      <section>
        <SectionHead
          label="05 - Typography"
          title="Type Scale"
          description="Two font families: Inter for UI and body copy, Libre Baskerville for decorative headings (.dec-title)."
        />

        {/* Font families */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Primary - Inter</p>
            <p className="mt-3 font-sans text-2xl font-semibold text-foreground">Aa Bb Cc 0–9</p>
            <p className="mt-2 font-sans text-sm text-muted-foreground">Used for all UI text, navigation, body copy, and labels.</p>
            <code className="mt-3 block text-[10px] text-muted-foreground">--font-inter · var(--font-sans)</code>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Decorative - Libre Baskerville</p>
            <p className="dec-title mt-3 text-2xl font-semibold text-foreground">Aa Bb Cc 0–9</p>
            <p className="mt-2 text-sm text-muted-foreground font-sans">Used for page titles, section headings. Add <code className="rounded bg-muted px-1 text-[10px]">.dec-title</code> class.</p>
            <code className="mt-3 block text-[10px] text-muted-foreground">--font-libre-baskerville · var(--font-mono)</code>
          </div>
        </div>

        {/* Scale */}
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {TYPE_SCALE.map(({ label, className, size, sample }) => (
            <div key={label} className="flex flex-col gap-1 bg-card/60 px-4 py-4 sm:flex-row sm:items-baseline sm:gap-6">
              <div className="flex w-48 shrink-0 items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
              <div className="flex flex-1 items-baseline gap-3">
                <span className={cn('text-foreground', className)}>{sample}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{size}</code>
                <CopyBtn text={className} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gradients ── */}
      <section>
        <SectionHead
          label="06 - Effects"
          title="Gradients & Effects"
          description="Persona-aware utility classes for CTAs, backgrounds, and focus glows. These update automatically when the persona changes."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {GRADIENTS.map(({ name, desc, class: cls, usage, static: isStatic }) => (
            <div key={name} className="overflow-hidden rounded-xl border border-border bg-card/60">
              <div
                className={cn(
                  'flex h-20 items-center justify-center',
                  isStatic ? `bg-gradient-to-r ${cls}` : cls,
                )}
              >
                <span className="rounded-md bg-black/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  Preview
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-semibold text-foreground">.{name}</code>
                  <CopyBtn text={isStatic ? `bg-gradient-to-r ${cls}` : cls} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 p-2.5">
                  <code className="flex-1 break-all text-[10px] leading-relaxed text-muted-foreground">{usage}</code>
                  <CopyBtn text={usage} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Spacing & Tokens ── */}
      <section>
        <SectionHead
          label="07 - Layout"
          title="Spacing & Layout Tokens"
          description="Shared layout primitives. Use these rather than raw Tailwind values to keep spacing consistent across pages."
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { token: 'page-shell', desc: 'Standard page container - max-width, padding, and top spacing. Apply to the root div of every page.' },
            { token: 'h-14 (56px)', desc: 'Navbar and sidebar header height. Use min-h-[calc(100vh-56px)] for full-viewport content.' },
            { token: 'rounded-xl border border-border bg-card/60', desc: 'Standard card surface. Add hover:border-primary/40 for interactive cards.' },
            { token: 'rounded-xl border border-border bg-card/60 hover:border-primary/40', desc: 'Interactive card - adds primary border on hover.' },
            { token: 'h-9 rounded-md', desc: 'Standard button / input height.' },
            { token: 'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground', desc: 'Section eye-brow label above a heading.' },
          ].map(({ token, desc }) => (
            <div key={token} className="flex flex-col gap-2 rounded-lg border border-border bg-card/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <code className="text-[10px] leading-relaxed text-foreground">{token}</code>
                <CopyBtn text={token} />
              </div>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
