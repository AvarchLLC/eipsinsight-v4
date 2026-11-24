'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, Copy, Download, X, ArrowDown, ExternalLink, ShieldCheck, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────── helpers ─────────────────────────── */

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return { copied, copy };
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-muted)] transition-colors hover:border-emerald-500/40 hover:text-[var(--ink)] cursor-pointer',
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function SectionHead({
  number,
  label,
  title,
  description,
}: {
  number: string;
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 border-b border-[var(--border)] pb-4">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {number}
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-faint)]">
          {label}
        </span>
      </div>
      <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[var(--ink)] sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
          {description}
        </p>
      )}
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
    name: 'Primary Lockup (Stacked)',
    desc: 'The rising-chart mark stacked above the wordmark. Reach for this wherever the layout space is square or vertical.',
    black: 'eipsinsight_logo_combined[black].png',
    white: 'eipsinsight_logo_combined[white].png',
    wide: false,
  },
  {
    id: 'landscape',
    name: 'Horizontal Lockup (Landscape)',
    desc: 'The mark positioned beside the wordmark. Perfect for site headers, hero banners, docs, and wide media embeds.',
    black: 'eipsinsight_logo_landscape[black].png',
    white: 'eipsinsight_logo_landscape[white].png',
    wide: true,
  },
  {
    id: 'mark',
    name: 'Symbol / Mark (Standalone)',
    desc: 'The rising-chart mark on its own. For avatars, browser favicons, mobile icons, and compact social badges.',
    black: 'eipsinsight_logo_hero[black].png',
    white: 'eipsinsight_logo_hero[white].png',
    wide: false,
  },
  {
    id: 'wordmark',
    name: 'Editorial Wordmark',
    desc: 'The EIPsInsight name set in editorial serif typography. For formal citations, covers, and typography lockups.',
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
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[11px] font-mono font-medium text-[var(--ink)] transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
    >
      <Download className="h-3 w-3" />
      {label}
    </a>
  );
}

function LogoPreview({
  file,
  wide,
  dark,
  label,
}: {
  file: string;
  wide: boolean;
  dark: boolean;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-44 items-center justify-center p-8 transition-colors',
        dark ? 'bg-[#0c0f0e]' : 'bg-[#f7f9f8]',
      )}
    >
      <div className={cn('relative', wide ? 'h-14 w-full max-w-[260px]' : 'h-24 w-24')}>
        <Image
          src={assetHref(file)}
          alt={label ?? file}
          fill
          className="object-contain"
          sizes={wide ? '260px' : '96px'}
          unoptimized
        />
      </div>
      <span className="absolute right-2.5 top-2.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)]">
        {dark ? 'Dark Canvas' : 'Light Canvas'}
      </span>
    </div>
  );
}

function VariantCard({ v }: { v: Variant }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]">
      <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
        <LogoPreview file={v.black} wide={v.wide} dark={false} label={`${v.name} (black)`} />
        {v.white ? (
          <LogoPreview file={v.white} wide={v.wide} dark label={`${v.name} (white)`} />
        ) : (
          <div className="flex h-44 items-center justify-center bg-[#0c0f0e] px-4 text-center">
            <span className="font-serif text-2xl font-semibold text-white tracking-tight">
              EIPsInsight
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{v.name}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{v.desc}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <DownloadPill file={v.black} label="PNG Black" />
          {v.white && <DownloadPill file={v.white} label="PNG White" />}
        </div>
      </div>
    </div>
  );
}

