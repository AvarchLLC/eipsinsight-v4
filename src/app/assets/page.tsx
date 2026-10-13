'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Download, X } from 'lucide-react';
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

const V2 = '/brand/logov2/';
const assetHref = (file: string) => V2 + encodeURIComponent(file);
const MARK_BLACK = 'eipsinsight_logo_hero[black].png';

type Variant = {
  id: string;
  name: string;
  desc: string;
  black: string;
  white: string | null;
  wide: boolean;
};

const LOGO_VARIANTS: Variant[] = [
  {
    id: 'stacked',
    name: 'Primary lockup',
    desc: 'Mark stacked above the wordmark. The default — reach for it wherever the space is roughly square.',
    black: 'eipsinsight_logo_combined[black].png',
    white: 'eipsinsight_logo_combined[white].png',
    wide: false,
  },
  {
    id: 'landscape',
    name: 'Horizontal lockup',
    desc: 'Mark beside the wordmark. For wide spaces — site headers, banners, email signatures.',
    black: 'eipsinsight_logo_landscape[black].png',
    white: 'eipsinsight_logo_landscape[white].png',
    wide: true,
  },
  {
    id: 'mark',
    name: 'Icon / mark',
    desc: 'The rising-chart mark on its own. Avatars, favicons, app icons, social profile pictures.',
    black: 'eipsinsight_logo_hero[black].png',
    white: 'eipsinsight_logo_hero[white].png',
    wide: false,
  },
  {
    id: 'wordmark',
    name: 'Wordmark',
    desc: 'The EIPsInsight name alone, set in Libre Baskerville — the same face as the site navbar.',
    black: 'eipsinsight_logo_font[black].png',
    white: null,
    wide: true,
  },
];

function DownloadPill({ file, label }: { file: string; label: string }) {
  return (
    <a
      href={assetHref(file)}
      download={file}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
    >
      <Download className="h-3 w-3" />
      {label}
    </a>
  );
}

/** A preview panel showing a logo on a light or dark surface. */
function LogoPreview({ file, wide, dark, label }: { file: string; wide: boolean; dark: boolean; label?: string }) {
  return (
    <div className={cn('relative flex h-40 items-center justify-center p-8', dark ? 'bg-zinc-950' : 'bg-white')}>
      <div className={cn('relative', wide ? 'h-12 w-full max-w-[240px]' : 'h-24 w-24')}>
        <Image src={assetHref(file)} alt={label ?? file} fill className="object-contain" sizes={wide ? '240px' : '96px'} />
      </div>
    </div>
  );
}