/** Hero showcase of the primary lockup with an interactive light/dark canvas switcher. */
function LogoHero() {
  const [dark, setDark] = useState(true);
  const file = dark
    ? 'eipsinsight_logo_combined[white].png'
    : 'eipsinsight_logo_combined[black].png';

  const tab = (active: boolean) =>
    cn(
      'px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer',
      active
        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]',
    );

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)]">
      <div
        className={cn(
          'relative flex h-72 items-center justify-center transition-colors',
          dark ? 'bg-[#0c0f0e]' : 'bg-[#f7f9f8]',
        )}
      >
        <div className="relative h-44 w-44">
          <Image
            src={assetHref(file)}
            alt="EIPsInsight Primary Logo"
            fill
            className="object-contain"
            sizes="176px"
            priority
            unoptimized
          />
        </div>
        <div className="absolute right-4 top-4 flex overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)]">
          <button type="button" onClick={() => setDark(false)} className={tab(!dark)}>
            Light Canvas
          </button>
          <button type="button" onClick={() => setDark(true)} className={tab(dark)}>
            Dark Canvas
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[var(--ink)]">Primary Brand Lockup</span>
            <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Default Mark
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            High-resolution raster lockup for presentations, documents, and press kits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadPill file="eipsinsight_logo_combined[black].png" label="PNG Black (Transparent)" />
          <DownloadPill file="eipsinsight_logo_combined[white].png" label="PNG White (Transparent)" />
          <DownloadPill file="eipsinsight_svg.svg" label="Vector SVG" />
        </div>
      </div>
    </div>
  );
}

type Dont = {
  label: string;
  imgClass?: string;
  wrapStyle?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
};

const DONTS: Dont[] = [
  { label: "Don't recolor the mark", imgStyle: { filter: 'sepia(1) saturate(7) hue-rotate(310deg)' } },
  { label: "Don't rotate or skew", imgClass: 'rotate-12' },
  { label: "Don't distort or stretch", wrapStyle: { transform: 'scaleX(1.65)' } },
  { label: "Don't add shadows/glows", imgStyle: { filter: 'drop-shadow(4px 6px 5px rgba(0,0,0,0.6))' } },
];

function DontTile({ label, imgClass, wrapStyle, imgStyle }: Dont) {
  return (
    <div className="overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)]">
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-white">
        <div className="relative h-14 w-14" style={wrapStyle}>
          <Image
            src={assetHref(MARK_BLACK)}
            alt=""
            fill
            className={cn('object-contain', imgClass)}
            style={imgStyle}
            sizes="56px"
            unoptimized
          />
        </div>
        <span className="absolute left-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-xs">
          <X className="h-3 w-3 stroke-[3]" />
        </span>
      </div>
      <p className="border-t border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-center font-mono text-[11px] font-medium text-[var(--ink-muted)]">
        {label}
      </p>
    </div>
  );
}

/* ─────────────────────────── typography ─────────────────────────── */

const TYPE_ROLES = [
  {
    role: 'Editorial Serif',
    name: 'Advercase / Fraunces',
    variable: '--font-advercase / --font-fraunces',
    utility: 'font-serif / .t-h1 / .t-h2 / .t-figure',
    description: 'Reserved for mastheads, page titles, section headers, big figures, and the logo wordmark. Imparts archival authority.',
    sampleText: 'Ethereum Improvement Proposals',
    sampleClass: 'font-serif text-2xl font-semibold',
  },
  {
    role: 'Interface & Prose',
    name: 'Geist Sans',
    variable: '--font-geist / var(--font-sans)',
    utility: 'font-sans / body',
    description: 'Used for body copy, interface controls, navigation items, status tables, and descriptive labels.',
    sampleText: 'Verifiable governance and real-time observability across all protocol standards.',
    sampleClass: 'font-sans text-base',
  },
  {
    role: 'Code & Citations',
    name: 'Geist Mono',
    variable: '--font-geist-mono / var(--font-mono)',
    utility: 'font-mono / .eyebrow',
    description: 'Used for proposal identifiers (EIP-4844), commit SHAs, dates, status counts, eyebrows, and tabular data.',
    sampleText: 'EIP-4844 · #12707 · Final · 0x71C...3a9 · Nov 2026',
    sampleClass: 'font-mono text-sm tracking-tight',
  },
];

const TYPE_SCALE = [
  {
    label: 'Display / Hero',
    className: '.t-display / font-serif',
    sample: 'Ethereum Standards',
    size: 'clamp(2.7rem, 6.4vw, 5.2rem)',
  },
  {
    label: 'H1 - Page Masthead',
    className: '.t-h1 / font-serif',
    sample: 'Governance Ledger & Index',
    size: 'clamp(2.1rem, 4.4vw, 3.3rem)',
  },
  {
    label: 'H2 - Section Title',
    className: '.t-h2 / font-serif',
    sample: 'Protocol Upgrades & Devnets',
    size: 'clamp(1.65rem, 2.8vw, 2.2rem)',
  },
  {
    label: 'H3 - Card Title',
    className: '.t-h3 / font-semibold',
    sample: 'EIP-7702 Set Code for EOA',
    size: '1.25rem (20px)',
  },
  {
    label: 'Body / Lead',
    className: '.t-lead / font-sans',
    sample: 'Track proposals across core execution, consensus, and networking.',
    size: '1.15rem (18px)',
  },
  {
    label: 'Eyebrow / Label',
    className: '.eyebrow / font-mono uppercase',
    sample: '01 / IDENTITY & MARK',
    size: '0.68rem (11px) · 0.12em track',
  },
];

/* ─────────────────────────── colors ─────────────────────────── */

const CORE_SURFACES = [
  { name: 'Canvas Paper', cssVar: '--paper', tailwind: 'bg-[var(--paper)]', desc: 'Base page canvas background' },
  { name: 'Card Surface', cssVar: '--surface', tailwind: 'bg-[var(--surface)]', desc: 'Ruled card plates, mastheads, inputs' },
  { name: 'Sunken / Hover', cssVar: '--surface-2', tailwind: 'bg-[var(--surface-2)]', desc: 'Hover states, code wells, sunken regions' },
  { name: 'Pressed Surface', cssVar: '--surface-3', tailwind: 'bg-[var(--surface-3)]', desc: 'Active tabs, selected pressed wells' },
  { name: 'Ink / Text', cssVar: '--ink', tailwind: 'text-[var(--ink)]', desc: 'Primary titles, body copy, strong ink rules' },
  { name: 'Ink Muted', cssVar: '--ink-muted', tailwind: 'text-[var(--ink-muted)]', desc: 'Secondary sentences, descriptions' },
  { name: 'Ink Faint', cssVar: '--ink-faint', tailwind: 'text-[var(--ink-faint)]', desc: 'Eyebrows, metadata, timestamps' },
  { name: 'Hairline Border', cssVar: '--border', tailwind: 'border-[var(--border)]', desc: 'Fine hairline dividers, borders' },
  { name: 'Brand Accent', cssVar: '--brand', tailwind: 'text-emerald-500', desc: 'Emerald signal hue (162): marks, live dots' },
  { name: 'Brand Strong', cssVar: '--brand-strong', tailwind: 'text-emerald-600', desc: 'High-contrast text on paper canvas' },
];