function VariantCard({ v }: { v: Variant }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 transition-colors hover:border-primary/40">
      <div className="grid grid-cols-2 divide-x divide-border">
        <LogoPreview file={v.black} wide={v.wide} dark={false} label={`${v.name} (black)`} />
        {v.white ? (
          <LogoPreview file={v.white} wide={v.wide} dark label={`${v.name} (white)`} />
        ) : (
          <div className="flex h-40 items-center justify-center bg-zinc-950 px-4 text-center">
            <span className="dec-title text-2xl font-semibold text-white">EIPsInsight</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{v.name}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{v.desc}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <DownloadPill file={v.black} label="PNG black" />
          {v.white && <DownloadPill file={v.white} label="PNG white" />}
        </div>
      </div>
    </div>
  );
}

/** Hero showcase of the primary lockup with a light/dark preview toggle. */
function LogoHero() {
  const [dark, setDark] = useState(true);
  const file = dark ? 'eipsinsight_logo_combined[white].png' : 'eipsinsight_logo_combined[black].png';
  const tab = (active: boolean) =>
    cn('px-3 py-1 text-[11px] font-semibold transition-colors', active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:text-foreground');
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
      <div className={cn('relative flex h-64 items-center justify-center transition-colors', dark ? 'bg-zinc-950' : 'bg-white')}>
        <div className="relative h-40 w-40">
          <Image src={assetHref(file)} alt="EIPsInsight logo" fill className="object-contain" sizes="160px" priority />
        </div>
        <div className="absolute right-4 top-4 flex overflow-hidden rounded-lg border border-border bg-card/80 backdrop-blur">
          <button type="button" onClick={() => setDark(false)} className={tab(!dark)}>Light</button>
          <button type="button" onClick={() => setDark(true)} className={tab(dark)}>Dark</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Primary lockup</p>
          <p className="text-[11px] text-muted-foreground">The full EIPsInsight logo. Grab the variant that matches your background.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <DownloadPill file="eipsinsight_logo_combined[black].png" label="PNG black" />
          <DownloadPill file="eipsinsight_logo_combined[white].png" label="PNG white" />
        </div>
      </div>
    </div>
  );
}

type Dont = { label: string; imgClass?: string; wrapStyle?: React.CSSProperties; imgStyle?: React.CSSProperties };
const DONTS: Dont[] = [
  { label: "Don't recolor", imgStyle: { filter: 'sepia(1) saturate(6) hue-rotate(320deg)' } },
  { label: "Don't rotate", imgClass: 'rotate-12' },
  { label: "Don't stretch", wrapStyle: { transform: 'scaleX(1.7)' } },
  { label: "Don't add shadows", imgStyle: { filter: 'drop-shadow(3px 5px 4px rgba(0,0,0,0.55))' } },
];

function DontTile({ label, imgClass, wrapStyle, imgStyle }: Dont) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="relative flex h-24 items-center justify-center overflow-hidden bg-white">
        <div className="relative h-14 w-14" style={wrapStyle}>
          <Image src={assetHref(MARK_BLACK)} alt="" fill className={cn('object-contain', imgClass)} style={imgStyle} sizes="56px" />
        </div>
        <span className="absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
          <X className="h-3 w-3" />
        </span>
      </div>
      <p className="border-t border-border bg-card/60 px-2 py-1.5 text-center text-[10px] font-medium text-muted-foreground">{label}</p>
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
        <p className="mt-2 w-full text-sm leading-relaxed text-muted-foreground sm:text-base">
          Official logos, color system, typography, and component tokens. All assets are free to use with attribution to{' '}
          <span className="font-medium text-foreground">EIPsInsight</span>.
        </p>
      </header>

      {/* ── Logos ── */}
      <section>
        <SectionHead
          label="01 - Identity"
          title="Logo & Wordmark"
          description="The EIPsInsight logo is a rising-chart mark paired with the wordmark set in Libre Baskerville. Use the black variant on light backgrounds and the white variant on dark ones."
        />

        <LogoHero />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {LOGO_VARIANTS.map((v) => (
            <VariantCard key={v.id} v={v} />
          ))}
        </div>

        {/* Vector & source files */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Vector &amp; source files. </span>
            Scalable and print-ready — use these for large formats, merch, or editing in design tools.
          </div>
          <div className="flex flex-wrap gap-1.5">
            <DownloadPill file="eipsinsight_svg.svg" label="SVG" />
            <DownloadPill file="eipsinsight logo pdf.pdf" label="PDF" />
            <DownloadPill file="eipsinsight logo.ai" label="AI" />
          </div>
        </div>

        {/* Clear space + Do / Don't */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Clear space &amp; sizing</p>
            <div className="flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-white p-5">
                <div className="relative h-full w-full">
                  <Image src={assetHref(MARK_BLACK)} alt="Clear space" fill className="object-contain" sizes="80px" />
                </div>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <li>Keep clear space of at least the mark&apos;s height on every side.</li>
                <li>Minimum size: <span className="font-medium text-foreground">24px</span> for the mark, <span className="font-medium text-foreground">120px</span> wide for the lockups.</li>
                <li>Never crowd the logo with text, other marks, or busy imagery.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Please don&apos;t</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {DONTS.map((d) => (
                <DontTile key={d.label} {...d} />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Don&apos;t recolor, rotate, stretch, or add effects. Keep the logo in its original black or white.
            </p>
          </div>
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

      {/* ── Typography ── */}
      <section>
        <SectionHead
          label="04 - Typography"
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
          label="05 - Effects"
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
          label="06 - Layout"
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