const STATUS_TOKENS = [
  { name: 'Draft', color: '#64748b', darkColor: '#94a3b8', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-300', desc: 'Under active author draft' },
  { name: 'Review', color: '#d97706', darkColor: '#f59e0b', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', desc: 'Open for peer & community review' },
  { name: 'Last Call', color: '#ea580c', darkColor: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', desc: 'Final 14-day review window' },
  { name: 'Final', color: '#059669', darkColor: '#10b981', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', desc: 'Accepted Ethereum standard' },
  { name: 'Living', color: '#0891b2', darkColor: '#22d3ee', bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', desc: 'Continually updated specification' },
  { name: 'Stagnant', color: '#6b7280', darkColor: '#9ca3af', bg: 'bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400', desc: 'Inactive for > 6 months' },
  { name: 'Withdrawn', color: '#dc2626', darkColor: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', desc: 'Permanently withdrawn by author' },
];

/* ─────────────────────────── main page ─────────────────────────── */

export default function AssetsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-16">
      {/* ── Page Masthead ── */}
      <header className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                LEDGER SPEC
              </span>
              <span className="font-mono text-xs text-[var(--ink-faint)]">/</span>
              <span className="font-mono text-xs text-[var(--ink-faint)] uppercase tracking-wider">
                Identity & Guidelines
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
              Brand Assets & Design Tokens
            </h1>
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
              Official logos, scalable vector marks, typography standards, and color tokens for{' '}
              <strong className="font-medium text-[var(--ink)]">EIPsInsight</strong>. All assets are
              free to use for community articles, presentations, research papers, and software integrations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={assetHref('eipsinsight_svg.svg')}
              download="eipsinsight_svg.svg"
              className="inline-flex h-9 items-center gap-2 rounded-sm bg-emerald-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Download className="h-3.5 w-3.5" />
              Download Vector Pack (SVG)
            </a>
            <a
              href="#vectors"
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] transition-colors hover:border-[var(--border-strong)]"
            >
              <Layers className="h-3.5 w-3.5" />
              Source Files (.ai, .pdf)
            </a>
          </div>
        </div>
      </header>

      {/* ── Section 01: Logo & Mark ── */}
      <section id="logos">
        <SectionHead
          number="01"
          label="IDENTITY & MARKS"
          title="Logo Lockups & Marks"
          description="The EIPsInsight brand features a rising-chart icon paired with the wordmark set in editorial serif typography. Use the black mark on light surfaces and the white mark on dark surfaces."
        />

        {/* Hero showcase with toggle */}
        <LogoHero />

        {/* 4 variants grid */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {LOGO_VARIANTS.map((v) => (
            <VariantCard key={v.id} v={v} />
          ))}
        </div>

        {/* Vector master files */}
        <div
          id="vectors"
          className="mt-6 flex flex-col justify-between gap-4 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--ink)]">
                Scalable Vector & Master Files
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Print-ready
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Infinite resolution vectors for print, apparel, banners, slide decks, and Figma.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadPill file="eipsinsight_svg.svg" label="Vector SVG (11 KB)" />
            <DownloadPill file="eipsinsight logo pdf.pdf" label="Vector PDF (36 KB)" />
            <DownloadPill file="eipsinsight logo.ai" label="Adobe Illustrator (.ai)" />
          </div>
        </div>

        {/* Clear space & Usage Rules */}
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              Clear Space & Sizing
            </span>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-sm border border-dashed border-emerald-500/50 bg-[#f7f9f8] p-4">
                <div className="relative h-full w-full">
                  <Image
                    src={assetHref(MARK_BLACK)}
                    alt="Clear space spec"
                    fill
                    className="object-contain"
                    sizes="80px"
                    unoptimized
                  />
                </div>
                <span className="absolute -top-2 left-2 bg-emerald-600 px-1 font-mono text-[8px] text-white">
                  1X
                </span>
                <span className="absolute -bottom-2 right-2 bg-emerald-600 px-1 font-mono text-[8px] text-white">
                  1X
                </span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                <li>
                  Maintain clear space of at least <strong className="text-[var(--ink)]">1X (mark height)</strong> around all sides.
                </li>
                <li>
                  Minimum size: <strong className="text-[var(--ink)]">24px</strong> for mark,{' '}
                  <strong className="text-[var(--ink)]">120px</strong> wide for lockups.
                </li>
                <li>Never crowd with overlapping text, heavy shadows, or busy graphics.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5 lg:col-span-7">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              Usage Violations (Please Avoid)
            </span>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DONTS.map((d) => (
                <DontTile key={d.label} {...d} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 02: Typography ── */}
      <section id="typography">
        <SectionHead
          number="02"
          label="TYPOGRAPHY SYSTEM"
          title="Editorial Serif & Monospace"
          description="EIPsInsight pairs an archival editorial serif with Geist Sans and Geist Mono. Titles and big counts read in serif, identifiers and metadata in mono, and body copy in crisp sans-serif."
        />

        {/* Font Family Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {TYPE_ROLES.map((t) => (
            <div
              key={t.name}
              className="flex flex-col justify-between rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t.role}
                </span>
                <h3 className="mt-1 text-base font-semibold text-[var(--ink)]">{t.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                  {t.description}
                </p>
              </div>

              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className={cn('text-[var(--ink)]', t.sampleClass)}>
                  {t.sampleText}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[var(--ink-faint)]">
                  <code>{t.utility}</code>
                  <CopyBtn text={t.variable} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Type scale table */}
        <div className="mt-6 overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--ink-faint)] uppercase tracking-wider">
            Ledger Type Hierarchy
          </div>
          <div className="divide-y divide-[var(--border)]">
            {TYPE_SCALE.map(({ label, className, sample, size }) => (
              <div
                key={label}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="w-48 shrink-0">
                  <span className="font-mono text-xs font-semibold text-[var(--ink)]">{label}</span>
                  <p className="font-mono text-[11px] text-[var(--ink-faint)]">{size}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-[var(--ink)]">{sample}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <code className="rounded-sm bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                    {className}
                  </code>
                  <CopyBtn text={className} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 03: Color Tokens ── */}
      <section id="colors">
        <SectionHead
          number="03"
          label="COLOR ARCHITECTURE"
          title="Ledger Tokens & Status Palette"
          description="Surfaces and rules use neutral OKLCH values with a subtle brand tint (hue 165). Proposal lifecycle states have strict semantic meaning and are never borrowed for pure decoration."
        />

        {/* Ledger Core Tokens */}
        <div>
          <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
            Ledger Canvas & Ink Tokens
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CORE_SURFACES.map((c) => (
              <div
                key={c.cssVar}
                className="flex flex-col justify-between rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--ink)]">{c.name}</span>
                    <CopyBtn text={`var(${c.cssVar})`} />
                  </div>
                  <code className="mt-1 block font-mono text-[10px] text-[var(--ink-faint)]">
                    {c.cssVar}
                  </code>
                  <p className="mt-2 text-[11px] text-[var(--ink-muted)]">{c.desc}</p>
                </div>
                <div
                  className="mt-3 h-8 w-full rounded-xs border border-[var(--border)]"
                  style={{ background: `var(${c.cssVar})` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Status Palette */}
        <div className="mt-10">
          <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
            Ethereum Proposal Status Lifecycle (Semantic)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STATUS_TOKENS.map((s) => (
              <div
                key={s.name}
                className="flex flex-col justify-between rounded-sm border border-[var(--border)] bg-[var(--surface)] p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={cn('inline-flex items-center rounded-xs px-2 py-0.5 font-mono text-xs font-semibold', s.bg, s.text)}>
                      <span
                        className="mr-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </span>
                    <CopyBtn text={s.color} />
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--ink-muted)]">{s.desc}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px] font-mono text-[var(--ink-faint)]">
                  <span>Light: {s.color}</span>
                  <span>Dark: {s.darkColor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 04: Guidelines & Attribution ── */}
      <section id="guidelines" className="border-t border-[var(--border)] pt-12">
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Naming & Spelling
              </span>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]">
                How to refer to EIPsInsight
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                The official name is written as <strong className="text-[var(--ink)]">EIPsInsight</strong> (one word, capital E, I, P, s, and I) or <strong className="text-[var(--ink)]">EIPs Insight</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
                <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                  ✓ EIPsInsight
                </span>
                <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                  ✓ EIPs Insight
                </span>
                <span className="rounded-sm border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-600 dark:text-red-400 line-through">
                  ✕ eip-insight
                </span>
              </div>
            </div>

            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Attribution & Licensing
              </span>
              <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]">
                Citing our data and graphics
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                All data, charts, and governance indexes are public and open under CC0 & MIT. When citing charts or data points in research papers, newsletters, or decks, please include:
              </p>
              <div className="mt-3 flex items-center justify-between rounded-sm border border-[var(--border)] bg-[var(--surface-2)] p-2.5 font-mono text-xs text-[var(--ink)]">
                <code>Source: EIPsInsight (eipsinsight.com)</code>
                <CopyBtn text="Source: EIPsInsight (eipsinsight.com)" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
